import { after } from "next/server";
import { apiRoute, demoResponse, readJson, issueIdFrom } from "@/lib/api/route";
import { requireUser, assertSameOrigin, limit } from "@/lib/auth/server";
import { db, dbError, ownedReport } from "@/lib/live/store";
import { reportActionSchema } from "@/schemas/live";
import { runReport } from "@/lib/live/worker";
import { signEvidenceReadUrls } from "@/lib/supabase/storage";
import { ApiError } from "@/lib/api/errors";
import { chooseSubmissionAuthority } from "@/lib/submission/authority-choice";
export const maxDuration = 300;
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return apiRoute(async () => {
    const user = await requireUser(request),
      id = await issueIdFrom(context),
      report = await ownedReport(id, user.id);
    const [{ data: events, error }, urls] = await Promise.all([
      db()
        .from("report_events")
        .select("stage,message,created_at")
        .eq("report_id", id)
        .order("id", { ascending: false })
        .limit(40),
      signEvidenceReadUrls([report.storage_path]),
    ]);
    dbError(error);
    return demoResponse(
      { report, events, photoUrl: urls.get(report.storage_path) ?? null },
      200,
      "live",
    );
  });
}
export async function POST(request: Request, context: Context) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request),
      id = await issueIdFrom(context);
    const report = await ownedReport(id, user.id),
      input = await readJson(request, reportActionSchema);
    await limit(`action:${user.id}`, 120, 3600);
    if (input.action === "approve") {
      const authority = chooseSubmissionAuthority(report.analysis?.authority, input);
      if (!authority)
        throw new ApiError(400, "AUTHORITY_NEEDS_REVIEW", "We could not confirm the responsible agency. Choose and confirm an agency before continuing.");
      if (input.report.category !== report.analysis?.issueType)
        throw new ApiError(
          400,
          "CATEGORY_MISMATCH",
          "Category must match the analyzed issue.",
        );
      const { error } = await db().rpc("approve_live_report", {
        p_id: id,
        p_owner: user.id,
        p_report: input.report,
        p_authority: authority,
        p_contact: { ...input.contact, publishPhoto: input.publishPhotoConfirmed === true },
      });
      if (error)
        throw new ApiError(
          409,
          "REVIEW_NOT_AVAILABLE",
          "This report is no longer awaiting review. Refresh and try again.",
        );
    } else if (input.action === "portal_mode") {
      if (report.authority_id !== "mountain_view" || !report.contact || report.receipt)
        throw new ApiError(409, "ACTION_NOT_AVAILABLE", "This portal does not support that choice.");
      const now = new Date().toISOString();
      const { data, error } = await db().from("live_reports").update({
        contact: { ...report.contact, portalReplyMode: input.mode },
        stage: "queued_prepare", attempts: 0, next_run_at: now, updated_at: now,
        message: input.mode === "anonymous" ? "Preparing anonymously without replies or tracking" : "Preparing with AskMV account replies",
      }).eq("id", id).eq("owner_id", user.id).eq("stage", "needs_input")
        .eq("updated_at", report.updated_at)
        .or(`lease_until.is.null,lease_until.lt.${now}`).select("id").maybeSingle();
      dbError(error);
      if (!data) throw new ApiError(409, "ACTION_NOT_AVAILABLE", "Wait for preparation to stop, then try again.");
    } else {
      if (input.action === "track" && report.contact?.portalReplyMode === "anonymous")
        throw new ApiError(409, "TRACKING_DISABLED", "This report was submitted without replies or tracking.");
      const { error } = await db().rpc("control_live_report", {
        p_id: id,
        p_owner: user.id,
        p_action: input.action,
        p_reason: input.action === "pause" ? input.reason : null,
      });
      if (error)
        throw new ApiError(
          409,
          "ACTION_NOT_AVAILABLE",
          "This action is not available yet. Wait for the current step to finish and refresh.",
        );
    }
    if (input.action !== "pause") after(() => runReport(id));
    return demoResponse(await ownedReport(id, user.id), 202, "live");
  });
}
