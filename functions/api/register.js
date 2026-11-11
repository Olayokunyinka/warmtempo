// Cloudflare Pages Function: POST /api/register
// Bindings / env (set in Cloudflare dashboard, never in the repo):
//   DB                D1 database binding (leads)
//   RESEND_API_KEY    secret
//   FROM_EMAIL        e.g. "WarmTempo <hello@send.warmtempo.com>"  (must be on the verified Resend domain)
//   REPLY_TO          e.g. hello@warmtempo.com
//   NOTIFY_EMAIL      where new-lead alerts go (default hello@warmtempo.com)
//   IP_SALT           secret, any long random string
//   TURNSTILE_SECRET  optional secret (enables bot check when the site key is set at build time)

import { ackEmail, notifyEmail } from '../../lib/emails.js';

const MAX = { firstName: 80, lastName: 80, email: 254, phone: 30, whatsapp: 30, country: 80, interest: 60, platform: 30, type: 30, starting: 30, brief: 1000 };
const ENUM = {
  interest: ['Managed faceless channel', 'Managed video production', 'Using the platform myself', 'One-on-one consultation', 'Learning YouTube automation', 'Not sure yet'],
  platform: ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Multiple', 'Other'],
  type: ['Narrated stories', 'Explainers', 'Educational', 'Other', 'Not sure'],
  starting: ['Idea', 'Title', 'Script', 'Not sure'],
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

function wantsJson(req) { return (req.headers.get('accept') || '').includes('application/json'); }
function reply(req, status, body, location) {
  if (wantsJson(req)) return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  if (location) return new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });
  return new Response(body.error || 'OK', { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function resend(env, payload) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`resend ${r.status} ${(await r.text()).slice(0, 300)}`);
}

export async function onRequestPost({ request, env, waitUntil }) {
  // same-origin only
  const origin = request.headers.get('origin');
  if (origin) { try { if (new URL(origin).host !== new URL(request.url).host) return reply(request, 403, { ok: false, error: 'Forbidden.' }); } catch { return reply(request, 403, { ok: false, error: 'Forbidden.' }); } }

  let fd;
  try { fd = await request.formData(); } catch { return reply(request, 400, { ok: false, error: 'That request could not be read. Please try again.' }, '/#register'); }

  // honeypot: pretend success
  if (clean(fd.get('website'), 200)) return reply(request, 200, { ok: true }, '/thanks');
  // time trap: humans take longer than 2.5s (empty ts allowed for no-JS posts)
  const ts = Number(fd.get('ts')); if (ts && Date.now() - ts < 2500) return reply(request, 200, { ok: true }, '/thanks');

  const ip = request.headers.get('cf-connecting-ip') || '';

  if (env.TURNSTILE_SECRET) {
    const tok = clean(fd.get('cf-turnstile-response'), 2048);
    let ok = false;
    if (tok) {
      const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: tok, remoteip: ip });
      try { ok = (await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })).json()).success === true; } catch {}
    }
    if (!ok) return reply(request, 400, { ok: false, error: 'We couldn’t verify that you’re human. Please try again.' }, '/#register');
  }

  const v = {};
  for (const k of Object.keys(MAX)) v[k] = clean(fd.get(k), MAX[k]);
  v.email = v.email.toLowerCase();
  if (!v.email) return reply(request, 400, { ok: false, error: 'Enter your email address so the team knows where to reach you.' }, '/#register');
  if (!EMAIL_RE.test(v.email)) return reply(request, 400, { ok: false, error: 'Check your email address. It should look like name@example.com.' }, '/#register');
  for (const k of Object.keys(ENUM)) if (v[k] && !ENUM[k].includes(v[k])) v[k] = '';
  const marketing = fd.get('marketing') === 'yes' ? 1 : 0;

  const ipHash = await sha256((env.IP_SALT || '') + ip);
  const now = new Date().toISOString();

  // rate limit: max 5 submissions per IP hash per hour, 3 per email per day
  try {
    const hour = new Date(Date.now() - 3600e3).toISOString(), day = new Date(Date.now() - 86400e3).toISOString();
    const a = await env.DB.prepare('SELECT COUNT(*) c FROM leads WHERE ip_hash = ? AND created_at > ?').bind(ipHash, hour).first();
    const b = await env.DB.prepare('SELECT COUNT(*) c FROM leads WHERE email = ? AND created_at > ?').bind(v.email, day).first();
    if ((a?.c || 0) >= 5 || (b?.c || 0) >= 3) return reply(request, 429, { ok: false, error: 'Too many requests. Please try again later or email hello@warmtempo.com.' }, '/#register');
  } catch (e) { console.error('ratelimit', e); }

  let id;
  try {
    const res = await env.DB.prepare(
      `INSERT INTO leads (created_at,email,first_name,last_name,phone,whatsapp,country,interest,platform,content_type,starting,brief,marketing_opt_in,ip_hash,cf_country,user_agent)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(now, v.email, v.firstName, v.lastName, v.phone, v.whatsapp, v.country, v.interest, v.platform, v.type, v.starting, v.brief, marketing, ipHash, request.cf?.country || '', clean(request.headers.get('user-agent'), 200)).run();
    id = res.meta?.last_row_id;
  } catch (e) {
    console.error('db', e);
    return reply(request, 500, { ok: false, error: 'Something went wrong and your request was not saved. Please try again, or email hello@warmtempo.com.' }, '/#register');
  }

  // emails run after the response so the visitor never waits on them
  const mail = (async () => {
    if (!env.RESEND_API_KEY) { console.error('RESEND_API_KEY missing'); try { await env.DB.prepare('UPDATE leads SET mail_error=? WHERE id=?').bind('RESEND_API_KEY is not set on the Worker', id).run(); } catch {} return; }
    const from = env.FROM_EMAIL || 'WarmTempo <hello@send.warmtempo.com>';
    const replyTo = env.REPLY_TO || 'hello@warmtempo.com';
    const name = v.firstName || 'there';
    let ack = 0, note = 0; const errs = [];
    try {
      const m = ackEmail(v);
      await resend(env, { from, to: [v.email], reply_to: replyTo, subject: m.subject, html: m.html, text: m.text });
      ack = 1;
    } catch (e) { console.error('ack', e); errs.push('ack: ' + String(e && e.message || e).slice(0, 300)); }
    try {
      const m = notifyEmail(v, { id, now, marketing: !!marketing });
      await resend(env, { from, to: [env.NOTIFY_EMAIL || 'hello@warmtempo.com'], reply_to: v.email, subject: m.subject, html: m.html, text: m.text });
      note = 1;
    } catch (e) { console.error('notify', e); errs.push('notify: ' + String(e && e.message || e).slice(0, 300)); }
    try { await env.DB.prepare('UPDATE leads SET ack_sent=?, notify_sent=?, mail_error=? WHERE id=?').bind(ack, note, errs.join(' | ') || null, id).run(); } catch (e) { console.error('flags', e); }
  })();
  waitUntil(mail);

  return reply(request, 200, { ok: true }, '/thanks');
}

export async function onRequest({ request }) {
  return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
}
