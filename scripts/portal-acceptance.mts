// Disposable private fixtures only. This probe never clicks a government Submit control.
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import Browserbase from "@browserbasehq/sdk";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import { persistentSession, forgetGovernmentLogin } from "../src/lib/submission/connections";
import { askMvForm, prepareAskMv } from "../src/lib/submission/ask-mv";
import { liveReportSchema } from "../src/schemas/live";
async function main() {
const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
const reportId = randomUUID(), secondId = randomUUID();
let owner = "", path = "", contextId = "";
let stagehand: Stagehand | undefined;
const sessions: string[] = [];
async function closeClient() { if (stagehand) { const rpc = stagehand.rpcClient; await stagehand.close(); rpc?.close(undefined, { closeTransport: true }); stagehand = undefined; } }
try {
  const u = await admin.auth.admin.createUser({ email: `portal-probe-${randomUUID()}@example.test`, email_confirm: true });
  if (u.error) throw u.error;
  owner = u.data.user.id; path = `evidence/${owner}/${randomUUID()}.png`;
  const evidence = await admin.from("evidence").insert({ owner_id: owner, storage_path: path, content_type: "image/png", size_bytes: 100 });
  if (evidence.error) throw evidence.error;
  const inserted = await admin.from("live_reports").insert({ id: reportId, owner_id: owner, storage_path: path,
    location: { lat: 37.3941, lng: -122.0819, address: "500 Castro Street, Mountain View, CA" }, stage: "paused", authority_id: "mountain_view", contact: { email: "probe@example.test", name: "", phone: "" },
    report: { title: "Integration check — do not submit", description: "Private form preparation test. Do not submit this request.", category: "pothole" },
  }).select().single();
  if (inserted.error) throw inserted.error;
  const report = liveReportSchema.parse(inserted.data);
  const first = await persistentSession(report); sessions.push(first.sessionId);
  const connection = await admin.from("government_connections").select("context_id").eq("owner_id",owner).single();
  contextId = connection.data!.context_id;
  const browser = first.browser || await browserbase.connect({ apiKey: process.env.BROWSERBASE_API_KEY!, sessionId: first.sessionId });
  stagehand = await Stagehand.create({ browser, model: { modelName: "openai/gpt-5.4-mini" }, logging: { level: "off" } });
  const page = (await browser.context.activePage())!;
  await page.goto("https://clients.comcate.com/newrequest.php?id=128");
  const png = await readFile("public/images/pothole.png");
  const form = askMvForm(page, () => page.locator('input[name="file1"]').setInputFiles({ name: "private-form-check.png", mimeType: "image/png", buffer: png }));
  const message = await prepareAskMv(form, report, async () => {});
  assert.match(message!, /Sign in/);
  assert.match(await page.locator("#requestTopic").innerText(), /Potholes/);
  assert.match(await page.locator("#mailsent").inputValue(), /Integration check/);
  assert.ok((await form.read('input[name="file1"]'))!.files > 0);
  console.log("PASS official topic, request, location and photo prepared; account handoff preserved");
  const anonymous = await prepareAskMv(form, { ...report, contact: { ...report.contact!, portalReplyMode: "anonymous" } }, async () => {});
  assert.equal(anonymous, null);
  assert.equal((await form.read('input[name="autogen_user"][value="0"]'))?.checked, true);
  assert.equal((await form.read("#sendrequestbutton"))?.disabled, false);
  console.log("PASS explicit anonymous no-response option makes form ready; Submit never clicked");
  const review = await stagehand.extract("Is this form ready for a human to click Submit? Ignore hidden contact/account fields because anonymous no-response is selected. A CAPTCHA is missing only if an actual visible challenge is incomplete. Report up to three real blockers.", z.object({ ready: z.boolean(), missing: z.array(z.string()) }));
  console.log("Read-only form inspection", review.data);
  await assert.rejects(persistentSession({ ...report, id: secondId }), /Another task/);
  console.log("PASS same owner/agency cannot open competing task sessions");
  await browser.context.addCookies([{ name: "streetwise_probe", value: "non-secret-canary", domain: "streetwise-sigma.vercel.app", path: "/", secure: true, httpOnly: true, expires: Math.floor(Date.now()/1000)+600 }]);
  await closeClient();
  await bb.sessions.update(first.sessionId, { projectId: process.env.BROWSERBASE_PROJECT_ID!, status: "REQUEST_RELEASE" });
  for (let i=0;i<20;i++) { const state=await bb.sessions.retrieve(first.sessionId); if(state.status!=="RUNNING" && state.endedAt && Date.now()-Date.parse(state.endedAt)>5000) break; await new Promise(r=>setTimeout(r,1000)); }
  const next = await persistentSession(report); sessions.push(next.sessionId);
  assert.notEqual(first.sessionId,next.sessionId);
  const restored = next.browser || await browserbase.connect({ apiKey: process.env.BROWSERBASE_API_KEY!, sessionId: next.sessionId });
  stagehand = await Stagehand.create({ browser: restored, model: { modelName: "openai/gpt-5.4-mini" }, logging: { level: "off" } });
  const cookies = await restored.context.cookies("https://streetwise-sigma.vercel.app");
  assert.equal(cookies.find(c=>c.name==="streetwise_probe")?.value,"non-secret-canary");
  console.log("PASS HttpOnly cookie persisted into a fresh browser session");
  await closeClient();
  await forgetGovernmentLogin(owner,"mountain_view"); contextId="";
  const forgotten=await admin.from("government_connections").select("context_id,session_id").eq("owner_id",owner).single();
  assert.equal(forgotten.data?.context_id,null); assert.equal(forgotten.data?.session_id,null);
  console.log("PASS clear government login removes saved context and session references");
} finally {
  await closeClient();
  for (const id of sessions) { try { await bb.sessions.update(id,{projectId:process.env.BROWSERBASE_PROJECT_ID!,status:"REQUEST_RELEASE"}); } catch {} }
  if(contextId) await bb.contexts.delete(contextId);
  if(owner) {
    await admin.from("government_connections").delete().eq("owner_id",owner);
    await admin.from("report_events").delete().eq("report_id",reportId);
    await admin.from("live_reports").delete().eq("id",reportId);
    await admin.from("evidence").delete().eq("storage_path",path);
    await admin.auth.admin.deleteUser(owner);
    console.log("Removed only this probe's private fixtures; no government report sent.");
  }
}

}
main().catch(error => { console.error(error instanceof Error ? error.message : "Probe failed"); process.exitCode=1; });
