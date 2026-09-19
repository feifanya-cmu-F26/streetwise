import "server-only";
import { randomUUID } from "node:crypto";
import Browserbase from "@browserbasehq/sdk";
import { db, dbError } from "@/lib/live/store";
import { requiredServerEnv } from "@/lib/env";
import { ApiError } from "@/lib/api/errors";
import type { StagehandBrowser } from "@browserbasehq/stagehand";
import type { LiveReport } from "@/schemas/live";
const sdk = () => new Browserbase({ apiKey: requiredServerEnv("BROWSERBASE_API_KEY") });
type Connection = { context_id: string | null; session_id: string | null; report_id: string | null };
const busy = () => new ApiError(409, "GOVERNMENT_SESSION_BUSY", "Another task is using this government login. Finish or close that browser first.");
async function locked<T>(owner: string, authority: string, task: (row: Connection, save: (patch: Partial<Connection>) => Promise<void>) => Promise<T>) {
  const token = randomUUID();
  const { data, error } = await db().rpc("lock_government_connection", { p_owner: owner, p_authority: authority, p_token: token });
  dbError(error);
  if (!data?.length) throw busy();
  const query = () => db().from("government_connections").update({ lock_token: null, lock_until: null })
    .eq("owner_id", owner).eq("authority_id", authority).eq("lock_token", token);
  try {
    return await task(data[0], async (patch) => {
      const { data: saved, error } = await db().from("government_connections")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("owner_id", owner).eq("authority_id", authority).eq("lock_token", token)
        .gt("lock_until", new Date().toISOString()).select("owner_id").maybeSingle();
      dbError(error);
      if (!saved) throw busy();
    });
  } finally { dbError((await query()).error); }
}
export async function persistentSession(report: LiveReport): Promise<{ sessionId: string; fresh: boolean; browser?: StagehandBrowser }> {
  return locked(report.owner_id, report.authority_id!, async (connection, save) => {
    const bb = sdk();
    if (connection.session_id) {
      const previous = await bb.sessions.retrieve(connection.session_id);
      if (previous.status === "RUNNING") {
        if (connection.report_id !== report.id) throw busy();
        return { sessionId: connection.session_id, fresh: false };
      }
      // Browserbase syncs the context when a session ends; avoid immediate stale reuse.
      if (previous.endedAt && Date.now() - Date.parse(previous.endedAt) < 5000) throw busy();
    }
    let contextId = connection.context_id;
    if (!contextId) {
      const context = await bb.contexts.create({ projectId: requiredServerEnv("BROWSERBASE_PROJECT_ID") });
      contextId = context.id;
      try { await save({ context_id: contextId }); }
      catch (error) { await bb.contexts.delete(contextId); throw error; }
    }
    const { browserbase } = await import("@browserbasehq/stagehand");
    const browser = await browserbase.launch({
      apiKey: requiredServerEnv("BROWSERBASE_API_KEY"),
      projectId: requiredServerEnv("BROWSERBASE_PROJECT_ID"), keepAlive: true, api_timeout: 1800,
      browserSettings: { context: { id: contextId, persist: true }, viewport: { width: 1280, height: 900 } },
    });
    const sessionId = browser.sessionId!;
    try { await save({ session_id: sessionId, report_id: report.id }); }
    catch (error) {
      await bb.sessions.update(sessionId, { projectId: requiredServerEnv("BROWSERBASE_PROJECT_ID"), status: "REQUEST_RELEASE" });
      throw error;
    }
    return { sessionId, fresh: true, browser };
  });
}
export async function usesSavedLogin(owner: string, authority: string, sessionId: string) {
  const { data, error } = await db().from("government_connections").select("session_id")
    .eq("owner_id", owner).eq("authority_id", authority).eq("session_id", sessionId).maybeSingle();
  dbError(error); return !!data;
}
export async function closeGovernmentLogin(owner: string, authority: string, forget: boolean) {
  await locked(owner, authority, async (connection, save) => {
    const token = randomUUID();
    let fenced = false;
    let previousStage = "";
    if (connection.report_id) {
      const { data, error } = await db().from("live_reports")
        .update({ lease_token: token, lease_until: new Date(Date.now() + 90000).toISOString() })
        .eq("id", connection.report_id).eq("owner_id", owner)
        .in("stage", ["paused", "needs_input", "ready", "submitted", "failed"])
        .or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`).select("id,stage").maybeSingle();
      dbError(error);
      if (!data) throw new ApiError(409, "TASK_RUNNING", "Pause active work first. If a submission outcome is uncertain, verify its receipt before closing the browser.");
      fenced = true;
      previousStage = data.stage;
    }
    try {
      const bb = sdk();
      if (connection.session_id) {
        const session = await bb.sessions.retrieve(connection.session_id);
        if (session.status === "RUNNING")
          await bb.sessions.update(session.id, { projectId: requiredServerEnv("BROWSERBASE_PROJECT_ID"), status: "REQUEST_RELEASE" });
      }
      if (forget && connection.context_id) {
        try { await bb.contexts.delete(connection.context_id); }
        catch (error) { if (!(error instanceof Browserbase.APIError && error.status === 404)) throw error; }
      }
      await save(forget ? { context_id: null, session_id: null, report_id: null } : { report_id: null });
      if (fenced) {
        const result = await db().from("live_reports").update({ session_id: null,
          ...(previousStage === "submitted" ? {} : { stage: "paused", checkpoint: 0,
            message: "Browser closed. Resume to prepare a fresh form before sending." }),
        })
          .eq("id", connection.report_id!).eq("lease_token", token).eq("session_id", connection.session_id || "");
        dbError(result.error);
      }
    } finally {
      if (fenced) dbError((await db().from("live_reports").update({ lease_token: null, lease_until: null })
        .eq("id", connection.report_id!).eq("lease_token", token)).error);
    }
  });
}

export const forgetGovernmentLogin = (owner: string, authority: string) => closeGovernmentLogin(owner, authority, true);
