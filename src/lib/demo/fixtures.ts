import { issueSchema, type Issue } from "@/schemas/issue";

// Fictional fixtures, not observations or government records.
export const seedIssues: Issue[] = issueSchema.array().parse([
  {
    id: "00000000-0000-4000-8000-000000000001",
    type: "pothole",
    severity: "medium",
    location: {
      lat: 37.394,
      lng: -122.081,
      address: "Castro Street, Mountain View · sample location",
    },
    imageUrl: null,
    report: {
      title: "Pavement damage near the crossing",
      description:
        "Sample report: a damaged section of pavement near a pedestrian crossing.",
      category: "pothole",
    },
    authority: {
      status: "resolved",
      authority: {
        id: "mountain_view",
        name: "City of Mountain View",
        department: "Public Works",
        submissionUrl: null,
      },
      reason:
        "Illustrative authority assignment, not a verified jurisdiction decision.",
    },
    status: "ready",
    community: { stillThere: 4, resolved: 0, lastVerifiedAt: null },
    submission: {
      status: "not_submitted",
      externalRequestId: null,
      externalStatusUrl: null,
    },
    createdAt: "2026-09-18T16:00:00.000Z",
    updatedAt: "2026-09-18T16:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    type: "street_light",
    severity: "low",
    location: {
      lat: 37.397,
      lng: -122.077,
      address: "Downtown Mountain View · sample location",
    },
    imageUrl: null,
    report: {
      title: "Street light needs a check",
      description:
        "Sample report: a street light appears unlit. This is fictional demo evidence.",
      category: "street_light",
    },
    authority: {
      status: "needs_review",
      authority: null,
      reason: "Ownership has not been verified.",
    },
    status: "detected",
    community: { stillThere: 2, resolved: 1, lastVerifiedAt: null },
    submission: {
      status: "not_submitted",
      externalRequestId: null,
      externalStatusUrl: null,
    },
    createdAt: "2026-09-18T17:00:00.000Z",
    updatedAt: "2026-09-18T17:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    type: "sidewalk",
    severity: "low",
    location: {
      lat: 37.391,
      lng: -122.084,
      address: "Old Mountain View · sample location",
    },
    imageUrl: null,
    report: {
      title: "Uneven sidewalk edge",
      description: "Sample report: a raised edge between two sidewalk slabs.",
      category: "sidewalk",
    },
    authority: {
      status: "needs_review",
      authority: null,
      reason: "Property and maintenance responsibility need review.",
    },
    status: "detected",
    community: { stillThere: 3, resolved: 0, lastVerifiedAt: null },
    submission: {
      status: "not_submitted",
      externalRequestId: null,
      externalStatusUrl: null,
    },
    createdAt: "2026-09-18T18:00:00.000Z",
    updatedAt: "2026-09-18T18:00:00.000Z",
  },
]);
