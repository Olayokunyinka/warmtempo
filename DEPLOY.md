# WarmTempo site: build and deploy

Zero-dependency static site (plain HTML/CSS/JS) + one Cloudflare Worker (static assets + the form endpoint).

- Build: `node build.mjs` -> `dist/`   (Node 18+; no npm install needed)
- Content lives in `src/pages/*.html`, shared parts in `src/partials/`, facts in `src/site.json`
- Form backend: `functions/api/register.js`, wired in by `worker/index.js`; config in `wrangler.jsonc` (assets, D1 binding `DB`); database schema: `migrations/0001_init.sql`
- Tests: `node scripts/test-register.mjs` (form function) and `node scripts/test-worker.mjs` (routing), both offline

## 1. Cloudflare Worker (this is what is live)
The project is a Worker named `warmtempo` connected to this repo (Workers & Pages -> warmtempo -> Settings -> Build).
- Build command: `node build.mjs`
- Deploy command: `npx wrangler deploy`  (reads `wrangler.jsonc`: serves `dist/`, runs `worker/index.js` for `/api/*`, binds D1 as `DB`)
- Build variable: `NODE_VERSION` = `22`. Optional: `TURNSTILE_SITE_KEY`; `HOLD_LEGAL` = `1` keeps /privacy and /terms out of Google until approved.
- Runtime variables below go in Settings -> Variables and Secrets (not Build). `keep_vars` is on, so deploys never wipe them.

## 2. Database (D1, free)
ALREADY DONE (2026-11-11): database `warmtempo-leads` (id 028d7a6d-fff3-48bb-a435-aa83a9146b34, region WEUR) exists with the schema applied. Skip to the binding step below.

Storage & Databases -> D1 -> Create database `warmtempo-leads`. Open it -> Console -> paste the contents of `migrations/0001_init.sql` -> Execute.
The D1 binding `DB` is declared in `wrangler.jsonc`, so it is attached on every deploy (nothing to click).
View leads any time: D1 -> warmtempo-leads -> Console -> `SELECT * FROM leads ORDER BY id DESC;`

## 3. Email (Resend)
Worker `warmtempo` -> Settings -> Variables and Secrets:
- `RESEND_API_KEY` (secret): Resend -> API Keys -> create with "Sending access" for send.warmtempo.com
- `FROM_EMAIL` = `WarmTempo <hello@send.warmtempo.com>`
- `REPLY_TO` = `hello@warmtempo.com`
- `NOTIFY_EMAIL` = where new-registration alerts should go
- `IP_SALT` (secret) = any long random string
Receiving mail at hello@warmtempo.com: Cloudflare -> warmtempo.com -> Email -> Email Routing -> create address hello@ -> forward to your inbox.

## 4. Bot check (optional but recommended)
Cloudflare -> Turnstile -> Add site (warmtempo.com) -> copy Site key (build variable `TURNSTILE_SITE_KEY`) and Secret key (runtime secret `TURNSTILE_SECRET`). Redeploy.

## 5. Domain
Worker `warmtempo` -> Settings -> Domains & Routes -> add `warmtempo.com` (apex). Then redirect www: Cloudflare -> Rules -> Redirect Rules -> hostname equals www.warmtempo.com -> dynamic redirect to `concat("https://warmtempo.com", http.request.uri.path)` status 301. Make sure a proxied DNS record exists for `www`. SSL/TLS mode: Full (strict). Turn on Always Use HTTPS.

## 6. After launch
- Google Search Console: add `https://warmtempo.com` as a URL-prefix property, submit `/sitemap.xml`. Bing Webmaster Tools: import from Search Console.
- Google Analytics: GA4 property `G-EW3BEJ1QB8` uses Consent Mode: the tag loads for everyone (so Google can detect it) but sets no cookies until a visitor clicks Accept. Check Reports -> Realtime after visiting the site.
- Verify: `curl -s https://warmtempo.com/ | head`, https://search.google.com/test/rich-results, https://validator.schema.org
- Test the form once with your own email and confirm: row in D1, acknowledgement email, notification email.
