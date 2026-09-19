// Creates private, disposable test users/reports; never approves or submits a report.
// Run: node --env-file=.env --env-file=.env.local scripts/live-smoke.mjs http://localhost:3102
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import Browserbase from '@browserbasehq/sdk';
const base = process.argv[2] || process.env.STREETWISE_TEST_URL || 'http://localhost:3000';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const users = [], paths = [], reports = [];
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; console.log('PASS ' + message); };
async function api(path, cookie = '', body) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { origin: base, cookie, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, cookies: response.headers.getSetCookie().map(x => x.split(';')[0]).join('; '), payload: await response.json() };
}
async function user() {
  if (process.env.STREETWISE_TEST_GUEST === '1') {
    const response = await api('/api/auth', '', { action: 'guest' });
    if (response.payload.data?.id) users.push({ id: response.payload.data.id, email: '' });
    check(response.status === 200 && response.cookies.includes('streetwise-access='), 'guest session established without email');
    check(response.payload.data.isAnonymous === true && !response.payload.data.email, 'guest identity does not invent an email');
    const restored = await api('/api/auth', response.cookies);
    check(restored.payload.data.id === response.payload.data.id, 'guest identity survives a fresh request');
    const repeated = await api('/api/auth', response.cookies, { action: 'guest' });
    check(repeated.payload.data.id === response.payload.data.id && !repeated.cookies, 'repeated guest entry preserves the same account');
    return response.cookies;
  }
  const email = `streetwise-integration-${randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  users.push({ id: data.user.id, email });
  const response = await api('/api/auth', '', { action: 'verify', email, token: data.properties.email_otp });
  check(response.status === 200 && response.cookies.includes('streetwise-access='), 'verified email session established');
  return response.cookies;
}
try {
  const [a, b] = [await user(), await user()];
  check(users[0].id !== users[1].id, 'separate clients receive different identities');
  const forbidden = await fetch(base + '/api/auth', { method: 'POST', headers: { origin: 'https://other.example', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'guest' }) });
  check(forbidden.status === 403, 'cross-origin guest creation is rejected');
  check((await api('/api/reports')).status === 401, 'anonymous private report access blocked');
  const image = await readFile(new URL('../public/images/pothole.png', import.meta.url));
  const upload = await api('/api/issues/upload', a, { contentType: 'image/png', sizeBytes: image.length });
  check(upload.status === 200, 'owner-scoped signed upload created');
  const slot = upload.payload.data; paths.push(slot.storagePath);
  const put = await fetch(slot.uploadUrl, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: image });
  check(put.ok, 'private storage upload completed');
  const input = { id: randomUUID(), storagePath: slot.storagePath, location: { lat: 37.3941, lng: -122.0819 }, description: 'Disposable integration fixture. Do not submit.' };
  check((await api('/api/reports', b, input)).status === 400, 'another user cannot claim uploaded evidence');
  reports.push(input.id);
  if (process.env.STREETWISE_TEST_CRON === '1') {
    const { error } = await admin.from('live_reports').insert({ id: input.id, owner_id: users[0].id, storage_path: slot.storagePath, location: input.location, description: input.description });
    if (error) throw error;
    check(true, 'durable task queued without invoking any application worker');
  } else {
    const create = await api('/api/reports', a, input);
    check(create.status === 202, 'durable analysis task created');
  }
  check((await api('/api/reports', a, input)).status === 200, 'duplicate creation returns the existing task');
  check((await api('/api/reports/' + input.id, b)).status === 404, 'another user cannot read the report');
  check((await api('/api/reports/' + input.id + '/browser', b)).status === 404, 'another user cannot read browser session');
  check((await api('/api/reports/' + input.id + '/browser', b, { text: 'must not reach portal' })).status === 404, 'another user cannot control browser input');
  check((await api('/api/reports/' + input.id, b, { action: 'retry' })).status === 404, 'another user cannot control the report');
  check((await api('/api/reports', b)).payload.data.length === 0, 'personal list is isolated');
  let detail;
  for (let i = 0; i < 150; i++) {
    detail = await api('/api/reports/' + input.id, a);
    if (['review', 'failed'].includes(detail.payload.data.report.stage)) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  check(detail.payload.data.report.stage === 'review', 'real AI pipeline reached persisted review: ' + detail.payload.data.report.message);
  check(detail.payload.data.report.analysis.mode === 'live', 'analysis declares live provenance');
  check(!!detail.payload.data.photoUrl, 'only owner detail receives signed photo');
  check((await api('/api/reports/' + input.id, a, { action: 'submit' })).status === 400, 'unconfirmed final submission rejected');
  const publicIssues = await api('/api/issues');
  check(!publicIssues.payload.data.some(x => x.id === detail.payload.data.report.issue_id), 'unapproved private report is not published');
  if (process.env.STREETWISE_TEST_BROWSER === '1') {
    // Private task only; AskMV fills the form and stops for account choice.
    // Never invoke approve or submit.
    const queued = await admin.from('live_reports').update({ stage: 'queued_prepare', authority_id: 'mountain_view', contact: { email: users[0].email, name: '', phone: '' }, next_run_at: new Date().toISOString() }).eq('id', input.id);
    if (queued.error) throw queued.error;
    for (let i = 0; i < 150; i++) {
      detail = await api('/api/reports/' + input.id, a);
      if (['needs_input', 'failed'].includes(detail.payload.data.report.stage) && !detail.payload.data.report.lease_until) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    check(detail.payload.data.report.stage === 'needs_input', 'cloud Browserbase preparation stops for AskMV account choice');
    check((await api('/api/reports/' + input.id + '/browser', a)).payload.data.url?.startsWith('https://'), 'owner receives live Browserbase view');
    check((await api('/api/reports/' + input.id + '/browser', b, { text: 'not sent' })).status === 404, 'another user cannot send portal keyboard input');
    check((await api('/api/reports/' + input.id, b, { action: 'portal_mode', mode: 'anonymous' })).status === 404, 'another user cannot change portal reply mode');
    check((await api('/api/reports/' + input.id, a, { action: 'portal_mode', mode: 'anonymous' })).status === 202, 'owner can explicitly choose anonymous without tracking');
    for (let i = 0; i < 150; i++) {
      detail = await api('/api/reports/' + input.id, a);
      if (['ready', 'needs_input', 'failed'].includes(detail.payload.data.report.stage) && !detail.payload.data.report.lease_until) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    check(detail.payload.data.report.stage === 'ready', 'anonymous AskMV form reaches final review without submitting: ' + detail.payload.data.report.message);
    check(detail.payload.data.report.contact.portalReplyMode === 'anonymous', 'anonymous preference survives worker recovery');
    check((await api('/api/reports/' + input.id, a, { action: 'track' })).status === 409, 'no-response report rejects status tracking');
    check((await api('/api/reports/' + input.id, a, { action: 'pause', reason: 'Integration check complete; do not send a report.' })).status === 202, 'owner can pause browser preparation');
    check((await api('/api/reports/' + input.id, a)).payload.data.report.stage === 'paused', 'pause persists across requests');
  }
  console.log(`Completed ${checks} live integration assertions; ${process.env.STREETWISE_TEST_BROWSER === '1' ? 'form prepared, never submitted' : 'no government portal opened'}.`);
} finally {
  for (const id of reports) {
    const { data } = await admin.from('live_reports').select('lease_until,session_id').eq('id', id).maybeSingle();
    if (data?.lease_until && Date.parse(data.lease_until) > Date.now()) {
      console.error('Test task still running; leave private fixture for inspection.'); process.exitCode = 1; break;
    }
    if (data?.session_id) await new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY }).sessions.update(data.session_id, { projectId: process.env.BROWSERBASE_PROJECT_ID, status: 'REQUEST_RELEASE' });
    const events = await admin.from('report_events').delete().eq('report_id', id); if (events.error) throw events.error;
    const task = await admin.from('live_reports').delete().eq('id', id); if (task.error) throw task.error;
  }
  if (!process.exitCode) {
    if (paths.length) { const removed = await admin.storage.from(process.env.SUPABASE_STORAGE_BUCKET).remove(paths); if (removed.error) throw removed.error; }
    for (const path of paths) { const removed = await admin.from('evidence').delete().eq('storage_path', path); if (removed.error) throw removed.error; }
    for (const u of users) {
      const connections = await admin.from('government_connections').select('context_id').eq('owner_id', u.id);
      if (connections.error) throw connections.error;
      for (const connection of connections.data || []) if (connection.context_id) await new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY }).contexts.delete(connection.context_id);
      for (const key of [`auth:${u.email}`, `upload:${u.id}`, `report:${u.id}`, `action:${u.id}`]) await admin.from('request_limits').delete().eq('key', createHash('sha256').update(key).digest('hex'));
      const deleted = await admin.auth.admin.deleteUser(u.id); if (deleted.error) throw deleted.error;
    }
    console.log('Removed only the test records and uploaded fixture created by this run.');
  }
}
