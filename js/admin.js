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
    ['chants','media','manage','merch'].forEach(name =>
      show(document.getElementById(`panel-${name}`), name === tab.dataset.tab));
  });
});

/* ════════════════════════════════════════════════════════════════════
   LOAD
   ════════════════════════════════════════════════════════════════════ */
async function loadAll() {
  await Promise.all([loadPendingChants(), loadPendingMedia(), loadManage(), loadMerch()]);
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

/* ── Gestione (tutti i cori pubblicati + media) ─────────────────── */
async function loadManage() {
  const panel = document.getElementById('panel-manage');
  panel.innerHTML = '<p class="muted">Carico…</p>';
  try {
    const rows = (await A.allChants()).filter(c => c.stato === 'pubblicato');
    if (!rows.length) { panel.innerHTML = '<p class="muted">Nessun coro pubblicato.</p>'; return; }
    panel.innerHTML = `<p class="muted">${rows.length} cori pubblicati</p>` + rows.map(manageRow).join('');
    rows.forEach(wireManageRow);
  } catch (e) { panel.innerHTML = '<p class="err-msg">Errore di caricamento.</p>'; }
}

function manageRow(c) {
  const media = (c.media || []).filter(m => m.stato === 'approvato').map(m =>
    `<li data-mid="${m.id}">
      <span class="plat ${m.piattaforma}">${PLAT[m.piattaforma] || m.piattaforma}</span>
      <a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.url)}</a>
      <label class="evid"><input type="checkbox" class="m-evid"${m.in_evidenza ? ' checked' : ''}> in evidenza</label>
      <button class="link-del m-del">elimina</button>
    </li>`).join('');
  return `
<article class="manage-row" data-id="${c.id}">
  <div class="mr-head">
    <span class="mr-title">${esc(c.titolo)}</span>
    <span class="mr-meta">${esc(c.categoria)} · ▲${(c.popolarita_base||0)+(c.voti||0)}</span>
    <button class="link-del c-del">elimina coro</button>
  </div>
  <ul class="mr-media">${media || '<li class="muted">nessun video</li>'}</ul>
  <form class="mr-add">
    <select class="a-plat">${Object.entries(PLAT).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>
    <input class="a-url" type="url" placeholder="https://… (aggiungi video)">
    <button type="submit">+ aggiungi</button>
  </form>
</article>`;
}

function wireManageRow(c) {
  const el = document.querySelector(`.manage-row[data-id="${c.id}"]`);
  if (!el) return;
  el.querySelector('.c-del').addEventListener('click', async () => {
    if (!confirm(`Eliminare il coro «${c.titolo}»? Azione irreversibile.`)) return;
    try { await A.deleteChant(c.id); toast('Coro eliminato.'); refresh(); }
    catch { toast('Operazione non riuscita.', 'err'); }
  });
  el.querySelectorAll('.mr-media li[data-mid]').forEach(li => {
    const mid = parseInt(li.dataset.mid, 10);
    li.querySelector('.m-evid')?.addEventListener('change', async e => {
      try { await A.setMedia(mid, { in_evidenza: e.target.checked }); toast('Aggiornato.'); }
      catch { toast('Operazione non riuscita.', 'err'); e.target.checked = !e.target.checked; }
    });
    li.querySelector('.m-del')?.addEventListener('click', async () => {
      if (!confirm('Eliminare questo video?')) return;
      try { await A.deleteMedia(mid); toast('Video eliminato.'); refresh(); }
      catch { toast('Operazione non riuscita.', 'err'); }
    });
  });
  el.querySelector('.mr-add').addEventListener('submit', async e => {
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

/* ── Refresh debounced ── */
let refreshTimer;
function refresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(loadAll, 150); }

boot();
