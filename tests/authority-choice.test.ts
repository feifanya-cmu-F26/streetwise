import test from "node:test";
import assert from "node:assert/strict";
import { automaticAuthority, chooseSubmissionAuthority } from "../src/lib/submission/authority-choice";
import { resolveRoadRecords } from "../src/lib/geo/road-authority";
import { reportActionSchema } from "../src/schemas/live";

test("official maintenance records route city departments, county roads and Caltrans", () => {
  for (const owner of ["MountainView", "MountainView_Streets", "MountainView_Traffic", "MountainView_Parks"])
    assert.equal(automaticAuthority(resolveRoadRecords([owner], 0)), "mountain_view");
  assert.equal(automaticAuthority(resolveRoadRecords(["Caltrans"], 0)), "caltrans");
  assert.equal(automaticAuthority(resolveRoadRecords(["SantaClaraCounty"], 1)), "santa_clara_county");
  assert.equal(automaticAuthority(resolveRoadRecords([], 1)), "santa_clara_county");
});

test("unknown, private and conflicting ownership never default to a government portal", () => {
  for (const result of [resolveRoadRecords([], 0), resolveRoadRecords(["Private"], 0), resolveRoadRecords(["MountainView", "Unk"], 0), resolveRoadRecords(["Caltrans"], 1), resolveRoadRecords(["MountainView", "Caltrans"], 0)]) {
    assert.equal(automaticAuthority(result), null);
    assert.equal(chooseSubmissionAuthority(result, {}), null);
  }
});

test("automatic approval uses persisted authority; manual overrides need explicit confirmation", () => {
  const resolution = resolveRoadRecords(["Caltrans"], 0);
  assert.equal(chooseSubmissionAuthority(resolution, {}), "caltrans");
  assert.equal(chooseSubmissionAuthority(resolution, { authorityId: "mountain_view" }), null);
  assert.equal(chooseSubmissionAuthority(resolution, { authorityId: "mountain_view", authorityConfirmed: true }), "mountain_view");
  const approval = { action: "approve", report: { title: "Pothole", description: "Visible road damage", category: "pothole" }, contact: { email: "test@example.test" }, duplicatesReviewed: true, publishConfirmed: true };
  assert.equal(reportActionSchema.safeParse(approval).success, true);
  assert.equal(reportActionSchema.safeParse({ ...approval, analysis: { authority: resolution } }).success, false);
  assert.equal(reportActionSchema.safeParse({ ...approval, authorityId: "arbitrary_url" }).success, false);
});
