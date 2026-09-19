import { AUTHORITIES } from "./authorities";
import type { AuthorityResolution } from "@/schemas/authority";

export const ROAD_SOURCES = {
  city: "https://maps.mountainview.gov/arcgis/rest/services/Public/RoadCenterline/MapServer/0",
  county: "https://maps.santaclaracounty.gov/server/rest/services/agency/SCCRdsArptsCLOut/MapServer/0",
};

export function resolveRoadRecords(maintainers: unknown[], countyMatches: number): AuthorityResolution {
  const owners: Record<string, keyof typeof AUTHORITIES> = {
    MountainView: "mountain_view",
    MountainView_Streets: "mountain_view",
    MountainView_Traffic: "mountain_view",
    MountainView_Parks: "mountain_view",
    Caltrans: "caltrans",
    SantaClaraCounty: "santa_clara_county",
  };
  const ids = new Set<keyof typeof AUTHORITIES>();
  let uncertain = false;
  for (const maintainer of maintainers) {
    const id = typeof maintainer === "string" && Object.hasOwn(owners, maintainer) ? owners[maintainer] : undefined;
    if (id) ids.add(id);
    else uncertain = true;
  }
  if (countyMatches) ids.add("santa_clara_county");
  if (ids.size === 1 && !uncertain) {
    const id = [...ids][0];
    const source = id === "santa_clara_county" && countyMatches ? ROAD_SOURCES.county : ROAD_SOURCES.city;
    return { status: "resolved", authority: AUTHORITIES[id], reason: `Official road records within 12 m identify ${AUTHORITIES[id].name} as the maintaining agency. Source: ${source}` };
  }
  return {
    status: "needs_review", authority: null,
    reason: ids.size > 1
      ? "Nearby road maintenance records conflict. Confirm the responsible agency."
      : "No unambiguous maintained road match. Confirm responsibility for this exact asset.",
  };
}
