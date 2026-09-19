// Interactive cross-browser email-return probe. No email is sent. Creates one
// disposable Auth user and keeps its tokens only in memory until cleanup.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const origin = process.argv[2] || 'http://localhost:3102';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const email = `email-return-${randomUUID()}@example.test`;
const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
if (link.error) throw link.error;
const verified = await admin.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'email' });
if (verified.error || !verified.data.session) throw verified.error || new Error('Missing test session');
let session = verified.data.session;
const server = http.createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'POST' && request.url === '/launch' && session) {
    const hash = new URLSearchParams({ access_token: session.access_token, refresh_token: session.refresh_token, type: 'signup' });
    response.writeHead(302, { Location: `${origin}/#${hash}` });
    response.end(); session = null; return;
  }
  response.setHeader('Content-Type', 'text/html');
  response.end('<title>Streetwise email return test</title><h1>Email verification return</h1><p>This disposable test models opening a verified email in a browser that never requested it.</p><form method="post" action="/launch"><button>Open test email verification result</button></form>');
});
server.listen(43190, '127.0.0.1', () => console.log('Cross-browser email-return fixture ready at http://127.0.0.1:43190'));
process.on('SIGINT', async () => {
  server.close();
  const removed = await admin.auth.admin.deleteUser(link.data.user.id);
  console.log(removed.error ? 'Test user cleanup failed' : 'Disposable email-return user removed.');
  process.exit(removed.error ? 1 : 0);
});
