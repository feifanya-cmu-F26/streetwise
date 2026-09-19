import type { AuthorityResolution, Authority } from "@/schemas/authority";

// This decision takes persisted analysis, never client-provided model output.
// null requires a specific user choice; it must never become a default portal.
export function automaticAuthority(
  resolution: AuthorityResolution | null | undefined,
): Authority["id"] | null {
  return resolution?.status === "resolved" ? resolution.authority.id : null;
}

export function chooseSubmissionAuthority(
  resolution: AuthorityResolution | null | undefined,
  manual: { authorityId?: Authority["id"]; authorityConfirmed?: true },
): Authority["id"] | null {
  if (manual.authorityId) {
    return manual.authorityConfirmed ? manual.authorityId : null;
  }
  return automaticAuthority(resolution);
}
