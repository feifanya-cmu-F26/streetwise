import { AUTHORITIES } from "@/lib/geo/authorities";
import { issueSchema, type Issue } from "@/schemas/issue";
import { authorityResolutionSchema } from "@/schemas/authority";
import type { CreateIssueRequest } from "@/schemas/analysis";

// Row shape of the `issues` table. The database is flat; the Zod contract is
// nested, so every read and write goes through this file. Kept free of
// server-only imports so contract tests can exercise it without a database.
export type IssueRow = {
  id: string;
  type: Issue["type"];
  severity: Issue["severity"];
  lat: number;
  lng: number;
  address: string | null;
  image_path: string | null;
  owner_id?: string;
  photo_public?: boolean;
  report_title: string;
  report_description: string;
  authority_status: "resolved" | "needs_review";
  authority_id: string | null;
  authority_reason: string;
  status: Issue["status"];
  still_there_count: number;
  resolved_count: number;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
  submissions: {
    status: Issue["submission"]["status"];
    external_request_id: string | null;
    external_status_url: string | null;
  } | null;
};

// Postgres returns timestamptz with a +00:00 offset; the API contract is
// Z-suffixed ISO, so normalize rather than loosening the shared schema.
function isoFrom(value: string): string;
function isoFrom(value: string | null): string | null;
function isoFrom(value: string | null) {
  return value === null ? null : new Date(value).toISOString();
}

function authorityFromRow(row: IssueRow) {
  // An id that is no longer in the registry degrades to needs_review rather
  // than inventing an authority or dropping the issue.
  const authority = row.authority_id
    ? AUTHORITIES[row.authority_id as keyof typeof AUTHORITIES]
    : undefined;
  if (row.authority_status === "resolved" && authority) {
    return { status: "resolved" as const, authority, reason: row.authority_reason };
  }
  return {
    status: "needs_review" as const,
    authority: null,
    reason: row.authority_reason,
  };
}

// imageUrl is signed by the caller: the bucket is private, so a path only
// becomes a URL at read time and that URL must not be stored anywhere.
export function issueFromRow(row: IssueRow, imageUrl: string | null): Issue {
  return issueSchema.parse({
    id: row.id,
    type: row.type,
    severity: row.severity,
    location: {
      lat: row.lat,
      lng: row.lng,
      ...(row.address ? { address: row.address } : {}),
    },
    imageUrl,
    report: {
      title: row.report_title,
      description: row.report_description,
      category: row.type,
    },
    authority: authorityResolutionSchema.parse(authorityFromRow(row)),
    status: row.status,
    community: {
      stillThere: row.still_there_count,
      resolved: row.resolved_count,
      lastVerifiedAt: isoFrom(row.last_verified_at),
    },
    submission: {
      status: row.submissions?.status ?? "not_submitted",
      externalRequestId: row.submissions?.external_request_id ?? null,
      externalStatusUrl: row.submissions?.external_status_url ?? null,
    },
    createdAt: isoFrom(row.created_at),
    updatedAt: isoFrom(row.updated_at),
  });
}

export function insertRowFromRequest(
  { analysis, report }: CreateIssueRequest,
  imagePath: string | null,
) {
  return {
    type: analysis.issueType,
    severity: analysis.severity,
    lat: analysis.location.lat,
    lng: analysis.location.lng,
    address: analysis.location.address ?? null,
    image_path: imagePath,
    report_title: report.title,
    report_description: report.description,
    authority_status: analysis.authority.status,
    authority_id: analysis.authority.authority?.id ?? null,
    authority_reason: analysis.authority.reason,
    status: "ready" as const,
  };
}
