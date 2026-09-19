import type { Issue, IssueType } from "@/schemas/issue";

// Presentation-only examples. Never insert these into live reports or jobs.
const examples: { type: IssueType; title: string; lat: number; lng: number; address: string; photo: string }[] = [
  { type: "pothole", title: "Pothole on Castro St", lat: 37.394, lng: -122.081, address: "Castro Street, Mountain View", photo: "/images/pothole.png" },
  { type: "street_light", title: "Broken street light", lat: 37.397, lng: -122.077, address: "Downtown Mountain View", photo: "/images/street-light.png" },
  { type: "sidewalk", title: "Uneven sidewalk", lat: 37.391, lng: -122.084, address: "Old Mountain View", photo: "/images/sidewalk.png" },
];

export const mapExamples: Issue[] = examples.map((sample, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index + 1}`,
  type: sample.type,
  severity: "low",
  location: { lat: sample.lat, lng: sample.lng, address: sample.address },
  imageUrl: null,
  report: { title: sample.title, description: "Fictional example shown as resolved. This is not a verified repair or a government report.", category: sample.type },
  authority: { status: "needs_review", authority: null, reason: "Fictional example." },
  status: "resolved",
  community: { stillThere: 0, resolved: 0, lastVerifiedAt: null },
  submission: { status: "not_submitted", externalRequestId: null, externalStatusUrl: null },
  createdAt: "2026-09-18T16:00:00Z",
  updatedAt: "2026-09-19T16:00:00Z",
}));

export function mapExamplePhoto(id: string): string | undefined {
  const index = mapExamples.findIndex(issue => issue.id === id);
  return index < 0 ? undefined : examples[index].photo;
}

export function isMapExample(issue: Issue): boolean {
  return mapExamples.some(sample => sample.id === issue.id);
}
