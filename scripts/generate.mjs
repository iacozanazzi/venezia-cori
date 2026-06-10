/* ════════════════════════════════════════════════════════════════════
   Venezia Cori — generatore di pagine statiche per SEO / GEO
   ────────────────────────────────────────────────────────────────────
   La SPA (index.html) resta l'esperienza principale. Questo script crea,
   ACCANTO ad essa, pagine statiche leggibili dai crawler che NON eseguono
   JavaScript (Googlebot in modalità rapida, GPTBot, ClaudeBot, Perplexity…):

     /coro/<slug>      → una pagina per ogni coro, con testo completo
     /cori             → indice di tutti i cori (hub crawlabile)
     /sitemap.xml      → rigenerata con tutti gli URL
     /llms.txt         → riepilogo del sito per i modelli AI

   Niente dipendenze: usa solo fetch nativo di Node (≥18) e fs.
   Legge URL e chiave anon da js/supabase-config.js (unica fonte di verità).
   FAIL-SAFE: se Supabase non risponde, NON tocca i file e termina con 0,
   così un eventuale build su Vercel non si rompe mai.

   Uso:  node scripts/generate.mjs
   ════════════════════════════════════════════════════════════════════ */

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://venezia-cori.vercel.app';
const NOW  = new Date().toISOString().slice(0, 10);

/* ── Config Supabase: estratta da js/supabase-config.js ── */
async function readConfig() {
  const src = await readFile(join(ROOT, 'js/supabase-config.js'), 'utf8');
  const url = src.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/)?.[1];
  const key = src.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!url || !key || !url.startsWith('http') || key.startsWith('INCOLLA')) {
    throw new Error('Supabase non configurato in js/supabase-config.js');
  }
  return { url, key };
}

/* ── Utils ── */
const CAT_LABEL = {
  classico: 'Classico', incoraggiamento: 'Incoraggiamento',
  curva: 'Curva', sfotto: 'Sfottò', derby: 'Derby'
};
const CAT_DESC = {
  classico: 'storico', incoraggiamento: 'di incoraggiamento',
  curva: 'da curva', sfotto: 'di sfottò', derby: 'da derby'
};
const PLAT = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram' };

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // togli accenti
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'coro';
}

function metaDesc(testo) {
  const flat = String(testo).replace(/\s+/g, ' ').trim();
  return flat.length > 155 ? flat.slice(0, 152).trimEnd() + '…' : flat;
}

function contextSentence(c) {
  const base = `«${c.titolo}» è un coro ${CAT_DESC[c.categoria] || ''} della curva arancioneroverde del Venezia FC`.replace(/\s+/g, ' ').trim();
  const vs = c.avversario ? `, cantato nelle sfide contro il ${c.avversario}` : '';
  return `${base}${vs}. Qui trovi il testo completo per cantarlo allo stadio.`;
}

function featuredMedia(c) {
  return (c.media || []).filter(m => m.stato === 'approvato' && m.in_evidenza);
}

/* ── Shell HTML comune (head + header + footer) ── */
function head({ title, desc, canonical, jsonld }) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0a0a0a">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${SITE}/assets/og-image.png">
<meta property="og:locale" content="it_IT">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/assets/og-image.png">
<title>${esc(title)}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230a0a0a'/%3E%3Cpolygon points='14,26 46,26 38,58 6,58' fill='%23f47b20'/%3E%3Cpolygon points='52,26 86,26 78,58 44,58' fill='%23157a43'/%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/page.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
<div class="brand-stripe"></div>
<header>
  <div class="header-inner">
    <a href="/" class="logo" aria-label="Venezia Cori — home">
      <svg class="logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <polygon points="6,24 44,24 35,56 -3,56" fill="#f47b20"/>
        <polygon points="52,24 90,24 81,56 43,56" fill="#157a43"/>
        <polygon points="6,64 38,64 31,92 -1,92" fill="#9a8456"/>
        <polygon points="46,64 88,64 81,92 39,92" fill="#9a8456"/>
      </svg>
      <span class="logo-text">VENEZIA <span>CORI</span></span>
    </a>
    <a class="page-nav" href="/cori">Tutti i cori</a>
  </div>
</header>`;
}

const FOOTER = `
<footer>
  <p>Forza Unione<span class="marks"><i class="o"></i><i class="g"></i></span></p>
  <p class="footer-legal">
    <a href="/">Home</a> &nbsp;·&nbsp;
    <a href="/cori">Tutti i cori</a> &nbsp;·&nbsp;
    <a href="/privacy">Privacy &amp; Cookie</a>
  </p>
</footer>
</body>
</html>`;

/* ── Pagina singolo coro ── */
function chantPage(c) {
  const slug = c.slug;
  const canonical = `${SITE}/coro/${slug}`;
  const title = `«${c.titolo}» — Testo del coro del Venezia FC · Venezia Cori`;
  const desc = metaDesc(c.testo);
  const media = featuredMedia(c);

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MusicComposition',
        name: c.titolo,
        inLanguage: 'it',
        genre: 'coro da stadio',
        about: { '@type': 'SportsTeam', name: 'Venezia FC' },
        lyrics: { '@type': 'CreativeWork', text: c.testo },
        url: canonical
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Cori', item: SITE + '/cori' },
          { '@type': 'ListItem', position: 3, name: c.titolo, item: canonical }
        ]
      }
    ]
  };

  const mediaHTML = media.length ? `
    <div class="page-media">
      ${media.map(m => `<a class="media-btn ${m.piattaforma}" href="${esc(m.url)}" target="_blank" rel="noopener" title="Ascolta su ${PLAT[m.piattaforma] || m.piattaforma}"><span class="media-play" aria-hidden="true">▶</span>${PLAT[m.piattaforma] || m.piattaforma}</a>`).join('')}
    </div>` : '';

  return head({ title, desc, canonical, jsonld }) + `
<main class="page-wrap">
  <nav class="crumbs" aria-label="Percorso"><a href="/">Home</a> › <a href="/cori">Cori</a> › <span>${esc(c.titolo)}</span></nav>
  <article class="page-card" data-cat="${esc(c.categoria)}">
    <div class="page-badges">
      <span class="badge badge-${esc(c.categoria)}">${esc(CAT_LABEL[c.categoria] || c.categoria)}</span>
      ${c.avversario ? `<span class="badge badge-avversario">vs ${esc(c.avversario)}</span>` : ''}
    </div>
    <h1 class="page-title">${esc(c.titolo)}</h1>
    <p class="page-context">${esc(contextSentence(c))}</p>
    <div class="page-lyrics">${esc(c.testo)}</div>
    ${mediaHTML}
    <div class="page-cta">
      <a class="cta-primary" href="/#coro-${c.id}">Apri nell'app interattiva</a>
      <button class="cta-ghost" type="button" data-copy>Copia il testo</button>
      <a class="cta-ghost" href="/cori">Vedi tutti i cori</a>
    </div>
  </article>
  <p class="page-foot-note">Testo riportato dai tifosi a scopo di archivio e condivisione. Forza Unione 🧡🖤💚</p>
</main>
<div class="toast" id="toast" hidden></div>
<script>
  // copia testo: progressivo, nessuna dipendenza
  document.querySelector('[data-copy]')?.addEventListener('click', async () => {
    const t = ${JSON.stringify(c.titolo.toUpperCase() + '\n\n' + c.testo)};
    try { await navigator.clipboard.writeText(t); showToast('Copiato! Ora cantalo a squarciagola 🎤'); }
    catch { showToast('Non riesco a copiare, seleziona il testo a mano.'); }
  });
  let tt; function showToast(m){ const e=document.getElementById('toast'); e.textContent=m; e.hidden=false; e.className='toast show'; clearTimeout(tt); tt=setTimeout(()=>{e.className='toast';e.hidden=true;},2600); }
</script>` + FOOTER;
}

/* ── Indice /cori ── */
function indexPage(chants) {
  const canonical = `${SITE}/cori`;
  const title = 'Tutti i cori del Venezia FC — testi della curva arancioneroverde · Venezia Cori';
  const desc = `Raccolta completa dei ${chants.length} cori del Venezia FC con i testi: classici, da curva, di incoraggiamento, sfottò e da derby. Cerca e canta con la curva.`;

  const byCat = {};
  chants.forEach(c => (byCat[c.categoria] ||= []).push(c));
  const order = ['classico', 'curva', 'incoraggiamento', 'derby', 'sfotto'];

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cori del Venezia FC',
    numberOfItems: chants.length,
    itemListElement: chants.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.titolo, url: `${SITE}/coro/${c.slug}`
    }))
  };

  const sections = order.filter(k => byCat[k]).map(k => `
    <section class="cori-sec">
      <h2 class="cori-sec-title">${esc(CAT_LABEL[k])}</h2>
      <ul class="cori-list">
        ${byCat[k].map(c => `<li><a href="/coro/${c.slug}">${esc(c.titolo)}${c.avversario ? ` <span class="cori-vs">vs ${esc(c.avversario)}</span>` : ''}</a></li>`).join('')}
      </ul>
    </section>`).join('');

  return head({ title, desc, canonical, jsonld }) + `
<main class="page-wrap">
  <nav class="crumbs" aria-label="Percorso"><a href="/">Home</a> › <span>Cori</span></nav>
  <h1 class="page-title">Tutti i cori del Venezia FC</h1>
  <p class="page-context">I testi di tutti i ${chants.length} cori della curva arancioneroverde, divisi per tipo. Apri un coro per leggerne il testo completo, oppure usa la <a href="/">ricerca interattiva</a> per filtrarli e salvare i preferiti.</p>
  ${sections}
</main>` + FOOTER;
}

function sitemap(chants) {
  const urls = [
    { loc: SITE + '/', pri: '1.0', freq: 'weekly' },
    { loc: SITE + '/cori', pri: '0.9', freq: 'weekly' },
    ...chants.map(c => ({ loc: `${SITE}/coro/${c.slug}`, pri: '0.7', freq: 'monthly' })),
    { loc: SITE + '/privacy', pri: '0.2', freq: 'yearly' }
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${NOW}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

function llms(chants) {
  return `# Venezia Cori

> Archivio dei cori del Venezia FC (l'Unione, arancioneroverde): testi completi dei cori della curva, cercabili e filtrabili. Progetto amatoriale dei tifosi, senza pubblicità invasiva.

Il sito raccoglie i cori cantati dalla tifoseria del Venezia FC con il testo integrale, suddivisi in: classici, da curva, di incoraggiamento, sfottò e da derby. Ogni coro ha una pagina dedicata con il testo e, dove disponibile, i link ai video.

## Cori
${chants.map(c => `- [${c.titolo}](${SITE}/coro/${c.slug}): coro ${CAT_DESC[c.categoria] || ''} della curva del Venezia FC${c.avversario ? `, contro il ${c.avversario}` : ''}.`).join('\n')}

## Pagine principali
- [Tutti i cori](${SITE}/cori): indice completo con i testi.
- [Home interattiva](${SITE}/): ricerca, filtri, preferiti e modalità stadio.
`;
}

/* ── Run ── */
async function main() {
  let cfg, chants;
  try {
    cfg = await readConfig();
    const sel = 'id,titolo,testo,categoria,avversario,media(piattaforma,url,stato,in_evidenza)';
    const res = await fetch(`${cfg.url}/rest/v1/chants?select=${encodeURIComponent(sel)}&stato=eq.pubblicato`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
    });
    if (!res.ok) throw new Error(`REST ${res.status}`);
    chants = await res.json();
    if (!Array.isArray(chants) || !chants.length) throw new Error('nessun coro pubblicato');
  } catch (e) {
    console.warn(`[generate] salto la prerenderizzazione: ${e.message}`);
    process.exit(0);   // non rompere mai il deploy
  }

  // slug unici e stabili
  const seen = new Map();
  for (const c of chants) {
    let s = slugify(c.titolo);
    if (seen.has(s)) s = `${s}-${c.id}`;
    seen.set(s, true);
    c.slug = s;
  }
  chants.sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'));

  // pulisci e ricrea /coro (così i cori rimossi non lasciano pagine orfane)
  const coroDir = join(ROOT, 'coro');
  if (existsSync(coroDir)) await rm(coroDir, { recursive: true, force: true });
  await mkdir(coroDir, { recursive: true });

  for (const c of chants) {
    await writeFile(join(coroDir, `${c.slug}.html`), chantPage(c), 'utf8');
  }
  await writeFile(join(ROOT, 'cori.html'), indexPage(chants), 'utf8');
  await writeFile(join(ROOT, 'sitemap.xml'), sitemap(chants), 'utf8');
  await writeFile(join(ROOT, 'llms.txt'), llms(chants), 'utf8');

  console.log(`[generate] ok: ${chants.length} pagine coro + /cori + sitemap + llms.txt`);
}

main();
