import type { DuplicateCandidate } from "@/schemas/analysis";
import type { IssueLocation, IssueStatus } from "@/schemas/issue";

const EARTH_RADIUS_METERS = 6_371_000;
export const METERS_PER_LAT_DEGREE = 111_320;
export const CANDIDATE_RADIUS_METERS = 120;
export const MAX_CANDIDATES = 5;

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

// Longitude degrees shrink toward the poles. Clamped so a near-polar report
// widens the prefilter instead of dividing by zero.
export function boundingBoxDeltas(lat: number) {
  const latDelta = CANDIDATE_RADIUS_METERS / METERS_PER_LAT_DEGREE;
  return {
    latDelta,
    lngDelta: latDelta / Math.max(Math.cos((lat * Math.PI) / 180), 0.01),
  };
}

export function rankCandidates(
  location: IssueLocation,
  rows: { id: string; report_title: string; lat: number; lng: number; status: IssueStatus }[],
): DuplicateCandidate[] {
  return rows
    .map((row) => ({
      issueId: row.id,
      title: row.report_title,
      status: row.status,
      distanceMeters: Math.round(haversineMeters(location, row)),
    }))
    .filter((candidate) => candidate.distanceMeters <= CANDIDATE_RADIUS_METERS)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_CANDIDATES);
}
