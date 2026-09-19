import "server-only";
import { ApiError } from "@/lib/api/errors";
import type { IssueLocation, IssueType } from "@/schemas/issue";
import type { AuthorityResolution } from "@/schemas/authority";

export async function resolveAuthority(
  location: IssueLocation,
  type: IssueType,
): Promise<AuthorityResolution> {
  void location;
  void type;
  throw new ApiError(
    501,
    "AUTHORITY_NOT_IMPLEMENTED",
    "Connect verified jurisdiction data here. A city name alone does not establish responsibility.",
  );
}
