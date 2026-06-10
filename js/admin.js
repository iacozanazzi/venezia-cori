/* ════════════════════════════════════════════════════════════════════
   Venezia Cori — Pannello Admin
   Login Supabase + moderazione proposte (cori e video) + gestione.
   ════════════════════════════════════════════════════════════════════ */

const A = VeneziaAPI.admin;

/* ── DOM ── */
const loginView = document.getElementById('login-view');
const demoView  = document.getElementById('demo-view');
const dashView  = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginErr  = document.getElementById('login-err');
const logoutBtn = document.getElementById('logout-btn');
const toastEl   = document.getElementById('toast');

const CATS = ['classico','incoraggiamento','curva','sfotto','derby'];
const PLAT = { youtube:'YouTube', tiktok:'TikTok', instagram:'Instagram' };

/* ── Utils ── */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
let toastTimer;
function toast(msg, kind = 'ok') {
  toastEl.textContent = msg;
  toastEl.className = `toast show ${kind}`;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = 'toast'; toastEl.hidden = true; }, 3200);
}
function show(el, on) { el.hidden = !on; }

/* ════════════════════════════════════════════════════════════════════
   AUTH
   ════════════════════════════════════════════════════════════════════ */
async function boot() {
  if (VeneziaAPI.demo) { show(demoView, true); return; }
  const user = await VeneziaAPI.auth.getUser();
  renderAuth(user);
  VeneziaAPI.auth.onChange(renderAuth);
}

function renderAuth(user) {
  const logged = !!user;
  show(loginView, !logged);
  show(dashView, logged);
  show(logoutBtn, logged);
  if (logged) loadAll();
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginErr.hidden = true;
  const btn = loginForm.querySelector('button');
  btn.disabled = true; btn.textContent = 'Accesso…';
  try {
    await VeneziaAPI.auth.signIn(loginForm.email.value.trim(), loginForm.password.value);
  } catch (err) {
    loginErr.textContent = 'Email o password non validi.';
    loginErr.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = 'Accedi';
  }
});

logoutBtn.addEventListener('click', async () => { await VeneziaAPI.auth.signOut(); });

/* ════════════════════════════════════════════════════════════════════
   TABS
   ════════════════════════════════════════════════════════════════════ */
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    ['chants','media','manage','merch','stats'].forEach(name =>
      show(document.getElementById(`panel-${name}`), name === tab.dataset.tab));
  });
});

/* ════════════════════════════════════════════════════════════════════
   LOAD
   ════════════════════════════════════════════════════════════════════ */
async function loadAll() {
  await Promise.all([loadPendingChants(), loadPendingMedia(), loadManage(), loadMerch()]);
  loadStats();   // dopo loadManage: usa i titoli dei cori per le classifiche
}

/* ── Proposte cori ──────────────────────────────────────────────── */
async function loadPendingChants() {
  const panel = document.getElementById('panel-chants');
  panel.innerHTML = '<p class="muted">Carico…</p>';
  try {
    const rows = await A.pendingChants();
    document.getElementById('cnt-chants').textContent = rows.length;
    if (!rows.length) { panel.innerHTML = '<p class="muted">Nessuna proposta di coro in attesa. 🎉</p>'; return; }
    panel.innerHTML = rows.map(chantEditCard).join('');
    rows.forEach(wireChantCard);
  } catch (e) { panel.innerHTML = '<p class="err-msg">Errore di caricamento.</p>'; }
}

function chantEditCard(c) {
  const opts = CATS.map(k => `<option value="${k}"${k === c.categoria ? ' selected' : ''}>${k}</option>`).join('');
  const media = (c.media || []).map(m =>
    `<li><span class="plat ${m.piattaforma}">${PLAT[m.piattaforma] || m.piattaforma}</span>
       <a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.url)}</a></li>`).join('');
  return `
<article class="mod-card" data-id="${c.id}">
  <div class="mod-fields">
    <label>Titolo<input class="f-titolo" value="${esc(c.titolo)}"></label>
    <label>Testo<textarea class="f-testo" rows="5">${esc(c.testo)}</textarea></label>
    <div class="mod-row">
      <label>Categoria<select class="f-categoria">${opts}</select></label>
      <label>Avversario<input class="f-avversario" value="${esc(c.avversario || '')}" placeholder="—"></label>
    </div>
    ${media ? `<div class="mod-media"><strong>Video allegati (in attesa):</strong><ul>${media}</ul></div>` : ''}
  </div>
  <div class="mod-actions">
    <button class="btn-approve" data-act="approve">✓ Pubblica</button>
    <button class="btn-save"    data-act="save">Salva modifiche</button>
    <button class="btn-reject"  data-act="reject">✕ Rifiuta</button>
  </div>
</article>`;
}

function wireChantCard(c) {
  const el = document.querySelector(`.mod-card[data-id="${c.id}"]`);
  if (!el) return;
  const read = () => ({
    titolo: el.querySelector('.f-titolo').value.trim(),
    testo: el.querySelector('.f-testo').value.trim(),
    categoria: el.querySelector('.f-categoria').value,
    avversario: el.querySelector('.f-avversario').value.trim() || null
  });
  el.querySelector('[data-act="save"]').addEventListener('click', async () => {
    try { await A.updateChant(c.id, read()); toast('Modifiche salvate.'); }
    catch { toast('Salvataggio non riuscito.', 'err'); }
  });
  el.querySelector('[data-act="approve"]').addEventListener('click', async () => {
    try {
      await A.updateChant(c.id, { ...read(), stato: 'pubblicato' });
      // approva anche i video allegati e mettili in evidenza
      for (const m of (c.media || [])) await A.setMedia(m.id, { stato: 'approvato', in_evidenza: true });
      toast('Coro pubblicato! 🧡💚');
      refresh();
    } catch { toast('Pubblicazione non riuscita.', 'err'); }
  });
  el.querySelector('[data-act="reject"]').addEventListener('click', async () => {
    if (!confirm('Rifiutare questa proposta?')) return;
    try { await A.setChantStato(c.id, 'rifiutato'); toast('Proposta rifiutata.'); refresh(); }
    catch { toast('Operazione non riuscita.', 'err'); }
  });
}

/* ── Proposte video ─────────────────────────────────────────────── */
async function loadPendingMedia() {
  const panel = document.getElementById('panel-media');
  panel.innerHTML = '<p class="muted">Carico…</p>';
  try {
    let rows = await A.pendingMedia();
    // mostra solo i video proposti per cori GIÀ pubblicati
    rows = rows.filter(m => m.chants?.stato === 'pubblicato');
    document.getElementById('cnt-media').textContent = rows.length;
    if (!rows.length) { panel.innerHTML = '<p class="muted">Nessun video in attesa. 🎉</p>'; return; }
    panel.innerHTML = rows.map(mediaCard).join('');
    rows.forEach(wireMediaCard);
  } catch (e) { panel.innerHTML = '<p class="err-msg">Errore di caricamento.</p>'; }
}

function mediaCard(m) {
  return `
<article class="mod-card mod-media-card" data-id="${m.id}">
  <div class="mod-fields">
    <p class="mc-chant">per «${esc(m.chants?.titolo || '—')}»</p>
    <p><span class="plat ${m.piattaforma}">${PLAT[m.piattaforma] || m.piattaforma}</span></p>
    <a class="mc-link" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.url)}</a>
  </div>
  <div class="mod-actions">
    <button class="btn-approve" data-act="approve">✓ Approva + mostra</button>
    <button class="btn-reject"  data-act="reject">✕ Rifiuta</button>
  </div>
</article>`;
}

function wireMediaCard(m) {
  const el = document.querySelector(`.mod-media-card[data-id="${m.id}"]`);
  if (!el) return;
  el.querySelector('[data-act="approve"]').addEventListener('click', async () => {
    try { await A.setMedia(m.id, { stato: 'approvato', in_evidenza: true }); toast('Video pubblicato!'); refresh(); }
    catch { toast('Operazione non riuscita.', 'err'); }
  });
  el.querySelector('[data-act="reject"]').addEventListener('click', async () => {
    try { await A.setMedia(m.id, { stato: 'rifiutato' }); toast('Video rifiutato.'); refresh(); }
    catch { toast('Operazione non riuscita.', 'err'); }
  });
}

/* ── Gestione (crea / modifica / nascondi / elimina cori + video) ── */
let manageChants = [];
let manageState  = { seg: 'pubblicato', q: '' };
let addChantOpen = false;

const SEG = [
  { key: 'pubblicato', label: 'Pubblicati' },
  { key: 'nascosto',   label: 'Nascosti'   },
  { key: 'rifiutato',  label: 'Rifiutati'  }
];
function segLabel(k) { return (SEG.find(s => s.key === k) || { label: k }).label; }
function catOptions(sel)  { return CATS.map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${k}</option>`).join(''); }
function platOptions(sel) { return Object.entries(PLAT).map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join(''); }

async function loadManage() {
  const panel = document.getElementById('panel-manage');
  if (!panel) return;
  panel.innerHTML = '<p class="muted">Carico…</p>';
  try {
    manageChants = await A.allChants();
    renderManage();
  } catch (e) { panel.innerHTML = '<p class="err-msg">Errore di caricamento.</p>'; }
}

function segBarHTML() {
  const counts = {};
  manageChants.forEach(c => counts[c.stato] = (counts[c.stato] || 0) + 1);
  return SEG.map(s =>
    `<button class="seg-btn${s.key === manageState.seg ? ' active' : ''}" data-seg="${s.key}">${s.label} <span class="seg-count">${counts[s.key] || 0}</span></button>`
  ).join('');
}

function renderManage() {
  const panel = document.getElementById('panel-manage');
  panel.innerHTML = `
${addChantBlock()}
<div class="manage-bar">
  <div class="seg-group">${segBarHTML()}</div>
  <input class="manage-search" type="search" placeholder="Cerca tra i cori…" value="${esc(manageState.q)}">
</div>
<div id="manage-list"></div>`;

  wireAddChant();
  panel.querySelectorAll('.seg-btn').forEach(b =>
    b.addEventListener('click', () => {
      manageState.seg = b.dataset.seg;
      panel.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x.dataset.seg === manageState.seg));
      renderManageList();
    }));
  const s = panel.querySelector('.manage-search');
  s.addEventListener('input', () => { manageState.q = s.value; renderManageList(); });
  renderManageList();
}

function renderManageList() {
  const list = document.getElementById('manage-list');
  if (!list) return;
  const q = manageState.q.trim().toLowerCase();
  let rows = manageChants.filter(c => c.stato === manageState.seg);
  if (q) rows = rows.filter(c =>
    c.titolo.toLowerCase().includes(q) ||
    (c.testo || '').toLowerCase().includes(q) ||
    (c.avversario || '').toLowerCase().includes(q));
  list.innerHTML = rows.length
    ? rows.map(chantManageCard).join('')
    : `<p class="muted">Nessun coro in «${segLabel(manageState.seg)}»${q ? ' per questa ricerca' : ''}.</p>`;
  rows.forEach(wireChantManageCard);
}

/* Form collassabile "aggiungi coro" */
function addChantBlock() {
  return `
<div class="add-chant${addChantOpen ? ' open' : ''}">
  <button class="add-chant-toggle" type="button">${addChantOpen ? '− Chiudi' : '+ Aggiungi coro'}</button>
  ${addChantOpen ? `
  <form class="add-chant-form">
    <div class="mod-row">
      <label>Titolo *<input class="nc-titolo" required></label>
      <label>Categoria<select class="nc-categoria">${catOptions('classico')}</select></label>
    </div>
    <label>Testo *<textarea class="nc-testo" rows="5" placeholder="Un verso per riga…"></textarea></label>
    <div class="mod-row">
      <label>Avversario<input class="nc-avversario" placeholder="—"></label>
      <label>Punteggio base<input class="nc-pop" type="number" min="0" value="0"></label>
    </div>
    <div class="mod-row">
      <label>Video (facoltativo)<select class="nc-plat">${platOptions()}</select></label>
      <label>Link video<input class="nc-url" type="url" placeholder="https://…"></label>
    </div>
    <button type="submit" class="btn-approve">Pubblica coro</button>
  </form>` : ''}
</div>`;
}

function wireAddChant() {
  const panel = document.getElementById('panel-manage');
  panel.querySelector('.add-chant-toggle')?.addEventListener('click', () => { addChantOpen = !addChantOpen; renderManage(); });
  const form = panel.querySelector('.add-chant-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titolo = form.querySelector('.nc-titolo').value.trim();
    const testo  = form.querySelector('.nc-testo').value.trim();
    if (!titolo || !testo) { toast('Titolo e testo obbligatori.', 'err'); return; }
    const url  = form.querySelector('.nc-url').value.trim();
    if (url && !/^https?:\/\/.+/i.test(url)) { toast('Link video non valido.', 'err'); return; }
    const fields = {
      titolo, testo,
      categoria: form.querySelector('.nc-categoria').value,
      avversario: form.querySelector('.nc-avversario').value.trim() || null,
      popolarita_base: Math.max(0, parseInt(form.querySelector('.nc-pop').value, 10) || 0),
      stato: 'pubblicato'
    };
    try {
      const res = await A.addChant(fields);
      if (url && res?.id) await A.addMedia({ chantId: res.id, piattaforma: form.querySelector('.nc-plat').value, url });
      toast('Coro pubblicato! 🧡💚');
      addChantOpen = false; manageState.seg = 'pubblicato';
      refresh();
    } catch { toast('Creazione non riuscita.', 'err'); }
  });
}

/* Card editabile di un coro (dipende dallo stato) */
function chantManageCard(c) {
  const isRej = c.stato === 'rifiutato';
  const media = (c.media || []).filter(m => m.stato === 'approvato').map(m => `
    <li data-mid="${m.id}">
      <select class="me-plat">${platOptions(m.piattaforma)}</select>
      <input class="me-url" type="url" value="${esc(m.url)}">
      <label class="evid"><input type="checkbox" class="m-evid"${m.in_evidenza ? ' checked' : ''}> in evidenza</label>
      <button class="link-save me-save" type="button">salva</button>
      <button class="link-del m-del" type="button">elimina</button>
    </li>`).join('');

  let actions;
  if (c.stato === 'pubblicato') {
    actions = `<button class="btn-save" data-act="save">Salva modifiche</button>
               <button class="btn-hide" data-act="hide">Nascondi</button>
               <button class="btn-reject" data-act="del">Elimina</button>`;
  } else if (c.stato === 'nascosto') {
    actions = `<button class="btn-save" data-act="save">Salva modifiche</button>
               <button class="btn-approve" data-act="publish">Ripubblica</button>
               <button class="btn-reject" data-act="del">Elimina</button>`;
  } else { // rifiutato
    actions = `<button class="btn-approve" data-act="publish">Ripubblica</button>
               <button class="btn-reject" data-act="del">Elimina definitivamente</button>`;
  }

  return `
<article class="mod-card manage-card" data-id="${c.id}">
  <div class="mod-fields">
    <label>Titolo<input class="f-titolo" value="${esc(c.titolo)}"></label>
    <label>Testo<textarea class="f-testo" rows="5">${esc(c.testo)}</textarea></label>
    <div class="mod-row">
      <label>Categoria<select class="f-categoria">${catOptions(c.categoria)}</select></label>
      <label>Avversario<input class="f-avversario" value="${esc(c.avversario || '')}" placeholder="—"></label>
      <label>Punteggio base<input class="f-pop" type="number" min="0" value="${c.popolarita_base || 0}"></label>
    </div>
    ${!isRej ? `
    <div class="mr-media-wrap">
      <strong class="mr-media-label">Video</strong>
      <ul class="mr-media">${media || '<li class="muted">nessun video</li>'}</ul>
      <form class="mr-add">
        <select class="a-plat">${platOptions()}</select>
        <input class="a-url" type="url" placeholder="https://… (aggiungi video)">
        <button type="submit">+ aggiungi</button>
      </form>
    </div>` : ''}
  </div>
  <div class="mod-actions">${actions}</div>
</article>`;
}

function wireChantManageCard(c) {
  const el = document.querySelector(`.manage-card[data-id="${c.id}"]`);
  if (!el) return;
  const readFields = () => ({
    titolo: el.querySelector('.f-titolo').value.trim(),
    testo: el.querySelector('.f-testo').value.trim(),
    categoria: el.querySelector('.f-categoria').value,
    avversario: el.querySelector('.f-avversario').value.trim() || null,
    popolarita_base: Math.max(0, parseInt(el.querySelector('.f-pop').value, 10) || 0)
  });

  el.querySelector('[data-act="save"]')?.addEventListener('click', async () => {
    const f = readFields();
    if (!f.titolo || !f.testo) { toast('Titolo e testo obbligatori.', 'err'); return; }
    try { await A.updateChant(c.id, f); toast('Modifiche salvate.'); refresh(); }
    catch { toast('Salvataggio non riuscito.', 'err'); }
  });
  el.querySelector('[data-act="hide"]')?.addEventListener('click', async () => {
    try { await A.updateChant(c.id, { ...readFields(), stato: 'nascosto' }); toast('Coro nascosto dal sito.'); refresh(); }
    catch { toast('Operazione non riuscita.', 'err'); }
  });
  el.querySelector('[data-act="publish"]')?.addEventListener('click', async () => {
    const f = readFields();
    if (!f.titolo || !f.testo) { toast('Titolo e testo obbligatori.', 'err'); return; }
    try { await A.updateChant(c.id, { ...f, stato: 'pubblicato' }); toast('Coro pubblicato! 🧡💚'); refresh(); }
    catch { toast('Operazione non riuscita.', 'err'); }
  });
  el.querySelector('[data-act="del"]')?.addEventListener('click', async () => {
    if (!confirm(`Eliminare il coro «${c.titolo}»? Azione irreversibile (rimuove anche i suoi video e voti).`)) return;
    try { await A.deleteChant(c.id); toast('Coro eliminato.'); refresh(); }
    catch { toast('Operazione non riuscita.', 'err'); }
  });

  // video esistenti: in evidenza / salva url / elimina
  el.querySelectorAll('.mr-media li[data-mid]').forEach(li => {
    const mid = parseInt(li.dataset.mid, 10);
    li.querySelector('.m-evid')?.addEventListener('change', async e => {
      try { await A.setMedia(mid, { in_evidenza: e.target.checked }); toast('Aggiornato.'); }
      catch { toast('Operazione non riuscita.', 'err'); e.target.checked = !e.target.checked; }
    });
    li.querySelector('.me-save')?.addEventListener('click', async () => {
      const url = li.querySelector('.me-url').value.trim();
      if (!/^https?:\/\/.+/i.test(url)) { toast('Link non valido.', 'err'); return; }
      try { await A.setMedia(mid, { url, piattaforma: li.querySelector('.me-plat').value }); toast('Video aggiornato.'); }
      catch { toast('Operazione non riuscita.', 'err'); }
    });
    li.querySelector('.m-del')?.addEventListener('click', async () => {
      if (!confirm('Eliminare questo video?')) return;
      try { await A.deleteMedia(mid); toast('Video eliminato.'); refresh(); }
      catch { toast('Operazione non riuscita.', 'err'); }
    });
  });

  // aggiungi video
  el.querySelector('.mr-add')?.addEventListener('submit', async e => {
    e.preventDefault();
    const url = el.querySelector('.a-url').value.trim();
    if (!/^https?:\/\/.+/i.test(url)) { toast('Link non valido.', 'err'); return; }
    try {
      await A.addMedia({ chantId: c.id, piattaforma: el.querySelector('.a-plat').value, url });
      toast('Video aggiunto.'); refresh();
    } catch { toast('Operazione non riuscita.', 'err'); }
  });
}

/* ── Merch (link affiliati) ─────────────────────────────────────── */
async function loadMerch() {
  const panel = document.getElementById('panel-merch');
  panel.innerHTML = '<p class="muted">Carico…</p>';
  try {
    const rows = await A.allMerch();
    panel.innerHTML = merchAddForm() + (
      rows.length
        ? rows.map(merchRow).join('')
        : '<p class="muted">Nessun prodotto. Aggiungi il primo qui sopra.</p>'
    );
    wireMerchAdd();
    rows.forEach(wireMerchRow);
  } catch (e) { panel.innerHTML = '<p class="err-msg">Errore di caricamento.</p>'; }
}

function merchAddForm() {
  return `
<form class="merch-add" id="merch-add">
  <h3 class="merch-add-title">+ Aggiungi prodotto</h3>
  <div class="mod-row">
    <label>Titolo *<input class="n-titolo" required></label>
    <label>Prezzo<input class="n-prezzo" placeholder="es. €24,90"></label>
  </div>
  <label>Link affiliato *<input class="n-link" type="url" placeholder="https://www.amazon.it/…?tag=iltuotag"></label>
  <label>Immagine (URL)<input class="n-immagine" type="url" placeholder="https://…"></label>
  <div class="mod-row">
    <label>Categoria<input class="n-categoria" placeholder="es. maglia, sciarpa"></label>
    <label>Ordine<input class="n-ordine" type="number" value="0"></label>
  </div>
  <label>Descrizione<textarea class="n-descrizione" rows="2"></textarea></label>
  <button type="submit" class="btn-approve">+ Aggiungi</button>
</form>`;
}

function wireMerchAdd() {
  const f = document.getElementById('merch-add');
  if (!f) return;
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const titolo = f.querySelector('.n-titolo').value.trim();
    const link   = f.querySelector('.n-link').value.trim();
    if (!titolo || !/^https?:\/\/.+/i.test(link)) { toast('Titolo e link valido sono obbligatori.', 'err'); return; }
    try {
      await A.addMerch({
        titolo,
        link,
        prezzo:       f.querySelector('.n-prezzo').value.trim() || null,
        immagine_url: f.querySelector('.n-immagine').value.trim() || null,
        categoria:    f.querySelector('.n-categoria').value.trim() || null,
        descrizione:  f.querySelector('.n-descrizione').value.trim() || null,
        ordine:       parseInt(f.querySelector('.n-ordine').value, 10) || 0
      });
      toast('Prodotto aggiunto.'); refresh();
    } catch { toast('Operazione non riuscita.', 'err'); }
  });
}

function merchRow(p) {
  return `
<article class="merch-edit" data-id="${p.id}">
  <div class="mod-fields">
    <div class="mod-row">
      <label>Titolo<input class="f-titolo" value="${esc(p.titolo)}"></label>
      <label>Prezzo<input class="f-prezzo" value="${esc(p.prezzo || '')}" placeholder="—"></label>
    </div>
    <label>Link affiliato<input class="f-link" type="url" value="${esc(p.link)}"></label>
    <label>Immagine (URL)<input class="f-immagine" type="url" value="${esc(p.immagine_url || '')}"></label>
    <div class="mod-row">
      <label>Categoria<input class="f-categoria" value="${esc(p.categoria || '')}" placeholder="—"></label>
      <label>Ordine<input class="f-ordine" type="number" value="${p.ordine || 0}"></label>
    </div>
    <label>Descrizione<textarea class="f-descrizione" rows="2">${esc(p.descrizione || '')}</textarea></label>
    <label class="evid"><input type="checkbox" class="f-attivo"${p.attivo ? ' checked' : ''}> attivo (visibile sul sito)</label>
  </div>
  <div class="mod-actions">
    <button class="btn-save" data-act="save">Salva modifiche</button>
    <button class="link-del" data-act="del">elimina</button>
  </div>
</article>`;
}

function wireMerchRow(p) {
  const el = document.querySelector(`.merch-edit[data-id="${p.id}"]`);
  if (!el) return;
  const read = () => ({
    titolo:       el.querySelector('.f-titolo').value.trim(),
    prezzo:       el.querySelector('.f-prezzo').value.trim() || null,
    link:         el.querySelector('.f-link').value.trim(),
    immagine_url: el.querySelector('.f-immagine').value.trim() || null,
    categoria:    el.querySelector('.f-categoria').value.trim() || null,
    descrizione:  el.querySelector('.f-descrizione').value.trim() || null,
    ordine:       parseInt(el.querySelector('.f-ordine').value, 10) || 0,
    attivo:       el.querySelector('.f-attivo').checked
  });
  el.querySelector('[data-act="save"]').addEventListener('click', async () => {
    const fields = read();
    if (!fields.titolo || !/^https?:\/\/.+/i.test(fields.link || '')) { toast('Titolo e link valido sono obbligatori.', 'err'); return; }
    try { await A.updateMerch(p.id, fields); toast('Modifiche salvate.'); refresh(); }
    catch { toast('Salvataggio non riuscito.', 'err'); }
  });
  el.querySelector('[data-act="del"]').addEventListener('click', async () => {
    if (!confirm(`Eliminare «${p.titolo}»?`)) return;
    try { await A.deleteMerch(p.id); toast('Prodotto eliminato.'); refresh(); }
    catch { toast('Operazione non riuscita.', 'err'); }
  });
}

/* ── Statistiche (tabella events, vedi db/migration-analytics.sql) ── */
let statsDays = 30;

const EVENT_LABELS = {
  view: 'Visite', share: 'Condivisioni link', share_image: 'Immagini condivise',
  stadium: 'Modalità stadio', proposal: 'Proposte coro', correction: 'Correzioni',
  search_miss: 'Ricerche a vuoto'
};

async function loadStats() {
  const panel = document.getElementById('panel-stats');
  if (!panel) return;
  panel.innerHTML = '<p class="muted">Carico…</p>';
  let rows;
  try {
    rows = await A.events(statsDays);
  } catch (e) {
    const msg = String(e?.message || '');
    const missing = e?.code === '42P01' || /relation .* does not exist|events.* not exist|schema cache/i.test(msg);
    panel.innerHTML = missing
      ? `<div class="stats-empty">
           <h3>Analytics non ancora attive</h3>
           <p class="muted">Manca la tabella <code>events</code>: esegui una volta
           <code>db/migration-analytics.sql</code> nello SQL Editor di Supabase.
           Da quel momento il sito registra visite, ricerche a vuoto, condivisioni
           e modalità stadio — e li leggi qui, senza cookie e senza servizi esterni.</p>
         </div>`
      : '<p class="err-msg">Errore di caricamento statistiche.</p>';
    return;
  }
  renderStats(panel, rows);
}

function renderStats(panel, rows) {
  const count = t => rows.filter(r => r.tipo === t).length;
  const kpis = [
    { icon: '👀', label: 'Visite',            val: count('view') },
    { icon: '↗',  label: 'Condivisioni',      val: count('share') + count('share_image') },
    { icon: '🎤', label: 'Modalità stadio',   val: count('stadium') },
    { icon: '📝', label: 'Proposte + correzioni', val: count('proposal') + count('correction') },
    { icon: '🔍', label: 'Ricerche a vuoto',  val: count('search_miss') }
  ];

  /* visite per giorno (asse completo, anche i giorni a zero) */
  const days = [];
  for (let i = statsDays - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    days.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      n: 0
    });
  }
  const dayIdx = Object.fromEntries(days.map((d, i) => [d.key, i]));
  rows.forEach(r => {
    if (r.tipo !== 'view') return;
    const k = String(r.created_at).slice(0, 10);
    if (k in dayIdx) days[dayIdx[k]].n++;
  });
  const maxDay = Math.max(1, ...days.map(d => d.n));

  /* ricerche senza risultati più frequenti → cori da aggiungere */
  const misses = {};
  rows.forEach(r => {
    if (r.tipo !== 'search_miss') return;
    const q = String(r.dati?.q || '').toLowerCase().trim();
    if (q) misses[q] = (misses[q] || 0) + 1;
  });
  const topMiss = Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 15);

  /* cori più usati (stadio + condivisioni) */
  const byChant = {};
  rows.forEach(r => {
    if (!['stadium', 'share', 'share_image'].includes(r.tipo)) return;
    const id = r.dati?.id;
    if (id) byChant[id] = (byChant[id] || 0) + 1;
  });
  const titleOf = id => manageChants.find(c => c.id === Number(id))?.titolo || `coro #${id}`;
  const topChants = Object.entries(byChant).sort((a, b) => b[1] - a[1]).slice(0, 8);

  /* dettaglio per tipo di evento */
  const byType = Object.entries(EVENT_LABELS)
    .map(([t, label]) => [label, count(t)])
    .filter(([, n]) => n > 0);

  panel.innerHTML = `
<div class="stats-head">
  <div class="seg-group">
    ${[7, 30, 90].map(d => `<button class="seg-btn${d === statsDays ? ' active' : ''}" data-days="${d}">${d} giorni</button>`).join('')}
  </div>
  <span class="muted">${rows.length} eventi nel periodo${rows.length >= 10000 ? ' (limite raggiunto)' : ''}</span>
</div>

<div class="kpi-grid">
  ${kpis.map(k => `
  <div class="kpi">
    <span class="kpi-val">${k.val}</span>
    <span class="kpi-label"><span aria-hidden="true">${k.icon}</span> ${k.label}</span>
  </div>`).join('')}
</div>

<div class="stats-block">
  <h3 class="stats-title">Visite per giorno</h3>
  <div class="bars">
    ${days.map(d => `<div class="bar-wrap" title="${d.label}: ${d.n} visite"><div class="bar" style="height:${Math.max(2, Math.round(d.n / maxDay * 100))}%"></div></div>`).join('')}
  </div>
  <div class="bars-x"><span>${days[0].label}</span><span>oggi</span></div>
</div>

<div class="stats-cols">
  <div class="stats-block">
    <h3 class="stats-title">Ricerche senza risultati <span class="stats-hint">= cori che mancano</span></h3>
    ${topMiss.length
      ? `<ol class="stats-list">${topMiss.map(([q, n]) => `<li><span class="sl-q">«${esc(q)}»</span><span class="sl-n">${n}</span></li>`).join('')}</ol>`
      : '<p class="muted">Nessuna nel periodo. 🎉</p>'}
  </div>
  <div class="stats-block">
    <h3 class="stats-title">Cori più cantati / condivisi</h3>
    ${topChants.length
      ? `<ol class="stats-list">${topChants.map(([id, n]) => `<li><span class="sl-q">${esc(titleOf(id))}</span><span class="sl-n">${n}</span></li>`).join('')}</ol>`
      : '<p class="muted">Ancora nessun dato.</p>'}
  </div>
  <div class="stats-block">
    <h3 class="stats-title">Tutti gli eventi</h3>
    ${byType.length
      ? `<ol class="stats-list">${byType.map(([label, n]) => `<li><span class="sl-q">${label}</span><span class="sl-n">${n}</span></li>`).join('')}</ol>`
      : '<p class="muted">Ancora nessun evento registrato.</p>'}
  </div>
</div>`;

  panel.querySelectorAll('[data-days]').forEach(b =>
    b.addEventListener('click', () => { statsDays = parseInt(b.dataset.days, 10); loadStats(); }));
}

/* ── Refresh debounced ── */
let refreshTimer;
function refresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(loadAll, 150); }

boot();
