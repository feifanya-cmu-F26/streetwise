import { after } from "next/server";
import { apiRoute, demoResponse, readJson } from "@/lib/api/route";
import { requireUser, assertSameOrigin, limit } from "@/lib/auth/server";
import { db, dbError, ownedReport } from "@/lib/live/store";
import { newLiveReportSchema } from "@/schemas/live";
import { assertEvidenceAvailable } from "@/lib/supabase/storage";
import { runReport } from "@/lib/live/worker";
export const maxDuration = 300;
export async function GET(request: Request) {
  return apiRoute(async () => {
    const user = await requireUser(request);
    const { data, error } = await db()
      .from("live_reports")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    dbError(error);
    return demoResponse(data, 200, "live");
  });
}
export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request),
      input = await readJson(request, newLiveReportSchema);
    const existing = await db()
      .from("live_reports")
      .select("id")
      .eq("id", input.id)
      .eq("owner_id", user.id)
      .maybeSingle();
    dbError(existing.error);
    if (existing.data)
      return demoResponse(await ownedReport(input.id, user.id), 200, "live");
    await limit(`report:${user.id}`, 20, 3600);
    await assertEvidenceAvailable(input.storagePath, user.id);
    const { error } = await db()
      .from("live_reports")
      .insert({
        id: input.id,
        owner_id: user.id,
        storage_path: input.storagePath,
        location: input.location,
        description: input.description,
      });
    if (error) {
      if (error.code === "23505")
        return demoResponse(await ownedReport(input.id, user.id), 200, "live");
      dbError(error);
    }
    after(() => runReport(input.id));
    return demoResponse(await ownedReport(input.id, user.id), 202, "live");
  });
}
