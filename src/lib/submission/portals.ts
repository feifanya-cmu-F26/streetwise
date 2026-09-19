import type { LiveReport } from "@/schemas/live";
export const PORTALS = {
  mountain_view: {
    name: "Ask Mountain View",
    url: "https://clients.comcate.com/newrequest.php?id=128",
    hosts: ["clients.comcate.com"],
    submitSelector: "#sendrequestbutton",
  },
  santa_clara_county: {
    name: "Santa Clara County Roads",
    url: "https://santaclara.maintstar.co/portal/#/workRequestAdd",
    hosts: ["santaclara.maintstar.co"],
    submitSelector: null,
  },
  caltrans: {
    name: "Caltrans",
    url: "https://csr.dot.ca.gov/",
    hosts: ["csr.dot.ca.gov"],
    submitSelector: "#submitBttn",
  },
} as const;
export function isPortalUrl(
  authority: NonNullable<LiveReport["authority_id"]>,
  value: string,
) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (PORTALS[authority].hosts as readonly string[]).includes(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export const CALTRANS_TYPES: Record<string, string> = {
  pothole: "RPH",
  graffiti: "GRA",
  trash: "LTD",
  sidewalk: "CSC",
  street_light: "TLN",
};
export function canTakeOver(report: Pick<LiveReport, "stage" | "lease_until">) {
  return (
    ["paused", "needs_input", "ready", "uncertain", "submitted"].includes(report.stage) &&
    (!report.lease_until || Date.parse(report.lease_until) < Date.now())
  );
}
