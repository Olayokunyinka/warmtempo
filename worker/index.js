// Cloudflare Worker entry: serves the static site from ./dist (ASSETS binding) and handles POST /api/register.
import { onRequestPost } from '../functions/api/register.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/register') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST', 'cache-control': 'no-store' } });
      return onRequestPost({ request, env, waitUntil: (p) => ctx.waitUntil(p) });
    }
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
    return env.ASSETS.fetch(request);
  },
};
