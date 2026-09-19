import test from "node:test";
import assert from "node:assert/strict";
import { reportActionSchema, newLiveReportSchema } from "../src/schemas/live";
import { isPortalUrl, canTakeOver, CALTRANS_TYPES } from "../src/lib/submission/portals";

test("final submission requires both explicit confirmations", () => {
  for (const body of [{ action: "submit" }, { action: "submit", confirmedRealReport: true }, { action: "submit", confirmedRealReport: false, confirmedReviewedForm: true }]) {
    assert.equal(reportActionSchema.safeParse(body).success, false);
  }
  assert.equal(reportActionSchema.safeParse({ action: "submit", confirmedRealReport: true, confirmedReviewedForm: true }).success, true);
});
test("a new task cannot smuggle analysis, owner identity or submission status", () => {
  const valid = { id: "20000000-0000-4000-8000-000000000001", storagePath: "evidence/photo.jpg", location: { lat: 37.39, lng: -122.08 } };
  assert.equal(newLiveReportSchema.safeParse(valid).success, true);
  for (const key of ["owner_id", "analysis", "stage"]) assert.equal(newLiveReportSchema.safeParse({ ...valid, [key]: "forged" }).success, false);
});
test("portal allowlist rejects lookalikes, credentials and insecure schemes", () => {
  assert.equal(isPortalUrl("caltrans", "https://csr.dot.ca.gov/"), true);
  for (const url of ["http://csr.dot.ca.gov/", "https://csr.dot.ca.gov.example.com/", "https://name@csr.dot.ca.gov/", "javascript:alert(1)"]) assert.equal(isPortalUrl("caltrans", url), false);
  assert.equal(isPortalUrl("santa_clara_county", "https://santaclara.maintstar.co/portal/"), true);
  assert.equal(isPortalUrl("mountain_view", "https://santaclara.maintstar.co/portal/"), false);
  assert.equal(CALTRANS_TYPES.traffic_sign, undefined, "traffic signs must not become traffic signal requests");
});
test("takeover requires an inactive worker and a permitted state", () => {
  const active = new Date(Date.now() + 60000).toISOString();
  assert.equal(canTakeOver({ stage: "paused", lease_until: active }), false);
  assert.equal(canTakeOver({ stage: "paused", lease_until: null }), true);
  assert.equal(canTakeOver({ stage: "submitting", lease_until: null }), false);
  assert.equal(canTakeOver({ stage: "uncertain", lease_until: null }), true);
});

test('email return recognizes actual session fragments and rejects incomplete ones', async () => {
  const { parseEmailReturn } = await import('../src/lib/client/auth-return');
  assert.deepEqual(parseEmailReturn('#access_token=access&refresh_token=refresh&type=signup'), { kind: 'session', accessToken: 'access', refreshToken: 'refresh' });
  assert.deepEqual(parseEmailReturn('#error=access_denied&error_code=otp_expired'), { kind: 'error' });
  assert.deepEqual(parseEmailReturn('#access_token=access'), { kind: 'error' });
  assert.equal(parseEmailReturn('#main'), null);
});
