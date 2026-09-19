import assert from "node:assert/strict";

// Run against a local demo server only. This creates one in-memory sample issue.
const base = process.env.STREETWISE_TEST_URL || "http://localhost:3000";
const url = new URL(base);
assert.ok(
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
  "Smoke checks must target a local server.",
);
let checks = 0;
async function request(
  path,
  expected = 200,
  body,
  method = body === undefined ? "GET" : "POST",
) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  if (expected < 400) assert.equal(data.meta.mode, "demo");
  else assert.equal(typeof data.error.code, "string");
  checks++;
  return data.data;
}

const issues = await request("/api/issues");
assert.ok(issues.length >= 3);
const first = issues[0];
const confirmed = await request(`/api/issues/${first.id}/confirm`, 200, {
  kind: "resolved",
});
assert.equal(confirmed.community.resolved, first.community.resolved + 1);
assert.deepEqual(confirmed.submission, first.submission);
assert.equal(confirmed.status, first.status);
const input = {
  mode: "demo",
  demoIssueType: "pothole",
  location: { lat: 37.394, lng: -122.081 },
};
const analysis = await request("/api/issues/analyze", 200, input);
const created = await request("/api/issues", 201, {
  analysis,
  report: { ...analysis.generatedReport, title: "HTTP smoke sample" },
});
const submitted = await request(`/api/issues/${created.id}/submit`, 200, {
  mode: "demo",
  reviewed: true,
});
assert.equal(submitted.submittedToGovernment, false);
assert.equal(submitted.status, "prepared");
const stored = await request(`/api/issues/${created.id}`);
assert.equal(stored.submission.status, "not_submitted");
await request(`/api/issues/${created.id}/submit`, 400, {
  mode: "demo",
  reviewed: false,
});
await request(`/api/issues/${created.id}/submit`, 400, {
  mode: "live",
  reviewed: true,
});
await request(`/api/issues/${created.id}/confirm`, 400, { kind: "submitted" });
await request("/api/issues/analyze", 400, {
  ...input,
  location: { lat: 91, lng: 0 },
});
await request("/api/issues/not-a-uuid", 400);
await request("/api/issues/00000000-0000-4000-8000-000000000099", 404);
await request("/api/issues", 409, {
  analysis: {
    ...analysis,
    duplicate: {
      isDuplicate: true,
      existingIssueId: first.id,
      confidence: 0.9,
    },
  },
  report: analysis.generatedReport,
});
const badJson = await fetch(`${base}/api/issues/analyze`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{",
});
assert.equal(badJson.status, 400);
checks++;
const badType = await fetch(`${base}/api/issues/analyze`, {
  method: "POST",
  headers: { "Content-Type": "text/plain" },
  body: "hello",
});
assert.equal(badType.status, 415);
checks++;
// Live upload: 200 with real signed-URL data if this machine has Supabase
// env vars configured, otherwise 503. Both are valid depending on the runner.
const uploadResponse = await fetch(`${base}/api/issues/upload`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contentType: "image/jpeg", sizeBytes: 12345 }),
});
const uploadBody = await uploadResponse.json();
assert.ok(
  [200, 503].includes(uploadResponse.status),
  JSON.stringify(uploadBody),
);
if (uploadResponse.status === 200) {
  assert.equal(uploadBody.meta.mode, "live");
  assert.ok(uploadBody.data.storagePath.startsWith("pending/"));
  assert.ok(uploadBody.data.uploadUrl.startsWith("https://"));
} else {
  assert.equal(uploadBody.error.code, "SERVICE_NOT_CONFIGURED");
}
checks++;
await request(`/api/issues/upload`, 400, {
  contentType: "application/pdf",
  sizeBytes: 12345,
});
await request(`/api/issues/analyze`, 501, {
  mode: "live",
  storagePath: "pending/example.jpg",
  location: input.location,
});
console.log(
  `Passed ${checks} HTTP checks: demo flow, community isolation, validation, missing issues, and submission boundary.`,
);
