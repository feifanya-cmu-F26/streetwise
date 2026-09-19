import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { ApiError } from "@/lib/api/errors";
import { liveReportSchema, type LiveReport } from "@/schemas/live";
export const db = () => createServerSupabaseClient();
export function dbError(error: unknown) {
  if (error)
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Could not save or read this task. Check live database setup and try again.",
    );
}
export async function ownedReport(id: string, ownerId: string) {
  const { data, error } = await db()
    .from("live_reports")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  dbError(error);
  if (!data) throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found.");
  return liveReportSchema.parse(data);
}
export async function event(id: string, stage: string, message: string) {
  const { error } = await db()
    .from("report_events")
    .insert({ report_id: id, stage, message });
  dbError(error);
}
export async function checkpoint(
  id: string,
  token: string,
  patch: Partial<LiveReport>,
) {
  const { data, error } = await db()
    .from("live_reports")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("lease_token", token)
    .neq("stage", "paused")
    .select()
    .maybeSingle();
  dbError(error);
  if (!data)
    throw new ApiError(
      409,
      "TASK_INTERRUPTED",
      "Task paused or claimed by another worker.",
    );
  if (patch.message) await event(id, patch.stage ?? data.stage, patch.message);
  return liveReportSchema.parse(data);
}
export async function assertRunning(id: string, token: string) {
  const { data, error } = await db()
    .from("live_reports")
    .select("stage,lease_token,lease_until")
    .eq("id", id)
    .single();
  dbError(error);
  if (
    !data ||
    data.lease_token !== token ||
    data.stage === "paused" ||
    Date.parse(data.lease_until) < Date.now()
  )
    throw new ApiError(
      409,
      "TASK_INTERRUPTED",
      "Task paused or lease expired.",
    );
}
