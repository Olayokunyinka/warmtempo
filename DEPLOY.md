# WarmTempo site: build and deploy

Zero-dependency static site (plain HTML/CSS/JS) + one Cloudflare Pages Function for the form.

- Build: `node build.mjs` -> `dist/`   (Node 18+; no npm install needed)
- Content lives in `src/pages/*.html`, shared parts in `src/partials/`, facts in `src/site.json`
- Form backend: `functions/api/register.js`; database schema: `migrations/0001_init.sql`
- Tests: `node scripts/test-register.mjs` (form function, offline)

## 1. Cloudflare Pages
Workers & Pages -> Create -> Pages -> Connect to Git -> pick this repo.
- Framework preset: None
- Build command: `node build.mjs`
- Build output directory: `dist`
- Environment variable (build): `NODE_VERSION` = `22`
- Optional (build): `TURNSTILE_SITE_KEY` (turns on the bot check; see step 4)
- Hold the legal pages out of Google until you approve them: add build variable `HOLD_LEGAL` = `1`, remove it when approved.

## 2. Database (D1, free)
ALREADY DONE (2026-11-11): database `warmtempo-leads` (id 028d7a6d-fff3-48bb-a435-aa83a9146b34, region WEUR) exists with the schema applied. Skip to the binding step below.

Storage & Databases -> D1 -> Create database `warmtempo-leads`. Open it -> Console -> paste the contents of `migrations/0001_init.sql` -> Execute.
Pages project -> Settings -> Bindings -> Add -> D1 database -> variable name `DB` -> select `warmtempo-leads` (Production and Preview).
View leads any time: D1 -> warmtempo-leads -> Console -> `SELECT * FROM leads ORDER BY id DESC;`

## 3. Email (Resend)
Pages project -> Settings -> Variables and Secrets (Production):
- `RESEND_API_KEY` (secret): Resend -> API Keys -> create with "Sending access" for send.warmtempo.com
- `FROM_EMAIL` = `WarmTempo <hello@send.warmtempo.com>`
- `REPLY_TO` = `hello@warmtempo.com`
- `NOTIFY_EMAIL` = where new-registration alerts should go
- `IP_SALT` (secret) = any long random string
Receiving mail at hello@warmtempo.com: Cloudflare -> warmtempo.com -> Email -> Email Routing -> create address hello@ -> forward to your inbox.

## 4. Bot check (optional but recommended)
Cloudflare -> Turnstile -> Add site (warmtempo.com) -> copy Site key (build variable `TURNSTILE_SITE_KEY`) and Secret key (runtime secret `TURNSTILE_SECRET`). Redeploy.

## 5. Domain
Pages project -> Custom domains -> add `warmtempo.com` (apex). Then redirect www: Cloudflare -> Rules -> Redirect Rules -> hostname equals www.warmtempo.com -> dynamic redirect to `concat("https://warmtempo.com", http.request.uri.path)` status 301. Make sure a proxied DNS record exists for `www`. SSL/TLS mode: Full (strict). Turn on Always Use HTTPS.

## 6. After launch
- Google Search Console: add `https://warmtempo.com` as a URL-prefix property, submit `/sitemap.xml`. Bing Webmaster Tools: import from Search Console.
- Google Analytics: GA4 property `G-EW3BEJ1QB8` uses Consent Mode: the tag loads for everyone (so Google can detect it) but sets no cookies until a visitor clicks Accept. Check Reports -> Realtime after visiting the site.
- Verify: `curl -s https://warmtempo.com/ | head`, https://search.google.com/test/rich-results, https://validator.schema.org
- Test the form once with your own email and confirm: row in D1, acknowledgement email, notification email.
