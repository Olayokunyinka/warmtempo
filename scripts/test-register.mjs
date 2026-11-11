// Offline test of the form function with a fake D1 and fake Resend. Run: node scripts/test-register.mjs
import { onRequestPost } from '../functions/api/register.js';
const rows = []; const sent = [];
globalThis.fetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return new Response('{"id":"x"}', { status: 200 }); };
const DB = { prepare(sql) { return { bind(...a) { return {
  first: async () => ({ c: sql.includes('ip_hash') ? rows.filter(r => r.ip === a[0]).length : rows.filter(r => r.email === a[0]).length }),
  run: async () => { if (sql.startsWith('INSERT')) { rows.push({ email: a[1], ip: a[13], brief: a[11] }); return { meta: { last_row_id: rows.length } }; } return {}; } }; } }; } };
const env = { DB, RESEND_API_KEY: 'k' };
const pending = [];
const call = async (fields, headers = {}) => {
  const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  const req = new Request('https://warmtempo.com/api/register', { method: 'POST', body: fd, headers: { accept: 'application/json', origin: 'https://warmtempo.com', 'cf-connecting-ip': '1.2.3.4', ...headers } });
  const res = await onRequestPost({ request: req, env, waitUntil: (p) => pending.push(p) }); await Promise.all(pending.splice(0));
  return [res.status, await res.json()];
};
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error('FAIL', m, a, b); process.exitCode = 1; } else console.log('ok  ', m); };
eq((await call({ email: '' }))[0], 400, 'missing email -> 400');
eq((await call({ email: 'bad@x' }))[0], 400, 'bad email -> 400');
eq((await call({ email: 'a@b.co', website: 'spam' }))[1], { ok: true }, 'honeypot fake-success');
eq(rows.length, 0, 'honeypot stores nothing');
eq((await call({ email: 'a@b.co', ts: String(Date.now()) }))[1], { ok: true }, 'too-fast fake-success');
eq(rows.length, 0, 'time trap stores nothing');
const r = await call({ email: 'A@B.CO', firstName: 'Ada', interest: 'Managed video production', brief: '<script>alert(1)</script>', ts: String(Date.now() - 9000) });
eq(r, [200, { ok: true }], 'valid -> 200');
eq(rows[0].email, 'a@b.co', 'email lowercased');
eq(sent.length, 2, 'two emails sent (ack + notify)');
eq(sent[0].body.from, 'WarmTempo <hello@send.warmtempo.com>', 'from on verified subdomain');
eq(sent[1].body.html.includes('<script>'), false, 'notify email escapes HTML');
eq((await call({ email: 'x@y.co' }, { origin: 'https://evil.example' }))[0], 403, 'cross-origin blocked');
for (let i = 0; i < 4; i++) await call({ email: `u${i}@y.co`, ts: String(Date.now() - 9000) });
eq((await call({ email: 'z@y.co', ts: String(Date.now() - 9000) }))[0], 429, 'rate limit per IP');
