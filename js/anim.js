/* ════════════════════════════════════════════════════════════════════
   Animazioni & delighters — un unico punto per tutto il movimento.
   - Scroll reveal delle sezioni [data-reveal] (window.revealObserve)
   - Ripple tattile sui bottoni
   - Tilt 3D delle card (solo puntatori fini) + press su touch (CSS)
   - Micro-parallax del watermark nell'hero
   - Coriandoli arancioneroverde in canvas (window.FX.confetti)
   - Easter egg: Konami code / 5 tap sul logo
   Tutto rispetta prefers-reduced-motion e degrada con grazia.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => mq.matches;
  const finePointer = window.matchMedia('(pointer: fine)');

  /* ── Scroll reveal ───────────────────────────────────────────── */
  const supported = 'IntersectionObserver' in window;
  if (reduce() || !supported) {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
    window.revealObserve = el => el && el.classList.add('revealed');
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

    // Per sezioni rese visibili dopo il load (es. merch popolata da app.js)
    window.revealObserve = el => { if (el) io.observe(el); };
  }

  /* ── Ripple tattile sui bottoni ──────────────────────────────── */
  const RIPPLE_SEL = '.pill, .propose-btn, .vote-btn, .copy-btn, ' +
    '.suggest-media-btn, .btn-primary, .btn-ghost, .retry-btn, .cookie-ok';
  document.addEventListener('pointerdown', e => {
    if (reduce()) return;
    const host = e.target.closest(RIPPLE_SEL);
    if (!host || host.disabled) return;
    const r = host.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'ripple-fx';
    s.style.width = s.style.height = d + 'px';
    s.style.left = (e.clientX - r.left - d / 2) + 'px';
    s.style.top  = (e.clientY - r.top  - d / 2) + 'px';
    host.appendChild(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
    setTimeout(() => s.remove(), 800);            // rete di sicurezza
  }, { passive: true });

  /* ── Card: tilt 3D al passaggio (solo mouse/trackpad) ────────── */
  const grid = document.getElementById('chants-grid');
  if (grid) {
    // l'animazione d'ingresso cardIn (fill: both) bloccherebbe i transform
    // di hover/tilt: appena finisce, la togliamo di mezzo
    grid.addEventListener('animationend', e => {
      if (e.animationName === 'cardIn') e.target.style.animation = 'none';
    });

    let raf = 0;
    grid.addEventListener('pointermove', e => {
      if (reduce() || !finePointer.matches || raf) return;
      const card = e.target.closest('.card');
      if (!card) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width  - 0.5;
        const dy = (e.clientY - r.top)  / r.height - 0.5;
        card.style.transform =
          `perspective(900px) translateY(-4px) rotateX(${(-dy * 3.5).toFixed(2)}deg) rotateY(${(dx * 4.5).toFixed(2)}deg)`;
      });
    }, { passive: true });
    grid.addEventListener('pointerout', e => {
      const card = e.target.closest('.card');
      if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
    });
  }

  /* ── Micro-parallax del watermark VE nell'hero ───────────────── */
  const hero = document.querySelector('.hero');
  if (hero) {
    let rafH = 0;
    hero.addEventListener('pointermove', e => {
      if (reduce() || !finePointer.matches || rafH) return;
      rafH = requestAnimationFrame(() => {
        rafH = 0;
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width  - 0.5;
        const dy = (e.clientY - r.top)  / r.height - 0.5;
        hero.style.setProperty('--par-x', (dx * -22).toFixed(1) + 'px');
        hero.style.setProperty('--par-y', (dy * -14).toFixed(1) + 'px');
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--par-x', '0px');
      hero.style.setProperty('--par-y', '0px');
    });
  }

  /* ── Coriandoli arancioneroverde (canvas puro, zero dipendenze) ── */
  function confetti(opts = {}) {
    if (reduce()) return;                          // niente festa forzata
    const colors = ['#f47b20', '#ff9a4d', '#157a43', '#36b56b', '#f4f3f0', '#d0a92b', '#1a1a1a'];
    const c = document.createElement('canvas');
    c.className = 'fx-confetti';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);

    const N = opts.count || 140;
    const fromTop = !!opts.fromTop;
    const parts = Array.from({ length: N }, () => ({
      x: fromTop ? Math.random() * W : W / 2 + (Math.random() - 0.5) * W * 0.35,
      y: fromTop ? -20 - Math.random() * H * 0.25 : H * 0.58,
      vx: (Math.random() - 0.5) * (fromTop ? 4 : 15),
      vy: fromTop ? 2 + Math.random() * 3 : -(7 + Math.random() * 11),
      w: 7 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      drag: 0.985 + Math.random() * 0.012,
      color: colors[(Math.random() * colors.length) | 0]
    }));

    const t0 = performance.now(), DUR = fromTop ? 3200 : 2600;
    (function frame(now) {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, t > DUR - 500 ? (DUR - t) / 500 : 1);
      for (const p of parts) {
        p.vy += 0.32;
        p.vx *= p.drag; p.vy *= p.drag;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < DUR) requestAnimationFrame(frame);
      else c.remove();
    })(t0);
  }

  window.FX = { confetti };

  /* ── Easter egg: Konami code o 5 tap rapidi sul logo ─────────── */
  function eggParty() {
    confetti({ count: 190, fromTop: true });
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.classList.add('party');
      setTimeout(() => logo.classList.remove('party'), 800);
    }
    if (typeof window.toast === 'function') {
      window.toast('FORZA UNIONE! 🧡🖤💚 La laguna trema con te.');
    }
  }

  const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let ki = 0;
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    ki = (e.key === SEQ[ki]) ? ki + 1 : (e.key === SEQ[0] ? 1 : 0);
    if (ki === SEQ.length) { ki = 0; eggParty(); }
  });

  const logoEl = document.querySelector('.logo');
  let taps = 0, tapTimer;
  logoEl?.addEventListener('click', e => {
    e.preventDefault();                            // niente salto in cima
    clearTimeout(tapTimer);
    taps += 1;
    tapTimer = setTimeout(() => { taps = 0; }, 900);
    if (taps >= 5) { taps = 0; eggParty(); }
  });
})();
