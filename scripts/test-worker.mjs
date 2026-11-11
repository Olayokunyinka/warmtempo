// Offline test of the Worker router with a fake ASSETS binding. Run: node scripts/test-worker.mjs
import worker from '../worker/index.js';
const env = { ASSETS: { fetch: async (r) => new Response('asset:' + new URL(r.url).pathname) } };
const ctx = { waitUntil() {} };
const call = async (path, method = 'GET') => worker.fetch(new Request('https://warmtempo.com' + path, { method }), env, ctx);
const eq = (a, b, m) => { if (a !== b) { console.error('FAIL', m, a, b); process.exitCode = 1; } else console.log('ok  ', m); };
eq((await call('/')).status, 200, 'home served from assets');
eq(await (await call('/privacy')).text(), 'asset:/privacy', 'static page passes to assets');
eq((await call('/api/register')).status, 405, 'GET /api/register -> 405');
eq((await call('/api/other', 'POST')).status, 404, 'unknown api -> 404');
const r = await worker.fetch(new Request('https://warmtempo.com/api/register', { method: 'POST', body: new FormData(), headers: { accept: 'application/json', origin: 'https://warmtempo.com' } }), env, ctx);
eq(r.status, 400, 'POST empty -> 400 from function'); eq((await r.json()).ok, false, 'JSON error body');
