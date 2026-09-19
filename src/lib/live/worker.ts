import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, dbError, checkpoint } from "./store";
import { liveReportSchema, type LiveReport } from "@/schemas/live";
import { analyzeIssue } from "@/lib/report/analyze";
import {
  preparePortal,
  sendPortal,
  connectBrowser,
  captureReceipt,
  releaseSession,
  disconnect,
} from "@/lib/submission/browser";
import { isPortalUrl } from "@/lib/submission/portals";
import { ApiError } from "@/lib/api/errors";
async function track(report: LiveReport, token: string) {
  const next = new Date(Date.now() + 86400000).toISOString();
  if (
    report.contact?.portalReplyMode === "anonymous" ||
    !report.receipt?.url ||
    !report.authority_id ||
    !isPortalUrl(report.authority_id, report.receipt.url)
  ) {
    await checkpoint(report.id, token, {
      stage: "submitted",
      tracking_supported: false,
      last_tracked_at: new Date().toISOString(),
      next_run_at: next,
      message:
        "This portal has no verified online tracking link. Check the authority's email or account for updates.",
    });
    return;
  }
  const client = await connectBrowser(
    { ...report, stage: "queued_prepare", session_id: null },
    async (session_id) => { await checkpoint(report.id, token, { session_id }); },
  );
  let needsLogin = false;
  try {
    await client.page.goto(report.receipt.url);
    const { data } = await client.stagehand.extract(
      `Read the current status of request ID ${JSON.stringify(report.receipt.id)}. Only report a status if this exact ID appears with its status on this page. A login page, empty form, or different request is unavailable. Copy the status evidence. Also identify whether the visible page requires sign-in.`,
      z.object({
        loginRequired: z.boolean(),
        id: z.string().nullable(),
        status: z
          .enum(["submitted", "acknowledged", "in_progress", "resolved"])
          .nullable(),
        evidence: z.string().max(1500),
      }),
    );
    needsLogin = data.loginRequired && isPortalUrl(report.authority_id, await client.page.url());
    const visible = await client.page.locator("body").innerText();
    const matched = !needsLogin && data.id === report.receipt.id && data.status !== null &&
      !!data.evidence.trim() && visible.includes(report.receipt.id) && visible.includes(data.evidence) &&
      isPortalUrl(report.authority_id, await client.page.url());
    await checkpoint(report.id, token, {
      stage: "submitted",
      tracking_supported: matched,
      last_tracked_at: new Date().toISOString(),
      next_run_at: next,
      message: matched
        ? `Latest portal status: ${data.status}`
        : needsLogin ? "Government login expired. Open the browser, sign in, then check status again." : "The portal did not show this request at its verified link. Check the authority account or email.",
      ...(matched
        ? {
            receipt: {
              ...report.receipt,
              status: data.status!,
              evidence: data.evidence,
            },
          }
        : {}),
    });
    if (matched) {
      const { error } = await db()
        .from("submissions")
        .upsert({
          issue_id: report.issue_id,
          status: data.status,
          external_request_id: report.receipt.id,
          external_status_url: report.receipt.url,
          updated_at: new Date().toISOString(),
        });
      dbError(error);
    }
  } finally {
    await disconnect(client.stagehand);
    if (!needsLogin) await releaseSession(client.sessionId);
  }
}
export async function runReport(id: string) {
  const token = randomUUID();
  const { data, error } = await db().rpc("claim_live_report", {
    p_id: id,
    p_token: token,
  });
  dbError(error);
  if (!data?.length) return;
  let report = liveReportSchema.parse(data[0]);
  try {
    if (["queued_analysis", "analyzing"].includes(report.stage)) {
      report = await checkpoint(id, token, {
        stage: "analyzing",
        message: "Analyzing your photo and checking nearby reports",
      });
      const analysis = await analyzeIssue(
        {
          mode: "live",
          storagePath: report.storage_path,
          location: report.location,
        },
        report.owner_id,
      );
      analysis.imageUrl = null;
      await checkpoint(id, token, {
        analysis,
        location: analysis.location,
        report: analysis.generatedReport,
        stage: "review",
        message: "Review your report and responsible agency",
      });
    } else if (["queued_prepare", "preparing"].includes(report.stage)) {
      report = await checkpoint(id, token, {
        stage: "preparing",
        message: "Opening the official reporting portal",
      });
      await preparePortal(report, token);
    } else if (report.stage === "queued_submit")
      await sendPortal(report, token);
    else if (["queued_verify", "verifying"].includes(report.stage)) {
      report = await checkpoint(id, token, {
        stage: "verifying",
        message: "Checking the portal receipt",
      });
      if (!report.session_id)
        throw new Error("Receipt verification requires the original session");
      const client = await connectBrowser(report, async () => {
        throw new Error("Original session expired");
      });
      try {
        if (
          !report.authority_id ||
          !isPortalUrl(report.authority_id, await client.page.url())
        )
          throw new Error("Receipt must be on the official portal");
        await captureReceipt(report, token, client.stagehand, client.page);
      } finally {
        await disconnect(client.stagehand);
      }
    } else if (["queued_track", "tracking"].includes(report.stage)) {
      report = await checkpoint(id, token, {
        stage: "tracking",
        message: "Checking the authority's status page",
      });
      await track(report, token);
    }
  } catch (error) {
    const { data: current, error: recoveryError } = await db()
      .from("live_reports")
      .select("stage")
      .eq("id", id)
      .eq("lease_token", token)
      .maybeSingle();
    dbError(recoveryError);
    if (current && current.stage !== "paused") {
      const uncertain = ["submitting", "verifying"].includes(current.stage);
      const wasTracking = ["tracking", "submitted"].includes(current.stage);
      const message = uncertain
        ? "The outcome is uncertain. Check the portal receipt; do not submit again."
        : error instanceof ApiError
          ? error.message
          : "This step could not finish. Your report is saved; retry or take over the browser.";
      await checkpoint(id, token, {
        stage: uncertain
          ? "uncertain"
          : wasTracking
            ? "submitted"
            : error instanceof ApiError && error.status === 409
              ? "needs_input"
              : "failed",
        message,
        ...(wasTracking
          ? { next_run_at: new Date(Date.now() + 86400000).toISOString() }
          : {}),
      });
    }
  } finally {
    const { error } = await db()
      .from("live_reports")
      .update({ lease_token: null, lease_until: null })
      .eq("id", id)
      .eq("lease_token", token);
    dbError(error);
  }
}
export async function runDueReports() {
  const now = new Date().toISOString();
  const scheduled = await db()
    .from("live_reports")
    .update({ stage: "queued_track", attempts: 0 })
    .eq("stage", "submitted")
    .eq("tracking_supported", true)
    .lte("next_run_at", now);
  dbError(scheduled.error);
  // First post-submission check discovers whether the receipt page supports status.
  const first = await db()
    .from("live_reports")
    .update({ stage: "queued_track", attempts: 0 })
    .eq("stage", "submitted")
    .is("tracking_supported", null)
    .lte("next_run_at", now);
  dbError(first.error);
  const exhausted = await db()
    .from("live_reports")
    .update({
      stage: "failed",
      message:
        "Automatic recovery limit reached. Review this task before retrying.",
    })
    .gte("attempts", 12)
    .in("stage", [
      "queued_analysis",
      "analyzing",
      "queued_prepare",
      "preparing",
      "queued_submit",
      "queued_track",
      "tracking",
      "queued_verify",
      "verifying",
    ])
    .or(`lease_until.is.null,lease_until.lt.${now}`);
  dbError(exhausted.error);
  const { data, error } = await db()
    .from("live_reports")
    .select("id")
    .in("stage", [
      "queued_analysis",
      "analyzing",
      "queued_prepare",
      "preparing",
      "queued_submit",
      "submitting",
      "queued_track",
      "tracking",
      "queued_verify",
      "verifying",
    ])
    .lte("next_run_at", now)
    .or(`lease_until.is.null,lease_until.lt.${now}`)
    .order("next_run_at")
    .limit(5);
  dbError(error);
  // Bound the invocation: 2 concurrent tasks; later tasks stay durably queued.
  await Promise.all((data ?? []).slice(0, 2).map((r) => runReport(r.id)));
  return { processed: Math.min(data?.length ?? 0, 2) };
}
