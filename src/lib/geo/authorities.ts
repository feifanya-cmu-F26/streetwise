import type { Authority } from "@/schemas/authority";

// Display metadata for the authority ids stored in issues.authority_id. These
// are organization names, not a claim about who is responsible for any given
// issue. resolveAuthority checks maintained-road evidence; users review the
// automatically selected destination and may explicitly override it.
// These intake endpoints were verified against the agencies' official sites.
export const AUTHORITIES: Record<Authority["id"], Authority> = {
  mountain_view: {
    id: "mountain_view",
    name: "City of Mountain View",
    department: "Public Works",
    submissionUrl: "https://clients.comcate.com/newrequest.php?id=128",
  },
  santa_clara_county: {
    id: "santa_clara_county",
    name: "County of Santa Clara",
    department: "Roads and Airports",
    submissionUrl: "https://santaclara.maintstar.co/portal/#/workRequestAdd",
  },
  caltrans: {
    id: "caltrans",
    name: "California Department of Transportation",
    department: "District 4",
    submissionUrl: "https://csr.dot.ca.gov/",
  },
};
