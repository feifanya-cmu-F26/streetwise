import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiRoute, demoResponse, issueIdFrom, readJson } from "@/lib/api/route";
import { requireUser, assertSameOrigin, limit } from "@/lib/auth/server";
import { ownedReport, db, dbError } from "@/lib/live/store";
import { liveView, connectBrowser, disconnect } from "@/lib/submission/browser";
import { canTakeOver, isPortalUrl } from "@/lib/submission/portals";
import { ApiError } from "@/lib/api/errors";
export const maxDuration = 60;
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return apiRoute(async () => {
    const user = await requireUser(request),
      report = await ownedReport(await issueIdFrom(context), user.id);
    return demoResponse(
      {
        url: report.session_id ? await liveView(report.session_id) : null,
        interactive: canTakeOver(report),
      },
      200,
      "live",
    );
  });
}

// Mobile live viewers do not reliably open the native keyboard. This explicit
// owner action fills only the focused text field; it cannot click/submit/navigate.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const id = await issueIdFrom(context);
    const report = await ownedReport(id, user.id);
    const { text } = await readJson(request, z.object({ text: z.string().min(1).max(4000) }).strict());
    if (!canTakeOver(report) || !report.session_id || !report.authority_id)
      throw new ApiError(409, "TAKEOVER_UNAVAILABLE", "Pause automation and wait before entering text.");
    await limit(`browser-input:${user.id}`, 120, 3600);
    const token = randomUUID();
    const { data, error } = await db().from("live_reports")
      .update({ lease_token: token, lease_until: new Date(Date.now() + 75000).toISOString() })
      .eq("id", id).eq("owner_id", user.id).eq("session_id", report.session_id)
      .in("stage", ["paused", "needs_input", "ready", "uncertain", "submitted"])
      .or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`)
      .select("id").maybeSingle();
    dbError(error);
    if (!data) throw new ApiError(409, "TASK_BUSY", "Wait for the current operation to finish.");
    try {
      const client = await connectBrowser({ ...report, stage: "queued_verify" }, async () => { throw new Error("Existing browser required"); });
      try {
        if (!isPortalUrl(report.authority_id, await client.page.url()))
          throw new ApiError(409, "WRONG_PORTAL", "Return to the selected official portal before entering text.");
        const field = client.page.locator('input:focus:not([type="submit"]):not([type="button"]):not([type="file"]), textarea:focus');
        if (await field.count() !== 1)
          throw new ApiError(409, "NO_FOCUSED_FIELD", "Tap an editable text field inside the portal first.");
        await field.fill(text);
      } finally { await disconnect(client.stagehand); }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // SDK exceptions can embed the attempted input. Do not pass them to logs.
      throw new ApiError(502, "BROWSER_INPUT_FAILED", "Text could not be entered. Check the selected field and browser connection.");
    } finally {
      const cleared = await db().from("live_reports").update({ lease_token: null, lease_until: null }).eq("id", id).eq("lease_token", token);
      dbError(cleared.error);
    }
    return demoResponse({ entered: true }, 200, "live");
  });
}
