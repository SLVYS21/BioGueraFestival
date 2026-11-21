/* Festival Bio Guera — contrôle des billets à l'entrée
   Caméra → QR → POST /scan (API billetterie) → entrée enregistrée en base, puis licence Chariow activée en arrière-plan.
   Lecture QR : BarcodeDetector natif (Chrome Android) sinon jsQR (iPhone, Firefox), chargé à la demande. */
(() => {
  'use strict';
  const B = window.FBG.billetterie;
  const API = (B.api || '').replace(/\/$/, '');
  const NAMES = Object.fromEntries(B.categories.map((c) => [c.id, c.nom]));
  const $ = (s) => document.querySelector(s);
  const ss = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* */ } },
  };
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } },
  };

  const setup = $('[data-setup]');
  const scanUI = $('[data-scan]');
  const res = $('[data-result]');
  const video = $('[data-video]');
  const camhint = $('[data-camhint]');
  let pin = ss.get('fbg.pin');
  let gate = ls.get('fbg.gate') || '';
  let count = +(ss.get('fbg.count') || 0);
  let busy = false;
  let last = { code: '', at: 0 };
  let stream = null;
  let wake = null;

  /* ---------- Appel API ---------- */
  async function post(key) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch(`${API}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Staff-Pin': pin },
        body: JSON.stringify({ key, gate }),
        signal: ctrl.signal,
      });
      if (r.status === 401) return { result: 'pin' };
      return await r.json();
    } catch {
      return { result: 'offline' };
    } finally {
      clearTimeout(to);
    }
  }

  /* ---------- Écran de démarrage ---------- */
  const sf = $('[data-setup-form]');
  sf.elements.gate.value = gate;
  sf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-setup-err]');
    if (!API) { err.textContent = 'API non configurée (js/data.js → billetterie.api).'; return; }
    pin = sf.elements.pin.value.trim();
    gate = sf.elements.gate.value.trim() || 'Porte A';
    if (!pin) { err.textContent = 'Saisissez le code équipe.'; return; }
    err.textContent = 'Vérification…';
    const r = await post(''); // clé vide : vérifie seulement le code équipe
    if (r.result === 'pin') { err.textContent = 'Code équipe incorrect.'; return; }
    if (r.result === 'offline') { err.textContent = 'Pas de connexion internet. Le contrôle a besoin du réseau.'; return; }
    err.textContent = '';
    ss.set('fbg.pin', pin);
    ls.set('fbg.gate', gate);
    start();
  });

  $('[data-quit]').addEventListener('click', () => {
    stop();
    ss.set('fbg.pin', '');
    pin = '';
    scanUI.hidden = true;
    setup.hidden = false;
  });

  /* ---------- Caméra + lecture ---------- */
  let detect = null;
  async function reader() {
    if ('BarcodeDetector' in window) {
      try {
        const f = await window.BarcodeDetector.getSupportedFormats();
        if (f.includes('qr_code')) {
          const bd = new window.BarcodeDetector({ formats: ['qr_code'] });
          return async () => { const c = await bd.detect(video); return c[0] ? c[0].rawValue : null; };
        }
      } catch { /* repli jsQR */ }
    }
    await new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/jsQR.min.js';
      s.onload = ok;
      s.onerror = ko;
      document.head.append(s);
    });
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    return async () => {
      const w = 560;
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 420;
      cv.width = w; cv.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const code = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      return code ? code.data : null;
    };
  }

  async function start() {
    setup.hidden = true;
    scanUI.hidden = false;
    $('[data-gate]').textContent = gate;
    paintCount();
    try { wake = await navigator.wakeLock.request('screen'); } catch { /* non supporté */ }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
      video.srcObject = stream;
      await video.play();
      detect = detect || await reader();
      camhint.textContent = 'Visez le QR code du billet';
      loop();
    } catch {
      camhint.textContent = 'Caméra indisponible : autorisez l’accès à la caméra, ou saisissez le n° du billet ci-dessous.';
    }
  }
  function stop() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (wake) wake.release().catch(() => {});
    wake = null;
  }

  async function loop() {
    if (!stream) return;
    if (!busy && video.readyState >= 2) {
      try {
        const code = await detect();
        if (code && !(code === last.code && Date.now() - last.at < 6000)) {
          last = { code, at: Date.now() };
          await check(code);
        }
      } catch { /* image illisible */ }
    }
    setTimeout(loop, 140);
  }

  $('[data-manual]').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = e.target.elements.key.value.trim();
    if (!v) return;
    e.target.elements.key.value = '';
    check(v);
  });

  /* ---------- Résultat ---------- */
  const paintCount = () => {
    $('[data-count]').textContent = count;
    $('[data-count-s]').textContent = count > 1 ? 's' : '';
    $('[data-count-s2]').textContent = count > 1 ? 's' : '';
  };
  const time = (iso) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });
  let beepCtx = null;
  const beep = (ok) => {
    try {
      beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)();
      const seq = ok ? [[1046, 0, 0.12]] : [[220, 0, 0.18], [220, 0.24, 0.18]];
      seq.forEach(([f, t0, d]) => {
        const o = beepCtx.createOscillator();
        const g = beepCtx.createGain();
        o.frequency.value = f;
        o.type = ok ? 'sine' : 'square';
        g.gain.setValueAtTime(0.18, beepCtx.currentTime + t0);
        g.gain.exponentialRampToValueAtTime(0.001, beepCtx.currentTime + t0 + d);
        o.connect(g).connect(beepCtx.destination);
        o.start(beepCtx.currentTime + t0);
        o.stop(beepCtx.currentTime + t0 + d);
      });
    } catch { /* audio indisponible */ }
  };

  let autoClose = null;
  function showResult(kind, { icon, title, tier, name, detail }) {
    res.className = `res res--${kind}`;
    res.dataset.tier = tier || '';
    $('[data-res-icon]').textContent = icon;
    $('[data-res-title]').textContent = title;
    $('[data-res-tier]').textContent = tier ? `Billet ${NAMES[tier] || tier}` : '';
    $('[data-res-name]').textContent = name || '';
    $('[data-res-detail]').textContent = detail || '';
    res.hidden = false;
    if (navigator.vibrate) navigator.vibrate(kind === 'ok' ? 90 : [220, 90, 220]);
    beep(kind === 'ok');
    clearTimeout(autoClose);
    // Validé : retour auto au scan. Refus : l'agent doit lire, puis toucher l'écran.
    if (kind === 'ok') autoClose = setTimeout(closeResult, 2200);
    $('[data-res-next]').focus({ preventScroll: true });
  }
  function closeResult() {
    clearTimeout(autoClose);
    res.hidden = true;
    busy = false;
  }
  $('[data-res-next]').addEventListener('click', closeResult);
  res.addEventListener('click', (e) => { if (e.target === res) closeResult(); });

  async function check(raw) {
    busy = true;
    camhint.textContent = 'Vérification…';
    const r = await post(raw);
    camhint.textContent = 'Visez le QR code du billet';
    const t = r.ticket || {};
    switch (r.result) {
      case 'ok': {
        count += 1;
        ss.set('fbg.count', String(count));
        paintCount();
        const e = t.entries;
        showResult('ok', {
          icon: '✓', title: 'Entrée validée', tier: t.tier, name: t.holder,
          detail: e && e.max > 1 ? `Encore ${e.remaining} entrée${e.remaining > 1 ? 's' : ''} sur ce billet` : '',
        });
        break;
      }
      case 'used':
        showResult('err', {
          icon: '✕', title: 'Déjà utilisé', tier: t.tier, name: t.holder,
          detail: r.last ? `Scanné ${time(r.last.at)}${r.last.gate ? ` · ${r.last.gate}` : ''}` : 'Ce billet est déjà entré.',
        });
        break;
      case 'revoked':
        showResult('err', { icon: '✕', title: 'Billet annulé', tier: t.tier, name: t.holder, detail: 'Billet remboursé ou annulé par l’organisation.' });
        break;
      case 'expired':
        showResult('err', { icon: '✕', title: 'Billet expiré', tier: t.tier, name: t.holder });
        break;
      case 'invalid':
        showResult('err', { icon: '✕', title: 'Billet inconnu', detail: 'Ce code ne correspond à aucun billet du festival.' });
        break;
      case 'pin':
        stop();
        scanUI.hidden = true;
        setup.hidden = false;
        busy = false;
        $('[data-setup-err]').textContent = 'Code équipe modifié ou incorrect : reconnectez-vous.';
        break;
      case 'offline':
        showResult('warn', { icon: '!', title: 'Pas de réseau', detail: 'Le billet n’a PAS été vérifié. Rapprochez-vous du Wi-Fi ou attendez le réseau, puis rescannez.' });
        last = { code: '', at: 0 };
        break;
      case 'unverified':
        showResult('warn', { icon: '!', title: 'Non vérifié', detail: 'Billet absent de la liste locale et service de vérification injoignable. Notez le n° et le nom, puis rescannez dans une minute.' });
        last = { code: '', at: 0 };
        break;
      case 'busy':
        showResult('warn', { icon: '!', title: 'Serveur saturé', detail: 'Le billet n’a PAS été vérifié. Patientez 5 secondes et rescannez.' });
        last = { code: '', at: 0 };
        break;
      default:
        showResult('warn', { icon: '!', title: 'Erreur de configuration', detail: `Prévenez l’organisation. ${r.message || r.error || ''}` });
    }
  }

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && !scanUI.hidden && !wake) {
      try { wake = await navigator.wakeLock.request('screen'); } catch { /* */ }
    }
  });

  if (pin && API) start();
})();
