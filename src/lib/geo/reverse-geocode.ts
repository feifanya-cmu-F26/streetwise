import "server-only";
import { ApiError } from "@/lib/api/errors";
import type { IssueLocation } from "@/schemas/issue";

export async function reverseGeocode(
  location: IssueLocation,
): Promise<IssueLocation> {
  void location;
  throw new ApiError(
    501,
    "GEOCODING_NOT_IMPLEMENTED",
    "Connect Mapbox Geocoding here. Demo addresses are supplied by the user.",
  );
}
