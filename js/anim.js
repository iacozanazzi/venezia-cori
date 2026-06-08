/* ════════════════════════════════════════════════════════════════════
   Animazioni — scroll reveal delle sezioni [data-reveal].
   Rispetta prefers-reduced-motion e degrada con grazia senza IO.
   Espone window.revealObserve(el) per elementi mostrati dopo (es. merch).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supported = 'IntersectionObserver' in window;

  if (reduce || !supported) {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
    window.revealObserve = el => el && el.classList.add('revealed');
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

  // Per sezioni rese visibili dopo il load (es. merch popolata da app.js)
  window.revealObserve = el => { if (el) io.observe(el); };
})();
