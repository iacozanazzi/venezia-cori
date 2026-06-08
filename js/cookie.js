/* ════════════════════════════════════════════════════════════════════
   Cookie banner — informativo. Usiamo solo cookie tecnici; i cookie di
   affiliazione/donazioni si attivano sui siti esterni (Amazon, Ko-fi).
   Il consenso è memorizzato in localStorage e il banner non riappare.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const KEY    = 'venezia-cookie-ok';
  const banner = document.getElementById('cookie-banner');
  const okBtn  = document.getElementById('cookie-ok');
  if (!banner || !okBtn) return;

  if (!localStorage.getItem(KEY)) {
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add('show'));
  }

  okBtn.addEventListener('click', () => {
    localStorage.setItem(KEY, '1');
    banner.classList.remove('show');
    setTimeout(() => { banner.hidden = true; }, 300);
  });
})();
