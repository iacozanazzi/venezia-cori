/* ════════════════════════════════════════════════════════════════════
   Venezia Cori — sito pubblico
   Dati da Supabase (via VeneziaAPI), con fallback statico in modalità demo.
   ════════════════════════════════════════════════════════════════════ */

/* ── State ── */
let chants       = [];           // cori caricati (pubblicati)
let activeFilter = 'tutti';
let activeSort   = 'popolarita';
let searchQuery  = '';
let favorites    = new Set(JSON.parse(localStorage.getItem('venezia-fav')   || '[]'));
let voted        = new Set(JSON.parse(localStorage.getItem('venezia-voted') || '[]'));
let MAX_SCORE    = 1;

const PLATFORMS = {
  youtube:   { label: 'YouTube',   cls: 'yt' },
  tiktok:    { label: 'TikTok',    cls: 'tk' },
  instagram: { label: 'Instagram', cls: 'ig' }
};

/* ── DOM refs ── */
const grid       = document.getElementById('chants-grid');
const searchEl   = document.getElementById('search');
const clearBtn   = document.querySelector('.search-clear');
const sortEl     = document.getElementById('sort');
const countEl    = document.getElementById('count');
const heroCount  = document.getElementById('hero-count');
const pills      = document.querySelectorAll('.pill');
const proposeBtn = document.getElementById('propose-chant-btn');
const modal      = document.getElementById('modal');
const modalBody  = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const toastEl    = document.getElementById('toast');

/* ── Utils ── */
function saveFavs()  { localStorage.setItem('venezia-fav',   JSON.stringify([...favorites])); }
function saveVoted() { localStorage.setItem('venezia-voted', JSON.stringify([...voted])); }

function voterToken() {
  let t = localStorage.getItem('venezia-voter');
  if (!t) { t = (crypto.randomUUID?.() || String(Date.now() + Math.random())); localStorage.setItem('venezia-voter', t); }
  return t;
}

function score(c) { return (c.popolarita_base || 0) + (c.voti || 0); }

function escape(str) {
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function highlight(text, query) {
  if (!query) return escape(text);
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${safe})`, 'gi');
  return escape(text).replace(re, '<mark>$1</mark>');
}

function categoryLabel(cat) {
  return { classico:'Classico', incoraggiamento:'Incoraggiamento', curva:'Curva', sfotto:'Sfottò', derby:'Derby' }[cat] || cat;
}

function isValidUrl(u) { return /^https?:\/\/.+/i.test(u.trim()); }

let toastTimer;
function toast(msg, kind = 'ok') {
  toastEl.textContent = msg;
  toastEl.className = `toast show ${kind}`;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = 'toast'; toastEl.hidden = true; }, 3200);
}

/* ── Filter & Sort ── */
function filtered() {
  let list = [...chants];

  if (activeFilter === 'preferiti') {
    list = list.filter(c => favorites.has(c.id));
  } else if (activeFilter !== 'tutti') {
    list = list.filter(c => c.categoria === activeFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(c =>
      c.titolo.toLowerCase().includes(q) ||
      c.testo.toLowerCase().includes(q) ||
      (c.avversario && c.avversario.toLowerCase().includes(q))
    );
  }

  if (activeSort === 'popolarita') {
    list.sort((a, b) => score(b) - score(a));
  } else if (activeSort === 'az') {
    list.sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'));
  } else if (activeSort === 'za') {
    list.sort((a, b) => b.titolo.localeCompare(a.titolo, 'it'));
  }

  return list;
}

/* ── Render card ── */
function mediaButtons(chant) {
  if (!chant.media || !chant.media.length) return '';
  const btns = chant.media.map(m => {
    const p = PLATFORMS[m.piattaforma] || { label: m.piattaforma, cls: '' };
    return `<a class="media-btn ${p.cls}" href="${escape(m.url)}" target="_blank" rel="noopener" title="Ascolta su ${p.label}">
      <span class="media-play" aria-hidden="true">▶</span>${p.label}</a>`;
  }).join('');
  return `<div class="card-media">${btns}</div>`;
}

function renderCard(chant, query) {
  const lines   = chant.testo.split('\n');
  const preview = lines.slice(0, 2).join('\n');
  const rest    = lines.slice(2).join('\n');
  const hasMore = lines.length > 2;
  const isFav   = favorites.has(chant.id);
  const hasVoted= voted.has(chant.id);
  const sc      = score(chant);
  const pct     = Math.round((sc / MAX_SCORE) * 100);

  return `
<article class="card" data-id="${chant.id}" data-cat="${chant.categoria}">
  <div class="card-top">
    <div class="card-badges">
      <span class="badge badge-${chant.categoria}">${categoryLabel(chant.categoria)}</span>
      ${chant.avversario ? `<span class="badge badge-avversario">vs ${escape(chant.avversario)}</span>` : ''}
    </div>
    <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${chant.id}" title="${isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}">
      ${isFav ? '★' : '☆'}
    </button>
  </div>

  <h2 class="card-title">${highlight(chant.titolo, query)}</h2>

  <div class="card-lyrics">
    <div class="lyrics-preview">${highlight(preview, query)}</div>
    ${hasMore ? `
    <div class="lyrics-full" id="full-${chant.id}">${highlight(rest, query)}</div>
    <button class="expand-btn" data-id="${chant.id}">
      <span class="expand-icon">▾</span>
      <span class="expand-text">Leggi tutto</span>
    </button>` : ''}
  </div>

  ${mediaButtons(chant)}

  <div class="card-footer">
    <div class="card-actions">
      <button class="vote-btn ${hasVoted ? 'voted' : ''}" data-id="${chant.id}" title="Mi piace questo coro"${VeneziaAPI.demo ? ' disabled' : ''}>
        <span aria-hidden="true">▲</span> <span class="vote-count">${sc}</span>
      </button>
      <button class="suggest-media-btn" data-id="${chant.id}" data-titolo="${escape(chant.titolo)}" title="Proponi un video per questo coro">
        + video
      </button>
    </div>
    <div class="card-score" title="Popolarità">
      <div class="score-bar"><div class="score-fill" style="width:${pct}%"></div></div>
    </div>
  </div>
</article>`;
}

/* ── Render states ── */
function renderLoading() {
  grid.innerHTML = `<div class="state-msg"><div class="spinner" aria-hidden="true"></div><p>Carico i cori…</p></div>`;
}

function renderError() {
  grid.innerHTML = `
<div class="state-msg">
  <h3>Ops, non riesco a caricare i cori</h3>
  <p>Controlla la connessione e riprova.</p>
  <button class="retry-btn" id="retry-btn">Riprova</button>
</div>`;
  document.getElementById('retry-btn')?.addEventListener('click', loadChants);
}

function render() {
  const list = filtered();
  countEl.textContent = list.length === 1 ? '1 coro trovato' : `${list.length} cori trovati`;

  if (list.length === 0) {
    grid.innerHTML = `
<div class="empty-state">
  <svg class="empty-icon" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
  <h3>Nessun coro trovato</h3>
  <p>Prova con un termine diverso o cambia il filtro.</p>
</div>`;
    return;
  }

  grid.innerHTML = list.map(c => renderCard(c, searchQuery)).join('');
  attachCardEvents();
}

/* ── Card Events ── */
function attachCardEvents() {
  grid.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const full = document.getElementById(`full-${id}`);
      const open = full.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.querySelector('.expand-text').textContent = open ? 'Riduci' : 'Leggi tutto';
    });
  });

  grid.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      if (favorites.has(id)) {
        favorites.delete(id);
        btn.textContent = '☆'; btn.classList.remove('active'); btn.title = 'Aggiungi ai preferiti';
      } else {
        favorites.add(id);
        btn.textContent = '★'; btn.classList.add('active'); btn.title = 'Rimuovi dai preferiti';
        btn.style.transform = 'scale(1.4)';
        setTimeout(() => btn.style.transform = '', 200);
      }
      saveFavs();
      if (activeFilter === 'preferiti') render();
    });
  });

  grid.querySelectorAll('.vote-btn').forEach(btn => btn.addEventListener('click', () => handleVote(btn)));
  grid.querySelectorAll('.suggest-media-btn').forEach(btn =>
    btn.addEventListener('click', () => openMediaForm(parseInt(btn.dataset.id, 10), btn.dataset.titolo)));
}

/* ── Voti ── */
async function handleVote(btn) {
  const id = parseInt(btn.dataset.id, 10);
  if (voted.has(id)) { toast('Hai già votato questo coro 🙂'); return; }
  btn.disabled = true;
  try {
    const newCount = await VeneziaAPI.vote(id, voterToken());
    voted.add(id); saveVoted();
    const chant = chants.find(c => c.id === id);
    if (chant) chant.voti = (newCount ?? chant.voti) - (chant.popolarita_base || 0);
    // ricalcola scala e ridisegna (l'ordinamento popolarità può cambiare)
    MAX_SCORE = Math.max(1, ...chants.map(score));
    render();
    toast('Voto registrato! Forza Unione ⚽');
  } catch (e) {
    btn.disabled = false;
    toast('Voto non riuscito, riprova.', 'err');
  }
}

/* ════════════════════════════════════════════════════════════════════
   MODAL + FORM PROPOSTE
   ════════════════════════════════════════════════════════════════════ */
function openModal(html) {
  modalBody.innerHTML = html;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  modalBody.querySelector('input, textarea, select, button')?.focus();
}
function closeModal() {
  modal.hidden = true;
  modalBody.innerHTML = '';
  document.body.style.overflow = '';
}
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

const platformOptions = Object.entries(PLATFORMS)
  .map(([v, p]) => `<option value="${v}">${p.label}</option>`).join('');

const demoNotice = VeneziaAPI.demo
  ? `<p class="form-note warn">⚠ Modalità demo: le proposte saranno attive quando il sito sarà collegato al database.</p>`
  : `<p class="form-note">La tua proposta finirà in moderazione: verrà pubblicata solo dopo l'ok dell'admin. È anonima.</p>`;

/* Form: proponi un coro nuovo */
function openChantForm() {
  openModal(`
    <h2 id="modal-title" class="modal-title">Proponi un coro</h2>
    ${demoNotice}
    <form id="chant-form" class="proposal-form" novalidate>
      <label>Titolo *<input name="titolo" type="text" maxlength="120" required></label>
      <label>Testo del coro *<textarea name="testo" rows="6" required placeholder="Un verso per riga…"></textarea></label>
      <div class="form-row">
        <label>Categoria *
          <select name="categoria" required>
            <option value="classico">Classico</option>
            <option value="incoraggiamento">Incoraggiamento</option>
            <option value="curva">Curva</option>
            <option value="sfotto">Sfottò</option>
            <option value="derby">Derby</option>
          </select>
        </label>
        <label>Avversario (se è uno sfottò)<input name="avversario" type="text" maxlength="60" placeholder="es. Padova"></label>
      </div>
      <fieldset class="form-media">
        <legend>Hai un video? (facoltativo)</legend>
        <div class="form-row">
          <label>Piattaforma<select name="piattaforma">${platformOptions}</select></label>
          <label>Link<input name="url" type="url" placeholder="https://…"></label>
        </div>
      </fieldset>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="form-actions">
        <button type="button" class="btn-ghost" data-close>Annulla</button>
        <button type="submit" class="btn-primary"${VeneziaAPI.demo ? ' disabled' : ''}>Invia proposta</button>
      </div>
    </form>`);

  wireClose();
  document.getElementById('chant-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (f.website.value) { closeModal(); return; }               // honeypot
    const titolo = f.titolo.value.trim();
    const testo  = f.testo.value.trim();
    if (!titolo || !testo) { toast('Titolo e testo sono obbligatori.', 'err'); return; }
    const media = [];
    if (f.url.value.trim()) {
      if (!isValidUrl(f.url.value)) { toast('Il link del video non sembra valido.', 'err'); return; }
      media.push({ piattaforma: f.piattaforma.value, url: f.url.value.trim() });
    }
    await submitForm(f, () => VeneziaAPI.proposeChant({
      titolo, testo, categoria: f.categoria.value,
      avversario: f.avversario.value.trim(), media
    }), 'Grazie! Il coro è in moderazione. 🧡💚');
  });
}

/* Form: proponi un video per un coro esistente */
function openMediaForm(chantId, titolo) {
  openModal(`
    <h2 id="modal-title" class="modal-title">Proponi un video</h2>
    <p class="form-note strong">per «${escape(titolo)}»</p>
    ${demoNotice}
    <form id="media-form" class="proposal-form" novalidate>
      <div class="form-row">
        <label>Piattaforma *<select name="piattaforma" required>${platformOptions}</select></label>
        <label>Link *<input name="url" type="url" required placeholder="https://…"></label>
      </div>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="form-actions">
        <button type="button" class="btn-ghost" data-close>Annulla</button>
        <button type="submit" class="btn-primary"${VeneziaAPI.demo ? ' disabled' : ''}>Invia</button>
      </div>
    </form>`);

  wireClose();
  document.getElementById('media-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (f.website.value) { closeModal(); return; }
    if (!isValidUrl(f.url.value)) { toast('Il link non sembra valido.', 'err'); return; }
    await submitForm(f, () => VeneziaAPI.proposeMedia({
      chantId, piattaforma: f.piattaforma.value, url: f.url.value.trim()
    }), 'Grazie! Il video è in moderazione. 🧡💚');
  });
}

function wireClose() {
  modalBody.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
}

async function submitForm(form, action, okMsg) {
  if (VeneziaAPI.demo) { toast('Funzione disponibile col database attivo.', 'err'); return; }
  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true; submitBtn.textContent = 'Invio…';
  try {
    await action();
    closeModal();
    toast(okMsg);
  } catch (err) {
    submitBtn.disabled = false; submitBtn.textContent = 'Riprova';
    toast('Invio non riuscito, riprova.', 'err');
  }
}

proposeBtn.addEventListener('click', openChantForm);

/* ── Search (debounced) ── */
let searchTimer;
searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchEl.value.trim();
    clearBtn.classList.toggle('visible', searchQuery.length > 0);
    render();
  }, 200);
});
clearBtn.addEventListener('click', () => {
  searchEl.value = ''; searchQuery = '';
  clearBtn.classList.remove('visible'); searchEl.focus(); render();
});

/* ── Pills ── */
pills.forEach(pill => {
  pill.addEventListener('click', () => {
    pills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeFilter = pill.dataset.filter;
    render();
  });
});

/* ── Sort ── */
sortEl.addEventListener('change', () => { activeSort = sortEl.value; render(); });

/* ════════════════════════════════════════════════════════════════════
   MERCH (link affiliati) — vetrina mostrata solo se ci sono prodotti attivi
   ════════════════════════════════════════════════════════════════════ */
const merchSection = document.getElementById('merch-section');
const merchGrid    = document.getElementById('merch-grid');

function renderMerchCard(p) {
  const img = p.immagine_url
    ? `<div class="merch-img"><img src="${escape(p.immagine_url)}" alt="${escape(p.titolo)}" loading="lazy"></div>`
    : '';
  return `
<article class="merch-card">
  ${img}
  <div class="merch-body">
    ${p.categoria ? `<span class="merch-cat">${escape(p.categoria)}</span>` : ''}
    <h3 class="merch-title">${escape(p.titolo)}</h3>
    ${p.descrizione ? `<p class="merch-desc">${escape(p.descrizione)}</p>` : ''}
    <div class="merch-foot">
      ${p.prezzo ? `<span class="merch-price">${escape(p.prezzo)}</span>` : '<span></span>'}
      <a class="merch-btn" href="${escape(p.link)}" target="_blank" rel="noopener sponsored nofollow">
        Vedi prodotto <span aria-hidden="true">→</span>
      </a>
    </div>
  </div>
</article>`;
}

async function loadMerch() {
  if (!merchSection || !merchGrid) return;
  try {
    const items = await VeneziaAPI.getMerch();
    if (!items.length) { merchSection.hidden = true; return; }
    merchGrid.innerHTML = items.map(renderMerchCard).join('');
    merchSection.hidden = false;
  } catch (e) {
    console.error(e);
    merchSection.hidden = true;
  }
}

/* ── Init ── */
async function loadChants() {
  renderLoading();
  try {
    chants = await VeneziaAPI.getPublishedChants();
    MAX_SCORE = Math.max(1, ...chants.map(score));
    heroCount.textContent = chants.length;
    render();
  } catch (e) {
    console.error(e);
    renderError();
    heroCount.textContent = '—';
    countEl.textContent = 'errore di caricamento';
  }
}

loadChants();
loadMerch();
