import assert from "node:assert/strict";
import test from "node:test";
import {
  actOnSubmission,
  advanceSubmission,
  createSubmission,
} from "../src/lib/demo/workflow";
import { prototypeStateSchema } from "../src/schemas/prototype";
import { distanceMeters, sampleCenter } from "../src/lib/geo/distance";
const create = () =>
  createSubmission("/images/pothole.png", "A raised edge", sampleCenter, 0);
function reviewed() {
  let item = create();
  for (const now of [3500, 7000, 10500]) item = advanceSubmission(item, now);
  return item;
}
test("automatic preparation stops at review even after a long delay", () => {
  const item = reviewed();
  assert.equal(item.stage, "awaiting_review");
  assert.equal(advanceSubmission(item, 100000).stage, "awaiting_review");
  assert.equal(item.receipt, null);
  assert.equal(
    actOnSubmission(create(), {
      type: "approve",
      title: "Test",
      description: "Test",
    }).approved,
    false,
  );
});
test("pausing a send and retrying requires fresh approval", () => {
  const approved = actOnSubmission(
    reviewed(),
    { type: "approve", title: "Reviewed title", description: "Reviewed text" },
    11000,
  );
  const paused = actOnSubmission(approved, { type: "pause" }, 11500);
  assert.equal(advanceSubmission(paused, 50000).stage, "paused");
  assert.equal(actOnSubmission(paused, { type: "retry", reason: " " }), paused);
  const retry = actOnSubmission(
    paused,
    { type: "retry", reason: "Wrong website" },
    12000,
  );
  assert.equal(retry.approved, false);
  const ready = advanceSubmission(retry, 15500);
  assert.equal(ready.stage, "awaiting_review");
  assert.equal(advanceSubmission(ready, 30000).receipt, null);
});
test("manual intervention returns to review and cannot contact an agency", () => {
  const manual = actOnSubmission(reviewed(), { type: "takeover" }, 11000);
  assert.equal(manual.stage, "needs_help");
  const resumed = actOnSubmission(
    manual,
    { type: "resume", reason: "Correct department" },
    12000,
  );
  assert.equal(advanceSubmission(resumed, 15500).stage, "awaiting_review");
  assert.equal(resumed.mode, "demo");
});
test("manual and scheduled checks produce explicitly simulated results", () => {
  let item = actOnSubmission(
    reviewed(),
    { type: "approve", title: "Test", description: "Description" },
    11000,
  );
  item = advanceSubmission(item, 14500);
  assert.match(item.receipt!, /^DEMO-/);
  assert.equal(item.simulatedGovernmentStatus, "submitted");
  item = advanceSubmission(item, 44500);
  assert.equal(item.stage, "tracking");
  item = advanceSubmission(item, 48000);
  assert.equal(item.simulatedGovernmentStatus, "in_progress");
  item = actOnSubmission(item, { type: "track" }, 49000);
  item = advanceSubmission(item, 52500);
  assert.equal(item.stage, "resolved");
  assert.equal(item.simulatedGovernmentStatus, "resolved");
});
test("automatic checks can be disabled and state survives serialization", () => {
  let item = actOnSubmission(
    reviewed(),
    { type: "approve", title: "Test", description: "Description" },
    11000,
  );
  item = advanceSubmission(item, 14500);
  item = actOnSubmission(item, { type: "auto", enabled: false }, 15000);
  assert.equal(advanceSubmission(item, 90000).stage, "submitted");
  const saved = JSON.parse(
    JSON.stringify({ version: 1, submissions: [item], observations: {} }),
  );
  assert.deepEqual(prototypeStateSchema.parse(saved).submissions[0], item);
});
test("distances respond to the selected origin", () => {
  assert.equal(distanceMeters(sampleCenter, sampleCenter), 0);
  const north = { lat: sampleCenter.lat + 0.001, lng: sampleCenter.lng };
  const farther = { lat: sampleCenter.lat + 0.003, lng: sampleCenter.lng };
  assert.ok(
    distanceMeters(sampleCenter, north) < distanceMeters(sampleCenter, farther),
  );
  assert.ok(distanceMeters(farther, north) > distanceMeters(farther, farther));
  assert.ok(Math.abs(distanceMeters(sampleCenter, north) - 111.2) < 1);
});
