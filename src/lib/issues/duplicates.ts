import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { boundingBoxDeltas, rankCandidates } from "@/lib/issues/distance";
import type { DuplicateCandidate } from "@/schemas/analysis";
import type { IssueLocation, IssueStatus, IssueType } from "@/schemas/issue";

// Nearby reports of the same type, nearest first. These are candidates for a
// reviewer to judge, never a duplicate decision: proximity alone does not
// establish that two reports describe the same thing, so nothing here sets
// duplicate.isDuplicate. Resolved issues are excluded — a new report at the
// site of a fixed one is usually a new problem.
export async function findDuplicateCandidates(
  location: IssueLocation,
  type: IssueType,
): Promise<DuplicateCandidate[]> {
  // Bounding box in SQL, exact distance in memory. PostGIS would replace both.
  const { latDelta, lngDelta } = boundingBoxDeltas(location.lat);
  const { data } = await createServerSupabaseClient()
    .from("issues")
    .select("id, report_title, lat, lng, status")
    .eq("type", type)
    .neq("status", "resolved")
    .gte("lat", location.lat - latDelta)
    .lte("lat", location.lat + latDelta)
    .gte("lng", location.lng - lngDelta)
    .lte("lng", location.lng + lngDelta)
    .returns<
      {
        id: string;
        report_title: string;
        lat: number;
        lng: number;
        status: IssueStatus;
      }[]
    >();
  return rankCandidates(location, data ?? []);
}
