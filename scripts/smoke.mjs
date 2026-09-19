import assert from "node:assert/strict";

// Run against a local server only. Persistence is Supabase-backed now, so this
// writes real rows and deletes the ones it created before exiting.
const base = process.env.STREETWISE_TEST_URL || "http://localhost:3000";
const url = new URL(base);
assert.ok(
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
  "Smoke checks must target a local server.",
);
try {
  process.loadEnvFile(".env.local");
} catch {
  // Falls back to whatever is already exported; the checks below report it.
}
let checks = 0;
const createdIds = [];
async function request(
  path,
  expected = 200,
  body,
  method = body === undefined ? "GET" : "POST",
  mode = "demo",
) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  if (expected < 400) assert.equal(data.meta.mode, mode);
  else assert.equal(typeof data.error.code, "string");
  checks++;
  return data.data;
}
const live = (path, expected, body, method) =>
  request(path, expected, body, method, "live");

async function cleanup() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || createdIds.length === 0) return;
  await fetch(
    `${SUPABASE_URL}/rest/v1/issues?id=in.(${createdIds.join(",")})`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      },
    },
  );
}

const issues = await live("/api/issues");
assert.ok(issues.length >= 3);
const first = issues[0];
const input = {
  mode: "demo",
  demoIssueType: "pothole",
  location: { lat: 37.394, lng: -122.081 },
};
const analysis = await request("/api/issues/analyze", 200, input);
// Everything below acts on this issue rather than on existing rows, so a run
// never mutates data someone else is looking at.
const created = await live("/api/issues", 201, {
  analysis,
  report: { ...analysis.generatedReport, title: "HTTP smoke sample" },
});
createdIds.push(created.id);
const confirmed = await live(`/api/issues/${created.id}/confirm`, 200, {
  kind: "resolved",
});
assert.equal(confirmed.community.resolved, created.community.resolved + 1);
assert.deepEqual(confirmed.submission, created.submission);
assert.equal(confirmed.status, created.status);
const submitted = await request(`/api/issues/${created.id}/submit`, 200, {
  mode: "demo",
  reviewed: true,
});
assert.equal(submitted.submittedToGovernment, false);
assert.equal(submitted.status, "prepared");
const stored = await live(`/api/issues/${created.id}`);
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
// Reaching this point means Supabase is configured: the first check would
// have failed with 503 otherwise, since persistence has no fallback.
const slot = await live("/api/issues/upload", 200, {
  contentType: "image/jpeg",
  sizeBytes: 12345,
});
assert.ok(slot.storagePath.startsWith("pending/"));
assert.ok(slot.uploadUrl.startsWith("https://"));
await request("/api/issues/upload", 400, {
  contentType: "application/pdf",
  sizeBytes: 12345,
});
await request("/api/issues/analyze", 501, {
  mode: "live",
  storagePath: "pending/example.jpg",
  location: input.location,
});
// A path the server never issued cannot be attached to a new issue.
await request("/api/issues", 400, {
  analysis: { ...analysis, imagePath: "pending/not-issued-by-this-server.jpg" },
  report: analysis.generatedReport,
});
await cleanup();
console.log(
  `Passed ${checks} HTTP checks: live persistence, community isolation, validation, missing issues, evidence ownership, and submission boundary.`,
);
