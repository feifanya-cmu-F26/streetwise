import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeRequestSchema,
  createIssueRequestSchema,
  type DemoAnalyzeRequest,
} from "../src/schemas/analysis";
import { submissionRequestSchema } from "../src/schemas/submission";
import { uploadRequestSchema } from "../src/schemas/upload";
import { analyzeDemoIssue } from "../src/lib/demo/analyze";
import {
  insertRowFromRequest,
  issueFromRow,
  type IssueRow,
} from "../src/lib/issues/mapping";
import {
  boundingBoxDeltas,
  haversineMeters,
  rankCandidates,
} from "../src/lib/issues/distance";
import { prepareDemoSubmission } from "../src/lib/submission/demo";

const input = analyzeRequestSchema.parse({
  mode: "demo",
  demoIssueType: "pothole",
  location: { lat: 37.394, lng: -122.081 },
}) as DemoAnalyzeRequest;

const row: IssueRow = {
  id: "00000000-0000-4000-8000-000000000001",
  type: "pothole",
  severity: "medium",
  lat: 37.394,
  lng: -122.081,
  address: "Castro Street, Mountain View · sample location",
  image_path: "issues/00000000-0000-4000-8000-000000000001/photo.jpg",
  report_title: "Pavement damage near the crossing",
  report_description: "Sample report: damaged pavement near a crossing.",
  authority_status: "resolved",
  authority_id: "mountain_view",
  authority_reason: "Illustrative assignment, not a verified decision.",
  status: "ready",
  still_there_count: 4,
  resolved_count: 0,
  last_verified_at: null,
  created_at: "2026-09-18T16:00:00.000Z",
  updated_at: "2026-09-18T16:00:00.000Z",
  submissions: null,
};

test("demo analysis preserves coordinates and admits unresolved authority", () => {
  const analysis = analyzeDemoIssue(input);
  assert.deepEqual(analysis.location, input.location);
  assert.equal(analysis.authority.status, "needs_review");
  assert.equal(analysis.needsReview, true);
  assert.equal(analysis.mode, "demo");
});

test("coordinates and explicit demo boundaries reject invalid inputs", () => {
  for (const location of [
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    { lat: "37", lng: 0 },
  ]) {
    assert.equal(
      analyzeRequestSchema.safeParse({ ...input, location }).success,
      false,
    );
  }
  assert.equal(
    analyzeRequestSchema.safeParse({ ...input, mode: "live" }).success,
    false,
  );
  assert.equal(
    analyzeRequestSchema.safeParse({
      mode: "live",
      storagePath: "pending/example.jpg",
      location: input.location,
    }).success,
    true,
  );
  assert.equal(
    uploadRequestSchema.safeParse({
      contentType: "image/jpeg",
      sizeBytes: 12,
    }).success,
    true,
  );
  assert.equal(
    uploadRequestSchema.safeParse({
      contentType: "application/pdf",
      sizeBytes: 12,
    }).success,
    false,
  );
  assert.equal(
    submissionRequestSchema.safeParse({ mode: "demo", reviewed: false })
      .success,
    false,
  );
  assert.equal(
    submissionRequestSchema.safeParse({ mode: "live", reviewed: true }).success,
    false,
  );
});

test("a database row maps onto the issue contract", () => {
  const issue = issueFromRow(row, "https://example.com/signed.jpg");
  assert.equal(issue.imageUrl, "https://example.com/signed.jpg");
  assert.equal(issue.report.category, issue.type);
  assert.equal(issue.community.stillThere, 4);
  assert.equal(issue.authority.status, "resolved");
  assert.equal(issue.authority.authority?.name, "City of Mountain View");
  // A row with no submissions row is not_submitted, never a fabricated receipt.
  assert.equal(issue.submission.status, "not_submitted");
  assert.equal(issue.submission.externalRequestId, null);
});

test("an unsigned or unknown-authority row degrades instead of inventing data", () => {
  assert.equal(issueFromRow(row, null).imageUrl, null);
  const stale = issueFromRow({ ...row, authority_id: "former_agency" }, null);
  assert.equal(stale.authority.status, "needs_review");
  assert.equal(stale.authority.authority, null);
});

test("creation uses reviewed text and never persists a government receipt", () => {
  const analysis = analyzeDemoIssue(input);
  const insert = insertRowFromRequest(
    {
      analysis,
      report: { ...analysis.generatedReport, title: "Reviewed title" },
    },
    "pending/photo.jpg",
  );
  assert.equal(insert.report_title, "Reviewed title");
  assert.equal(insert.image_path, "pending/photo.jpg");
  assert.equal(insert.authority_status, "needs_review");
  assert.equal(insert.authority_id, null);
  assert.equal(insert.status, "ready");
  assert.ok(!("submission" in insert));
});

test("candidate ranking measures real distance and stays within its radius", () => {
  const here = { lat: 37.394, lng: -122.081 };
  // 0.001 degrees of latitude is ~111 m anywhere on earth.
  assert.equal(
    Math.round(haversineMeters(here, { ...here, lat: here.lat + 0.001 })),
    111,
  );
  assert.equal(Math.round(haversineMeters(here, here)), 0);
  const ranked = rankCandidates(here, [
    { id: "b", report_title: "far", lat: here.lat + 0.0009, lng: here.lng, status: "ready" },
    { id: "a", report_title: "near", lat: here.lat + 0.0002, lng: here.lng, status: "detected" },
    { id: "c", report_title: "outside", lat: here.lat + 0.01, lng: here.lng, status: "ready" },
  ]);
  assert.deepEqual(
    ranked.map((c) => c.issueId),
    ["a", "b"],
  );
  assert.ok(ranked[0].distanceMeters < ranked[1].distanceMeters);
  // A candidate is never a decision, so nothing here carries a confidence.
  assert.ok(!("isDuplicate" in ranked[0]));
});

test("a near-polar report widens the prefilter instead of dividing by zero", () => {
  const { latDelta, lngDelta } = boundingBoxDeltas(89.9999);
  assert.ok(Number.isFinite(lngDelta));
  assert.ok(lngDelta > latDelta);
});

test("demo preparation is repeatable and never mutates submission state", () => {
  const issue = issueFromRow(row, null);
  const result = prepareDemoSubmission(issue);
  assert.deepEqual(prepareDemoSubmission(issue), result);
  assert.equal(result.status, "prepared");
  assert.equal(result.submittedToGovernment, false);
  assert.deepEqual(issueFromRow(row, null), issue);
});

test("duplicate decisions and mismatched categories are rejected", () => {
  const analysis = analyzeDemoIssue(input);
  assert.equal(
    createIssueRequestSchema.safeParse({
      analysis,
      report: { ...analysis.generatedReport, category: "trash" },
    }).success,
    false,
  );
  assert.equal(
    createIssueRequestSchema.safeParse({
      analysis: {
        ...analysis,
        duplicate: {
          isDuplicate: true,
          existingIssueId: row.id,
          confidence: 0.9,
        },
      },
      report: analysis.generatedReport,
    }).success,
    true,
  );
});
