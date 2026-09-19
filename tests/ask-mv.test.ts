import test from "node:test";
import assert from "node:assert/strict";
import { prepareAskMv, type AskMvForm, type PortalControl } from "../src/lib/submission/ask-mv";
import type { LiveReport } from "../src/schemas/live";
import { reportActionSchema } from "../src/schemas/live";
import { visiblePhotoPath } from "../src/lib/issues/photo-access";
function fixture(mode?: "account" | "anonymous") {
  const controls = new Map<string, PortalControl>();
  const set = (s: string, patch: Partial<PortalControl> = {}) => controls.set(s, { visible: true, disabled: false, value: "", checked: false, files: 0, ...patch });
  set("#mailsent", { disabled: true }); set("#generic"); set("#sendrequestbutton", { disabled: true });
  const actions: string[] = [];
  const form: AskMvForm = {
    read: async s => controls.get(s) || null,
    click: async s => { actions.push(s);
      assert.notEqual(s, "#sendrequestbutton");
      if (s.includes("updateTopicContent")) set("#mailsent");
      if (s.includes('autogen_user')) { set(s, { checked: true }); set("#sendrequestbutton"); }
    },
    waitEnabled: async () => { assert.equal(controls.get("#mailsent")?.disabled, false); },
    fill: async (s, value) => { assert.equal(controls.get(s)?.disabled, false); set(s, { value }); actions.push(`fill:${s}`); },
    attach: async () => { actions.push("attach"); },
  };
  const report = { checkpoint: 99, report: { title: "Road damage", description: "Observed road damage", category: "pothole" }, location: { lat: 37, lng: -122 }, contact: { portalReplyMode: mode, name: "", email: "test@example.test", phone: "" } } as LiveReport;
  return { controls, set, actions, form, report };
}
test("AskMV selects topic before filling disabled fields, regardless of old checkpoint", async () => {
  const f = fixture();
  assert.match((await prepareAskMv(f.form, f.report, async () => {}))!, /Sign in/);
  assert.deepEqual(f.actions.slice(0,2), ["#accordionTopic_36", 'a[onclick*="updateTopicContent(2643, 11266)"]']);
  assert.equal(f.controls.get("#mailsent")?.value, "Road damage\n\nObserved road damage");
  assert.ok(!f.actions.includes("#tab3"));
});
test("resuming preserves user corrections and attached evidence", async () => {
  const f = fixture(); f.set("#mailsent", { value: "User correction" });
  f.set("#generic", { value: "Corrected address" }); f.set('input[name="file1"]', { files: 1 });
  await prepareAskMv(f.form, f.report, async () => {});
  assert.ok(!f.actions.some(s => s.startsWith("fill:") || s === "attach" || s.includes("accordion")));
});
test("only explicit no-response choice selects anonymous; still never submits", async () => {
  const f = fixture("anonymous");
  assert.equal(await prepareAskMv(f.form, f.report, async () => {}), null);
  assert.ok(f.actions.includes("#tab3")); assert.ok(f.actions.includes('input[name="autogen_user"][value="0"]'));
  assert.ok(!f.actions.includes("#sendrequestbutton"));
});
test("account choice cannot silently retain a previous anonymous selection", async () => {
  const f = fixture("account"); f.set('input[name="autogen_user"][value="0"]', { checked: true }); f.set("#sendrequestbutton");
  assert.match((await prepareAskMv(f.form, f.report, async () => {}))!, /Sign in/);
  assert.ok(f.actions.includes("#tab2"));
});
test("pause interrupts preparation before another action", async () => {
  const f = fixture();
  await assert.rejects(prepareAskMv(f.form, f.report, async () => { throw new Error("paused"); }), /paused/);
  assert.equal(f.actions.length,0);
});
test("portal choice has no final-send authority", () => {
  assert.equal(reportActionSchema.safeParse({ action: "portal_mode", mode: "anonymous" }).success, true);
  assert.equal(reportActionSchema.safeParse({ action: "portal_mode", mode: "anonymous", submit: true }).success, false);
});
test("photos remain private unless owner or explicitly published", () => {
  const photo = { image_path: "private/photo.jpg", owner_id: "alice", photo_public: false };
  assert.equal(visiblePhotoPath(photo), null); assert.equal(visiblePhotoPath(photo, "bob"), null);
  assert.equal(visiblePhotoPath(photo, "alice"), photo.image_path);
  assert.equal(visiblePhotoPath({ ...photo, photo_public: true }), photo.image_path);
  assert.equal(visiblePhotoPath({ image_path: photo.image_path }), null);
});
