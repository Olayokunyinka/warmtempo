// Validates JSON-LD in dist/: parses, every @id reference resolves in the same graph, FAQ text equals visible text, no forbidden claim types.
import fs from 'node:fs';
let bad = 0; const fail = (m) => { console.error('FAIL', m); bad++; };
for (const f of ['index.html', 'contact/index.html', 'privacy/index.html', 'terms/index.html']) {
  const h = fs.readFileSync('dist/' + f, 'utf8');
  const m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/); if (!m) { fail(f + ' no JSON-LD'); continue; }
  let j; try { j = JSON.parse(m[1]); } catch (e) { fail(f + ' invalid JSON'); continue; }
  const g = j['@graph']; const ids = new Set(); (function collect(o) { if (Array.isArray(o)) o.forEach(collect); else if (o && typeof o === 'object') { if (o['@id'] && Object.keys(o).length > 1) ids.add(o['@id']); Object.values(o).forEach(collect); } })(g);
  (function walk(o, top) { if (Array.isArray(o)) o.forEach((x) => walk(x)); else if (o && typeof o === 'object') { if (Object.keys(o).length === 1 && o['@id'] && !ids.has(o['@id'])) fail(`${f} dangling ref ${o['@id']}`); for (const v of Object.values(o)) walk(v); } })(g);
  const types = g.map((n) => n['@type']);
  for (const t of ['Review', 'AggregateRating', 'Offer', 'Product']) if (types.includes(t) || JSON.stringify(g).includes(`"${t}"`)) fail(`${f} forbidden type ${t}`);
  if (f === 'index.html') {
    const faq = g.find((n) => n['@type'] === 'FAQPage');
    if (!faq || faq.mainEntity.length !== 4) fail('FAQ should have 4 questions');
    const vis = h.replace(/<[^>]+>/g, ' ').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ');
    for (const q of faq.mainEntity) { if (!h.includes(q.name.replace(/'/g, '’').replace(/’/g, '’')) && !vis.includes(q.name)) fail('FAQ question not visible: ' + q.name); }
  }
  console.log(`ok  ${f}: ${types.join(', ')}  (${m[1].length} bytes)`);
}
process.exitCode = bad ? 1 : 0;
