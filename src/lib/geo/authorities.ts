import type { Authority } from "@/schemas/authority";

// Display metadata for the authority ids stored in issues.authority_id. These
// are organization names, not a claim about who is responsible for any given
// issue — deciding that is resolveAuthority's job and is still unimplemented.
// submissionUrl stays null until a real intake endpoint has been confirmed.
export const AUTHORITIES: Record<Authority["id"], Authority> = {
  mountain_view: {
    id: "mountain_view",
    name: "City of Mountain View",
    department: "Public Works",
    submissionUrl: null,
  },
  santa_clara_county: {
    id: "santa_clara_county",
    name: "County of Santa Clara",
    department: "Roads and Airports",
    submissionUrl: null,
  },
  caltrans: {
    id: "caltrans",
    name: "California Department of Transportation",
    department: "District 4",
    submissionUrl: null,
  },
};
