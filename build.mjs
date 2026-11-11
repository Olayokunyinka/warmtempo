// Zero-dependency static site builder. Usage: node build.mjs  ->  ./dist
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.dirname(new URL(import.meta.url).pathname);
const R = (...p) => path.join(root, ...p);
const site = JSON.parse(fs.readFileSync(R('src/site.json'), 'utf8'));
const dist = R('dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });

const read = (f) => fs.readFileSync(f, 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const year = new Date().getFullYear();
const a = site.address;

// ---- assets (content-hashed) ----
const minCss = (c) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{};:,>])\s*/g, '$1').replace(/;}/g, '}').replace(/\n+/g, '').trim();
const css = minCss(read(R('src/css/site.css')));
const js = read(R('src/js/site.js')).replace('__GA4__', site.ga4);
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const cssFile = `site.${hash(css)}.css`, jsFile = `site.${hash(js)}.js`;
fs.writeFileSync(path.join(dist, 'assets', cssFile), css);
fs.writeFileSync(path.join(dist, 'assets', jsFile), js);

// ---- template vars ----
const turnstileKey = process.env.TURNSTILE_SITE_KEY || '';
const vars = {
  url: site.url, legalName: site.legalName, email: site.email, handle: site.handle,
  street: a.street, city: a.city, region: a.region, postal: a.postal, countryName: a.countryName,
  year, cssFile, jsFile, ga4: site.ga4,
  addressLine: `${a.street}, ${a.city}, ${a.region} ${a.postal}, ${a.countryName}`,
  socialLinks: site.socials.map((s) => `<li><a href="${esc(s.url)}" rel="me noopener" target="_blank">${esc(s.name)}<span class="sr"> (opens in a new tab)</span></a></li>`).join(''),
  turnstile: turnstileKey ? `<div class="cf-turnstile" data-sitekey="${esc(turnstileKey)}" data-appearance="interaction-only"></div>` : '',
};
const partial = (n) => read(R('src/partials', n + '.html'));
function render(tpl, v) {
  let out = tpl, guard = 0;
  while (/\{\{>[\w-]+\}\}/.test(out) && guard++ < 6) out = out.replace(/\{\{>([\w-]+)\}\}/g, (_, n) => partial(n));
  return out.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in v ? String(v[k]) : m));
}

// ---- structured data ----
// Rules: every property must match visible page content; no prices, ratings, reviews or offers (none are published).
const orgId = `${site.url}/#organization`;
const websiteId = `${site.url}/#website`;
const org = {
  '@type': 'Organization', '@id': orgId, name: site.name, legalName: site.legalName, url: site.url + '/',
  logo: { '@type': 'ImageObject', '@id': `${site.url}/#logo`, url: `${site.url}/img/icon-512.png`, contentUrl: `${site.url}/img/icon-512.png`, width: 512, height: 512, caption: 'WarmTempo Ribbon W logo' },
  image: { '@id': `${site.url}/#logo` },
  description: `${site.name} is ${site.descriptor.charAt(0).toLowerCase() + site.descriptor.slice(1).replace(/\.$/, '')} It helps creators turn ideas, stories and scripts into finished videos through a simpler, more connected production process, and is currently collecting interest in managed video production.`,
  slogan: site.tagline, email: site.email,
  brand: { '@type': 'Brand', name: site.name, slogan: site.tagline, logo: { '@id': `${site.url}/#logo` } },
  knowsAbout: ['Video production', 'Script development', 'Voiceover', 'Scene planning and visuals', 'Video assembly and export', 'Faceless video content', 'Short-form video'],
  audience: { '@type': 'Audience', audienceType: 'Video creators: faceless YouTube creators, short-form storytellers, and creators who want production support' },
  areaServed: 'Worldwide',
  address: { '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.city, addressRegion: a.region, postalCode: a.postal, addressCountry: a.country },
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: site.email, availableLanguage: 'English' },
  sameAs: site.socials.map((s) => s.url),
};
const webSite = { '@type': 'WebSite', '@id': websiteId, url: site.url + '/', name: site.name, description: site.tagline + ' ' + site.descriptor, inLanguage: 'en', publisher: { '@id': orgId } };
const service = {
  '@type': 'Service', '@id': `${site.url}/#service`, name: 'Managed video production', serviceType: 'Managed video production for creators',
  description: 'The WarmTempo team uses its platform to produce agreed videos and assets for creators, from idea or script to voiceover, scene visuals and video assembly. Currently available as a managed service only; pricing, formats, turnaround and availability are agreed per project. Guided self-service access is not available yet.',
  provider: { '@id': orgId }, areaServed: 'Worldwide', audience: org.audience, url: site.url + '/#how-it-works',
};
const hero = { '@type': 'ImageObject', '@id': `${site.url}/#hero-image`, url: `${site.url}/img/og-warmtempo.jpg`, contentUrl: `${site.url}/img/og-warmtempo.jpg`, width: 1200, height: 630, caption: 'Tempo, the WarmTempo fox mascot, beside the Ribbon W logo and the tagline Keep stories moving.' };
const crumbs = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) });
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
// FAQ is read from the page itself so markup can never drift from visible text
const decode = (t) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
function faqFrom(html) {
  const out = []; const re = /<summary>([\s\S]*?)<\/summary>\s*<div class="ans"><p>([\s\S]*?)<\/p><\/div>/g; let m;
  while ((m = re.exec(html))) out.push({ '@type': 'Question', name: decode(m[1]), acceptedAnswer: { '@type': 'Answer', text: decode(m[2]) } });
  return out;
}
const subPage = (p, type = 'WebPage') => [{ '@type': type, '@id': `${site.url}${p.path}#webpage`, url: site.url + p.path, name: p.title, description: p.description, isPartOf: { '@id': websiteId }, about: { '@id': orgId }, publisher: { '@id': orgId }, inLanguage: 'en', dateModified: p.updated, breadcrumb: { '@id': `${site.url}${p.path}#breadcrumb` } },
  { ...crumbs([['Home', site.url + '/'], [p.title.replace(/ \| WarmTempo$/, ''), site.url + p.path]]), '@id': `${site.url}${p.path}#breadcrumb` }];

// ---- pages ----
const pages = [
  { path: '/', file: 'home', title: 'WarmTempo | Managed video production for creators', description: 'Register your interest in managed video production from WarmTempo, from idea or script to narration, scene visuals and video assembly.', og: ['WarmTempo — Keep stories moving.', 'Now collecting interest in managed video production for creators.'], graph: 'HOME', updated: '2026-11-11', priority: '1.0' },
  { path: '/contact', file: 'contact', title: 'Contact WarmTempo', description: 'How to contact WarmTempo: email, registered address and where to register your interest in managed video production.', updated: '2026-11-11', priority: '0.5', graph: 'CONTACT' },
  { path: '/privacy', file: 'privacy', title: 'Privacy Policy | WarmTempo', description: 'How WarmTempo, operated by Lucalvry LLC, collects, uses and protects personal information.', updated: '2026-11-11', priority: '0.3', noindex: !!process.env.HOLD_LEGAL, graph: 'SUB' },
  { path: '/terms', file: 'terms', title: 'Terms of Use | WarmTempo', description: 'The terms that apply to using the WarmTempo website and registering your interest.', updated: '2026-11-11', priority: '0.3', noindex: !!process.env.HOLD_LEGAL, graph: 'SUB' },
  { path: '/thanks', file: 'thanks', title: 'Thank you | WarmTempo', description: 'Your WarmTempo registration has been received.', noindex: true, nositemap: true },
];
const fourOhFour = { path: '/404', file: '404', title: 'Page not found | WarmTempo', description: 'This page could not be found.', noindex: true, nositemap: true, out: '404.html' };

function graphFor(p, body) {
  if (p.graph === 'HOME') {
    const faq = faqFrom(body);
    return [org, webSite, service, hero,
      { '@type': 'WebPage', '@id': `${site.url}/#webpage`, url: site.url + '/', name: p.title, description: p.description, isPartOf: { '@id': websiteId }, about: { '@id': orgId }, publisher: { '@id': orgId }, primaryImageOfPage: { '@id': `${site.url}/#hero-image` }, mainEntity: { '@id': `${site.url}/#service` }, inLanguage: 'en', dateModified: p.updated },
      ...(faq.length ? [{ '@type': 'FAQPage', '@id': `${site.url}/#faq-page`, url: site.url + '/#faq', name: 'WarmTempo frequently asked questions', isPartOf: { '@id': `${site.url}/#webpage` }, mainEntity: faq }] : [])];
  }
  if (p.graph === 'CONTACT') { const g = subPage(p, 'ContactPage'); g[0].mainEntity = { '@id': orgId }; return [org, webSite, ...g]; }
  return [org, webSite, ...subPage(p)];
}

function build(p) {
  const pageVars = { ...vars };
  const body = render(read(R('src/pages', p.file + '.html')), pageVars);
  const canonical = p.path === '/' ? site.url + '/' : site.url + p.path;
  const v = {
    ...vars, title: esc(p.title), description: esc(p.description), canonical,
    robots: p.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1',
    ogTitle: esc(p.og ? p.og[0] : p.title), ogDescription: esc(p.og ? p.og[1] : p.description),
    jsonld: p.graph ? ld({ '@context': 'https://schema.org', '@graph': graphFor(p, body) }) : '', body,
  };
  const html = render(partial('layout'), v).replace(/\n{3,}/g, '\n\n');
  const out = p.out ? path.join(dist, p.out) : p.path === '/' ? path.join(dist, 'index.html') : path.join(dist, p.path, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}
const exists = (p) => fs.existsSync(R('src/pages', p.file + '.html'));
[...pages, fourOhFour].forEach((p) => { if (!exists(p)) { console.warn('skip (missing source):', p.file); return; } build(p); });

// ---- copy public/ ----
function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, e.name), d = path.join(to, e.name);
    if (e.isDirectory()) copy(s, d); else fs.copyFileSync(s, d);
  }
}
copy(R('public'), dist);

// ---- sitemap ----
const urls = pages.filter((p) => !p.nositemap && !p.noindex && exists(p));
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((p) => `  <url><loc>${p.path === '/' ? site.url + '/' : site.url + p.path}</loc><lastmod>${p.updated}</lastmod></url>`).join('\n') + `\n</urlset>\n`);

console.log(`built ${urls.length} indexable pages -> dist/ (${cssFile}, ${jsFile})`);
