import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeRequestSchema,
  createIssueRequestSchema,
} from "../src/schemas/analysis";
import { issueSchema } from "../src/schemas/issue";
import { submissionRequestSchema } from "../src/schemas/submission";
import { analyzeDemoIssue } from "../src/lib/demo/analyze";
import { createDemoRepository } from "../src/lib/demo/repository";
import { seedIssues } from "../src/lib/demo/fixtures";
import { prepareDemoSubmission } from "../src/lib/submission/demo";

const input = analyzeRequestSchema.parse({
  mode: "demo",
  demoIssueType: "pothole",
  location: { lat: 37.394, lng: -122.081 },
});

test("fixtures conform and never contain a fictional government receipt", () => {
  assert.equal(issueSchema.array().parse(seedIssues).length, 3);
  for (const issue of seedIssues) {
    assert.equal(issue.submission.status, "not_submitted");
    assert.equal(issue.submission.externalRequestId, null);
  }
});

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
    submissionRequestSchema.safeParse({ mode: "demo", reviewed: false })
      .success,
    false,
  );
  assert.equal(
    submissionRequestSchema.safeParse({ mode: "live", reviewed: true }).success,
    false,
  );
});

test("creation uses reviewed text and does not submit to government", () => {
  const repository = createDemoRepository([]);
  const analysis = analyzeDemoIssue(input);
  const issue = repository.create({
    analysis,
    report: { ...analysis.generatedReport, title: "Reviewed title" },
  });
  assert.equal(issue.report.title, "Reviewed title");
  assert.equal(issue.submission.status, "not_submitted");
  assert.equal(repository.list().length, 1);
});

test("observations change community evidence only and reads cannot mutate storage", () => {
  const repository = createDemoRepository();
  const before = repository.get(seedIssues[0].id);
  repository.confirm(before.id, { kind: "still_there" });
  const after = repository.confirm(before.id, { kind: "resolved" });
  assert.equal(after.community.stillThere, before.community.stillThere + 1);
  assert.equal(after.community.resolved, before.community.resolved + 1);
  assert.deepEqual(after.submission, before.submission);
  assert.equal(after.status, before.status);
  after.report.title = "Injected mutation";
  assert.equal(repository.get(before.id).report.title, before.report.title);
});

test("demo preparation is repeatable and never mutates submission state", () => {
  const repository = createDemoRepository();
  const issue = repository.get(seedIssues[0].id);
  const result = prepareDemoSubmission(issue);
  assert.deepEqual(prepareDemoSubmission(issue), result);
  assert.equal(result.status, "prepared");
  assert.equal(result.submittedToGovernment, false);
  assert.deepEqual(repository.get(issue.id), issue);
});

test("unknown issues, duplicate decisions, and mismatched categories are rejected", () => {
  const repository = createDemoRepository();
  assert.throws(
    () => repository.get("00000000-0000-4000-8000-000000000099"),
    /not found/,
  );
  const analysis = analyzeDemoIssue(input);
  assert.equal(
    createIssueRequestSchema.safeParse({
      analysis,
      report: { ...analysis.generatedReport, category: "trash" },
    }).success,
    false,
  );
  analysis.duplicate = {
    isDuplicate: true,
    existingIssueId: seedIssues[0].id,
    confidence: 0.9,
  };
  assert.throws(
    () => repository.create({ analysis, report: analysis.generatedReport }),
    /existing issue/,
  );
});
