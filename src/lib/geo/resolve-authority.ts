import "server-only";
import { z } from "zod";
import type { IssueLocation } from "@/schemas/issue";
import { resolveRoadRecords, ROAD_SOURCES } from "./road-authority";
import type { AuthorityResolution } from "@/schemas/authority";
async function nearby(url: string, location: IssueLocation) {
  const params = new URLSearchParams({
    f: "json",
    geometry: `${location.lng},${location.lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: "12",
    units: "esriSRUnit_Meter",
    outFields: "*",
    returnGeometry: "false",
  });
  const response = await fetch(`${url}/query?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Jurisdiction service unavailable");
  const result = z
    .object({
      exceededTransferLimit: z.literal(false).optional(),
      features: z.array(
        z.object({ attributes: z.record(z.string(), z.unknown()) }),
      ),
    })
    .parse(await response.json());
  return result.features;
}
export async function resolveAuthority(
  location: IssueLocation,
): Promise<AuthorityResolution> {
  try {
    const [mv, county] = await Promise.all([
      nearby(ROAD_SOURCES.city, location),
      nearby(ROAD_SOURCES.county, location),
    ]);
    return resolveRoadRecords(mv.map(row => row.attributes.MAINTBY), county.length);
  } catch {
    return {
      status: "needs_review",
      authority: null,
      reason:
        "Official road maintenance data could not be checked. Confirm the responsible agency before continuing.",
    };
  }
}
