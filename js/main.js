/* Festival Bio Guera 2026 — interactions
   Vanilla JS, sans dépendance : marche hors-ligne et en file://. */
(() => {
  'use strict';
  const D = window.FBG;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  // espace insécable classique : Anton/Oswald n'ont pas le glyphe U+202F renvoyé par toLocaleString
  const fmt = (n) => n.toLocaleString('fr-FR').replace(/[\u202F\u2009]/g, '\u00A0');
  document.documentElement.classList.remove('no-js');

  /* ---------- Slogans fantômes : rangées en dérive lente ---------- */
  const SLOGANS = ['GBAASI 1856', 'SIÈGE DE BEMBÈRÈKÈ', 'CONTRE LE TRAVAIL FORCÉ', 'BAOURA 1916', 'CONTRE L’IMPÔT DE CAPITATION', 'CONTRE LA CONSCRIPTION', 'LIBERTÉ ET DIGNITÉ', '17 DÉCEMBRE 1916'];
  $$('[data-ghost]').forEach((g) => {
    const rows = Math.ceil((g.offsetHeight || 1200) / 52) + 1;
    let html = '';
    for (let i = 0; i < rows; i++) {
      const s = [...SLOGANS.slice((i * 3) % 8), ...SLOGANS.slice(0, (i * 3) % 8)];
      const line = (s.join('  ·  ') + '  ·  ').repeat(2);
      html += `<div class="ghost__row" style="margin-left:${-((i * 173) % 420)}px"><span>${line}</span><span>${line}</span></div>`;
    }
    g.innerHTML = html;
  });

  /* ---------- Entrée du hero ---------- */
  $$('.hero__title .line > span').forEach((s, i) => s.style.setProperty('--d', `${120 + i * 120}ms`));
  const ready = () => requestAnimationFrame(() => document.body.classList.add('is-ready'));
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(ready);
  setTimeout(ready, 1200);

  /* ---------- Révélations au scroll (stagger par groupe) ---------- */
  const groups = new Map();
  $$('[data-in]').forEach((n) => {
    const p = n.parentElement;
    const i = groups.get(p) || 0;
    groups.set(p, i + 1);
    n.style.setProperty('--d', `${Math.min(i * 90, 360)}ms`);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  $$('[data-in], .shape').forEach((n) => io.observe(n));

  /* ---------- Navigation ---------- */
  const nav = $('[data-nav]');
  const burger = $('.nav__burger');
  const menu = $('#menu');
  let lastY = scrollY;
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('menu-open', open);
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); }
    else { menu.classList.remove('is-open'); setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 300); }
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });

  const navLinks = $$('.nav__links a');
  const secIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${e.target.id}` ? 'true' : 'false'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['histoire', 'carte', 'programme', 'match', 'billetterie', 'infos'].forEach((id) => { const s = document.getElementById(id); if (s) secIO.observe(s); });

  /* ---------- Scroll : nav, parallaxe, frise ---------- */
  const para = $$('[data-parallax]');
  const friezes = $$('.frieze');
  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-solid', y > 40);
    if (!document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > 600 && y > lastY + 4);
    if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;
    if (!reduce) {
      const vh = innerHeight;
      para.forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const off = (r.top + r.height / 2 - vh / 2) * parseFloat(n.dataset.parallax);
        n.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
      });
      friezes.forEach((f) => f.style.setProperty('--fx', `${(-y * 0.12).toFixed(1)}px`));
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Compte à rebours ---------- */
  const cd = $('[data-countdown]');
  const kickoff = new Date(D.kickoff).getTime();
  const show = new Date(D.showtime).getTime();
  const H = 3600e3;
  const tickCountdown = () => {
    const now = Date.now();
    const lbl = $('.countdown__lbl', cd);
    const val = $('.countdown__val', cd);
    const dhm = (ms) => [Math.floor(ms / 864e5), Math.floor((ms % 864e5) / H), Math.floor((ms % H) / 6e4)];
    if (now < kickoff) {
      const [d, h, m] = dhm(kickoff - now);
      $('[data-cd="d"]', cd).textContent = d;
      $('[data-cd="h"]', cd).textContent = String(h).padStart(2, '0');
      $('[data-cd="m"]', cd).textContent = String(m).padStart(2, '0');
      return;
    }
    if (now < kickoff + 2 * H) { lbl.textContent = 'En ce moment'; val.textContent = 'Match en cours'; return; }
    if (now < show) {
      const [, h, m] = dhm(show - now);
      lbl.textContent = 'Soirée spectacle dans';
      val.innerHTML = `${h}<i>h</i>${String(m).padStart(2, '0')}<i>min</i>`;
      return;
    }
    if (now < show + 6 * H) { lbl.textContent = 'En ce moment'; val.textContent = 'Soirée en cours'; return; }
    lbl.textContent = 'Festival 2026'; val.textContent = 'Merci d’avoir été là';
  };
  tickCountdown();
  setInterval(tickCountdown, 30e3);

  /* =======================================================================
     CARTE : caméra (viewBox) pilotée par le récit
     ======================================================================= */
  const M = window.BENIN_MAP;
  const svg = $('[data-map-svg]');
  const mapBox = $('[data-map]');
  const stepsEl = $('[data-steps]');
  if (M && svg && stepsEl) {
    const { lon0, lat1, k, c } = M.proj;
    const P = (lon, lat) => [(lon - lon0) * c * k, (lat1 - lat) * k];
    svg.setAttribute('viewBox', M.viewBox.join(' '));
    svg.setAttribute('aria-label', 'Carte du Bénin');
    const gDeps = el('g', {}, svg);
    const gComs = el('g', {}, svg);
    const gLbls = el('g', {}, svg);
    const gRoutes = el('g', {}, svg);
    const gPins = el('g', {}, svg);
    const depEls = {};
    const comEls = {};
    M.deps.forEach((d) => { depEls[d.id] = el('path', { d: d.d, class: 'dep' }, gDeps); });
    M.communes.forEach((d) => { comEls[d.id] = el('path', { d: d.d, class: 'com' }, gComs); });
    const scaled = []; // éléments à taille constante à l'écran
    M.deps.forEach((d) => {
      if (d.id === 'littoral') return;
      const b = depEls[d.id].getBBox();
      const t = el('text', { class: 'dep-lbl', 'text-anchor': 'middle' }, gLbls);
      t.textContent = d.name;
      scaled.push({ n: t, x: b.x + b.width / 2, y: b.y + b.height / 2 + ({ oueme: 10, atlanique: -6 }[d.id] || 0) });
    });

    // Lieux connus (pour les tracés)
    const places = {};
    D.etapes.forEach((s) => s.pins.forEach((p) => { places[p.id] = P(...p.ll); }));

    let vb = M.viewBox.slice();
    let unit = 1;
    const applyScale = () => {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      unit = 1 / Math.min(r.width / vb[2], r.height / vb[3]);
      scaled.forEach((s) => s.n.setAttribute('transform', `translate(${s.x} ${s.y}) scale(${unit})`));
      $$('.route', gRoutes).forEach((r) => r.setAttribute('stroke-width', 3 * unit));
      mapBox.classList.toggle('is-zoomed', vb[2] < 200);
    };
    const setVB = (v) => { vb = v; svg.setAttribute('viewBox', v.map((x) => x.toFixed(2)).join(' ')); applyScale(); };
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // ≈ cubic-bezier(.65,0,.35,1)
    let raf = 0;
    const flyTo = (target) => {
      cancelAnimationFrame(raf);
      if (reduce) { setVB(target); return; }
      const from = vb.slice();
      const t0 = performance.now();
      const dur = 1100;
      const frame = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = ease(p);
        setVB(from.map((f, i) => f + (target[i] - f) * e));
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    const frameOf = (z) => {
      const [x0, y0] = P(z[0], z[3]);
      const [x1, y1] = P(z[2], z[1]);
      return [x0, y0, x1 - x0, y1 - y0];
    };

    const drawPin = (p, i) => {
      const [x, y] = P(...p.ll);
      const cls = ['pin', p.minor && 'pin--minor', p.cross && 'pin--cross', p.star && 'pin--star'].filter(Boolean).join(' ');
      const g = el('g', { class: cls }, gPins);
      const inner = el('g', { class: 'pin__pop', style: `animation-delay:${450 + i * 140}ms` }, g);
      const r = p.minor ? 4.5 : 7;
      if (!p.minor) el('circle', { class: 'pin__ring', r }, inner);
      el('circle', { class: 'pin__dot', r }, inner);
      const lg = el('g', { class: 'pin__lbl', transform: `translate(${r + 6} ${-r - 16})` }, inner);
      const rect = el('rect', { rx: 3, height: 22, y: 0 }, lg);
      const t = el('text', { x: 8, y: 15 }, lg);
      t.textContent = p.cross ? `${p.label} · 17.12.1916` : p.label;
      rect.setAttribute('width', t.getComputedTextLength() + 16);
      scaled.push({ n: g, x, y, pin: true });
    };
    const drawRoute = ([a, b]) => {
      if (!places[a] || !places[b]) return;
      const [x1, y1] = places[a];
      const [x2, y2] = places[b];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const mx = (x1 + x2) / 2 - dy * 0.22;
      const my = (y1 + y2) / 2 + dx * 0.22;
      const path = el('path', { class: 'route', d: `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`, pathLength: 1, 'stroke-width': 3 * unit }, gRoutes);
      requestAnimationFrame(() => requestAnimationFrame(() => path.classList.add('is-drawn')));
    };

    // Récit
    stepsEl.innerHTML = D.etapes.map((s, i) => `
      <li class="step" data-etape="${i}">
        <span class="step__marker" aria-hidden="true"><svg><use href="#cauri"/></svg></span>
        <div class="step__card">
          <span class="step__year">${s.annee}</span>
          <h3 class="step__title">${s.titre}</h3>
          <p class="step__text">${s.texte}</p>
          ${s.chips ? `<ul class="step__chips">${s.chips.map((c) => `<li>${c}</li>`).join('')}</ul>` : ''}
          ${s.cta ? `<a class="btn btn--accent btn--sm step__cta" href="#programme"><span>Voir le programme</span><span class="btn__ic"><svg><use href="#arrow"/></svg></span></a>` : ''}
        </div>
      </li>`).join('');
    const steps = $$('.step', stepsEl);
    const yearEl = $('[data-map-year]');
    let current = -1;
    const activate = (i) => {
      if (i === current) return;
      current = i;
      const s = D.etapes[i];
      steps.forEach((n, j) => { n.classList.toggle('is-active', j === i); n.classList.toggle('is-past', j < i); });
      stepsEl.style.setProperty('--prog', `${(i / (steps.length - 1)) * 100}%`);
      Object.entries(depEls).forEach(([id, n]) => n.classList.toggle('is-on', id === s.dep));
      Object.entries(comEls).forEach(([id, n]) => n.classList.toggle('is-on', (s.focus || []).includes(id)));
      mapBox.classList.toggle('is-mourning', !!s.mourning);
      // pins & tracés
      for (let j = scaled.length - 1; j >= 0; j--) if (scaled[j].pin) scaled.splice(j, 1);
      gPins.innerHTML = '';
      gRoutes.innerHTML = '';
      s.pins.forEach(drawPin);
      if (s.route) drawRoute(s.route);
      flyTo(frameOf(s.zoom));
      applyScale();
      // année
      yearEl.classList.add('is-out');
      setTimeout(() => { yearEl.textContent = s.annee.replace('17 déc. ', '').replace('18 déc. ', '').replace('Août ', ''); yearEl.classList.remove('is-out'); }, reduce ? 0 : 250);
    };
    let stepIO;
    const watchSteps = () => {
      if (stepIO) stepIO.disconnect();
      const mobile = matchMedia('(max-width: 900px)').matches;
      stepIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) activate(+e.target.dataset.etape); });
      }, { rootMargin: mobile ? '-72% 0px -27% 0px' : '-50% 0px -49% 0px' });
      steps.forEach((n) => stepIO.observe(n));
    };
    watchSteps();
    matchMedia('(max-width: 900px)').addEventListener('change', watchSteps);
    addEventListener('resize', applyScale);
    activate(0);
    setVB(frameOf(D.etapes[0].zoom));
  }

  /* ---------- Compteurs ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const n = e.target;
      const to = +n.dataset.count;
      if (reduce) { n.textContent = to; return; }
      const from = to > 1000 ? to - 90 : 0;
      const t0 = performance.now();
      const run = (t) => {
        const p = Math.min(1, (t - t0) / 1400);
        n.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((n) => countIO.observe(n));

  /* ---------- Programme : panneaux extensibles ---------- */
  const panels = $$('[data-panel]');
  const openPanel = (p) => panels.forEach((q) => {
    q.classList.toggle('is-open', q === p);
    $('.panel__tab', q).setAttribute('aria-expanded', q === p);
  });
  panels.forEach((p) => {
    $('.panel__tab', p).addEventListener('click', () => openPanel(p));
    let t;
    p.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover) and (min-width: 901px)').matches) t = setTimeout(() => openPanel(p), 180); });
    p.addEventListener('mouseleave', () => clearTimeout(t));
  });

  /* =======================================================================
     MATCH : planche de composition
     ======================================================================= */
  const lu = $('[data-lineup]');
  if (lu && D.match) {
    const pitch = $('[data-pitch]');
    const pitchBox = $('.pitch', lu);
    const tokens = {};
    ['home', 'away'].forEach((side, sIdx) => {
      const T = D.match[side];
      const r = $(`[data-roster="${side}"]`, lu);
      r.innerHTML = `
        <div class="roster__head"><img src="${T.crest}" alt="" width="40" height="40"><div><small>${T.schema}</small><b>${T.nom}</b></div></div>
        <ol>${T.joueurs.map((j, i) => `<li data-p="${side}-${j.n}" style="--d:${120 + i * 55}ms"><span class="no">${j.n}</span><span class="nm">${j.nom}${j.cap ? '<abbr class="cap" title="Capitaine">C</abbr>' : ''}</span><span class="ps">${j.poste}</span></li>`).join('')}</ol>
        <p class="roster__coach">${T.coach}</p>`;
      [...T.joueurs].sort((a, b) => a.x - b.x).forEach((j, i) => {
        const left = side === 'home' ? 3 + j.x * 0.47 : 97 - j.x * 0.47; // marge pour que le gardien reste sur le terrain
        const top = 6 + (side === 'home' ? j.y : 100 - j.y) * 0.88;
        const t = document.createElement('div');
        t.className = `tok tok--${side}`;
        t.dataset.p = `${side}-${j.n}`;
        t.style.cssText = `left:${left}%;top:${top}%;--d:${300 + i * 70 + sIdx * 35}ms`;
        t.innerHTML = `<span class="tok__n">${j.n}${j.cap ? '<span class="tok__cap">C</span>' : ''}</span><span class="tok__nm">${j.nom.replace(/^[A-Z]\. /, '')}</span>`;
        pitch.appendChild(t);
        tokens[t.dataset.p] = t;
      });
    });
    // survol liste ↔ terrain
    const hl = (id, on) => { $$(`[data-p="${id}"]`, lu).forEach((n) => n.classList.toggle('is-hl', on)); };
    lu.addEventListener('pointerover', (e) => { const n = e.target.closest('[data-p]'); if (n) hl(n.dataset.p, true); });
    lu.addEventListener('pointerout', (e) => { const n = e.target.closest('[data-p]'); if (n) hl(n.dataset.p, false); });
    // onglets mobiles
    const tabs = $$('[role="tab"]', lu);
    const mq = matchMedia('(max-width: 960px)');
    const tablist = $('[role="tablist"]', lu);
    tablist.insertAdjacentHTML('afterbegin', '<span class="lineup__ind" aria-hidden="true"></span>');
    const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)';
    const EASE_IN = 'cubic-bezier(.4,0,1,1)';
    let current = null;
    const roster = (s) => $(`[data-roster="${s}"]`, lu);
    const apply = (side) => {
      tabs.forEach((b) => b.setAttribute('aria-selected', b.dataset.team === side));
      tablist.dataset.active = side;
      ['home', 'away'].forEach((s) => { roster(s).hidden = mq.matches && s !== side; });
      pitchBox.classList.toggle('dim-away', mq.matches && side === 'home');
      pitchBox.classList.toggle('dim-home', mq.matches && side === 'away');
    };
    // Changement d'équipe animé (mobile) : sortie 160 ms ease-in, entrée 320 ms ease-out depuis le côté de l'équipe,
    // lignes en cascade (35 ms), rebond des joueurs choisis sur le terrain (gardien → attaque).
    const select = async (side, animate = true) => {
      if (side === current) return;
      const prev = current;
      current = side;
      // un nouveau changement annule net le précédent (évite une liste figée à opacité 0 sur double tap)
      [roster('home'), roster('away'), pitch].forEach((r) => r.getAnimations && r.getAnimations({ subtree: true }).forEach((a) => a.cancel()));
      if (!animate || !prev || !mq.matches || reduce || !roster(prev).animate) { apply(side); return; }
      const dir = side === 'away' ? 1 : -1;
      tabs.forEach((b) => b.setAttribute('aria-selected', b.dataset.team === side));
      tablist.dataset.active = side;
      if (!roster(prev).hidden) {
        const out = roster(prev).animate(
          [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-dir * 40}px)`, opacity: 0 }],
          { duration: 160, easing: EASE_IN, fill: 'forwards' });
        await out.finished.catch(() => {});
        if (current !== side) return; // un changement plus récent a pris la main
        out.cancel();
      }
      apply(side);
      const inc = roster(side);
      inc.animate(
        [{ transform: `translateX(${dir * 48}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
        { duration: 320, easing: EASE_OUT });
      $$('li', inc).forEach((li, i) => li.animate(
        [{ transform: `translateX(${dir * 24}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
        { duration: 300, delay: 60 + i * 35, easing: EASE_OUT, fill: 'backwards' }));
      $$(`.tok--${side} .tok__n`, pitch)
        .sort((a, b) => parseFloat(a.parentNode.style.left) - parseFloat(b.parentNode.style.left)) // gardien d'abord
        .forEach((n, i) => n.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }],
          { duration: 380, delay: 80 + (side === 'away' ? 10 - i : i) * 28, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
    };
    tabs.forEach((b) => b.addEventListener('click', () => select(b.dataset.team)));
    // Balayage horizontal sur la liste ou le terrain pour changer d'équipe
    let sx = 0;
    let sy = 0;
    lu.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lu.addEventListener('touchend', (e) => {
      if (!mq.matches) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) select(dx < 0 ? 'away' : 'home');
    }, { passive: true });
    $('[role="tablist"]', lu).addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const next = tabs.find((b) => b.getAttribute('aria-selected') !== 'true');
      select(next.dataset.team); next.focus();
    });
    mq.addEventListener('change', () => apply(current));
    select('home', false);
    if (!D.match.provisoire) $('[data-provisoire]').hidden = true;
    new IntersectionObserver((entries, o) => {
      if (entries[0].isIntersecting) { lu.classList.add('is-in'); o.disconnect(); }
    }, { threshold: 0.25 }).observe(lu);
  }

  /* =======================================================================
     BILLETTERIE — paiement Chariow via l'API billetterie (billetterie-api/), billet = licence
     ======================================================================= */
  const form = $('[data-order]');
  if (form) {
    const B = D.billetterie;
    const open = !!B.api;
    const store = {
      get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
      set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* navigation privée */ } },
    };
    const now = Date.now();
    const cats = B.categories.map((c) => ({ ...c, closed: !!c.jusqua && now > Date.parse(c.jusqua) }));
    const firstOpen = cats.find((c) => !c.closed) || cats[0];
    let tier = firstOpen.id;
    const cat = () => cats.find((c) => c.id === tier);

    const buy = $('[data-buy]', form);
    const buyLbl = $('[data-buy-label]', form);
    const hint = $('[data-hint]', form);
    const canvas = $('[data-tix-canvas]');
    const prev = $('[data-ticket]');

    $('[data-tiers]', form).innerHTML = cats.map((c) => `
      <label class="tier tier--${c.id}${c.closed ? ' is-closed' : ''}">
        <input type="radio" name="tier" value="${c.id}"${c.id === tier ? ' checked' : ''}${c.closed ? ' disabled' : ''}>
        <span class="tier__body">
          <span class="tier__name">${c.nom}</span>
          <span class="tier__price">${fmt(c.prix)}<small>F CFA</small></span>
          <span class="tier__note">${c.closed ? 'Prévente terminée' : c.note}</span>
          ${c.avantages && c.avantages.length ? `<span class="tier__perks">${c.avantages.join(' · ')}</span>` : ''}
        </span>
      </label>`).join('');

    const sel = $('[data-country]', form);
    sel.innerHTML = B.pays.map((p) => `<option value="${p.code}">${p.code} ${p.ind}</option>`).join('');
    const phone = form.elements.phone;
    const syncPh = () => { phone.placeholder = (B.pays.find((p) => p.code === sel.value) || B.pays[0]).ex; };
    sel.addEventListener('change', syncPh);

    // Pré-remplissage : un 2e billet (groupe, famille) se prend en quelques secondes
    const saved = store.get('fbg.buyer');
    if (saved) ['first_name', 'last_name', 'email', 'phone', 'country'].forEach((k) => { if (saved[k]) form.elements[k].value = saved[k]; });
    syncPh();

    /* Aperçu : vrai billet généré, tamponné SPÉCIMEN */
    const specimens = {};
    const drawPreview = () => {
      if (!window.FBGTicket || !canvas) return;
      const id = tier;
      const p = specimens[id] || (specimens[id] = window.FBGTicket.render({ key: 'FBG26-SPECIMEN', tier: id, holder: 'Votre nom ici', status: 'sample' }));
      p.then((c) => {
        if (id !== tier) return;
        canvas.width = c.width;
        canvas.height = c.height;
        canvas.getContext('2d').drawImage(c, 0, 0);
        canvas.setAttribute('aria-label', `Aperçu du billet ${cat().nom}, ${fmt(cat().prix)} F CFA`);
        if (!reduce) { prev.classList.remove('is-swap'); void prev.offsetWidth; prev.classList.add('is-swap'); }
      }).catch(() => {});
    };

    const render = () => {
      const c = cat();
      if (open) buyLbl.textContent = `Payer ${fmt(c.prix)} F · ${c.nom}`;
      prev.dataset.tier = tier;
      drawPreview();
    };
    form.addEventListener('change', (e) => { if (e.target.name === 'tier') { tier = e.target.value; render(); } });

    if (!open) {
      buy.disabled = true;
      buyLbl.textContent = 'Billetterie en ligne : ouverture prochaine';
      hint.textContent = 'La vente ouvre très prochainement sur cette page.';
    }

    /* Validation : message sous le champ fautif, focus sur le premier */
    const FIELDS = ['first_name', 'last_name', 'email', 'phone'];
    const setErr = (name, msg) => {
      const f = form.elements[name].closest('.field');
      f.classList.toggle('is-err', !!msg);
      $(`[data-err="${name}"]`, form).textContent = msg || '';
    };
    FIELDS.forEach((n) => form.elements[n].addEventListener('input', () => setErr(n, '')));
    const validate = (v) => {
      const e = {};
      if (!v.first_name) e.first_name = 'Indiquez votre prénom.';
      if (!v.last_name) e.last_name = 'Indiquez votre nom.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = 'Adresse e-mail invalide (ex. aicha@exemple.com).';
      if (v.phone.replace(/\D/g, '').length < 8) e.phone = 'Numéro trop court : indiquez le numéro qui va payer.';
      return e;
    };
    const showErrs = (errs) => {
      FIELDS.forEach((n) => setErr(n, errs[n]));
      const first = FIELDS.find((n) => errs[n]);
      if (first) form.elements[first].focus();
      return !!first;
    };
    const say = (msg, kind) => { hint.textContent = msg; hint.className = `order__hint${kind ? ` is-${kind}` : ''}`; };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!open || buy.classList.contains('is-loading')) return;
      const v = {
        tier,
        first_name: form.elements.first_name.value.trim(),
        last_name: form.elements.last_name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        country: sel.value,
      };
      if (showErrs(validate(v))) return;
      const { tier: _t, ...buyer } = v;
      store.set('fbg.buyer', buyer);
      buy.classList.add('is-loading');
      buy.setAttribute('aria-busy', 'true');
      say('Connexion au paiement sécurisé…');
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 20000);
      try {
        const r = await fetch(`${B.api.replace(/\/$/, '')}/checkout`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v), signal: ctrl.signal,
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.sale_id && (d.checkout_url || d.step === 'completed')) {
          store.set('fbg.pending', { sale_id: d.sale_id, tier, at: Date.now() });
          say('Redirection vers le paiement…', 'ok');
          location.href = d.checkout_url || 'billet.html?retour=1';
          return;
        }
        if (d.errors) showErrs(d.errors);
        say(d.error || 'Le paiement n’a pas pu démarrer. Réessayez.', 'err');
      } catch {
        say('Connexion impossible. Vérifiez votre réseau, puis réessayez.', 'err');
      } finally {
        clearTimeout(to);
        buy.classList.remove('is-loading');
        buy.removeAttribute('aria-busy');
      }
    });
    render();

    // Billet : légère inclinaison suivant le pointeur (souris uniquement)
    if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      prev.addEventListener('pointermove', (e) => {
        const r = prev.getBoundingClientRect();
        prev.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
        prev.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 8}deg`);
      });
      prev.addEventListener('pointerleave', () => { prev.style.setProperty('--rx', '0deg'); prev.style.setProperty('--ry', '0deg'); });
    }
  }
})();
