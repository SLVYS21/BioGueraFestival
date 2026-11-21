/* Festival Bio Guera — génération des billets (canvas).
   Fond pré-rendu par catégorie (assets/billets/<tier>.jpg, 186 x 66 mm à 12 px/mm, généré par
   source/da2/build_billets_web.py) + éléments propres au billet : QR, n° (= clé de licence Chariow), titulaire.
   Dépend de js/vendor/qrcode.min.js (qrcode-generator, MIT). */
(() => {
  'use strict';
  const W_MM = 186;
  const STUB_X = 143;
  // Couleurs du talon par catégorie (identiques à billet_web_tpl.html)
  const STUB = {
    standard: { text: '#FFFFFF', sub: '#E6EAFB' },
    premium: { text: '#FFFFFF', sub: '#D5DAF5' },
    vip: { text: '#F5EFE6', sub: '#CFCBC4' },
  };
  const STAMP = {
    used: 'DÉJÀ UTILISÉ',
    revoked: 'BILLET ANNULÉ',
    expired: 'BILLET EXPIRÉ',
    sample: 'SPÉCIMEN',
  };
  const bgCache = {};

  const loadBg = (tier) => bgCache[tier] || (bgCache[tier] = new Promise((ok, ko) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => ok(img);
    img.onerror = () => { delete bgCache[tier]; ko(new Error('Fond du billet introuvable')); };
    img.src = new URL(`assets/billets/${tier}.jpg`, document.baseURI).href;
  }));

  const fonts = () => (document.fonts
    ? Promise.all(['800 40px Montserrat', '600 40px Montserrat', '400 40px Anton'].map((f) => document.fonts.load(f)))
    : Promise.resolve());

  // URL encodée dans le QR : un téléphone quelconque ouvre le billet, le scanner d'accueil en extrait la clé.
  const ticketUrl = (key) => {
    const site = (window.FBG && window.FBG.billetterie && window.FBG.billetterie.site) || location.origin;
    return `${site.replace(/\/$/, '')}/billet.html?k=${encodeURIComponent(key)}`;
  };

  const fit = (ctx, text, maxW, size, weight, family) => {
    let s = size;
    ctx.font = `${weight} ${s}px ${family}`;
    while (ctx.measureText(text).width > maxW && s > size * 0.6) { s -= 1; ctx.font = `${weight} ${s}px ${family}`; }
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  };

  /**
   * @param {{key:string, tier:'standard'|'premium'|'vip', holder?:string, status?:string}} t
   * @returns {Promise<HTMLCanvasElement>}
   */
  async function render(t) {
    const [bg] = await Promise.all([loadBg(t.tier), fonts()]);
    const W = bg.naturalWidth;
    const H = bg.naturalHeight;
    const mm = W / W_MM;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');

    // Découpe : coins arrondis + encoches de part et d'autre de la perforation
    const r = 2.4 * mm;
    const notch = 2.2 * mm;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(STUB_X * mm - notch, 0);
    ctx.arc(STUB_X * mm, 0, notch, Math.PI, 0, true);
    ctx.lineTo(W - r, 0);
    ctx.quadraticCurveTo(W, 0, W, r);
    ctx.lineTo(W, H - r);
    ctx.quadraticCurveTo(W, H, W - r, H);
    ctx.lineTo(STUB_X * mm + notch, H);
    ctx.arc(STUB_X * mm, H, notch, 0, Math.PI, true);
    ctx.lineTo(r, H);
    ctx.quadraticCurveTo(0, H, 0, H - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(bg, 0, 0, W, H);

    // QR dans le cadre blanc pré-rendu (x 4,6 mm, y 19,4 mm, 24,4 mm de côté)
    const box = { x: (STUB_X + 4.6) * mm, y: 19.4 * mm, s: 24.4 * mm };
    const qr = window.qrcode(0, 'M');
    qr.addData(ticketUrl(t.key));
    qr.make();
    const n = qr.getModuleCount();
    const area = box.s - 2.6 * mm; // zone calme ≈ 1,3 mm de chaque côté
    const cell = Math.floor(area / n);
    const off = Math.round((box.s - cell * n) / 2);
    ctx.fillStyle = '#0E0E10';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.isDark(y, x)) ctx.fillRect(box.x + off + x * cell, box.y + off + y * cell, cell, cell);
      }
    }

    // N° et titulaire
    const col = STUB[t.tier] || STUB.standard;
    const sx = (STUB_X + 4.6) * mm;
    const maxW = 34 * mm;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = col.sub;
    ctx.font = `800 ${Math.round(1.5 * mm)}px Montserrat`;
    ctx.fillText('N° DE BILLET', sx, 51.6 * mm);
    ctx.fillStyle = col.text;
    const k = fit(ctx, t.key, maxW, Math.round(2.4 * mm), 800, 'Montserrat');
    ctx.fillText(k, sx, 55.2 * mm);
    if (t.holder) {
      ctx.fillStyle = col.sub;
      const h = fit(ctx, t.holder.toUpperCase(), maxW, Math.round(1.9 * mm), 600, 'Montserrat');
      ctx.fillText(h, sx, 59.4 * mm);
    }

    // Tampon d'état (billet utilisé, annulé…) : on ne diffuse jamais un billet invalide qui « a l'air » valide
    const stamp = STAMP[t.status];
    if (stamp) {
      ctx.save();
      ctx.translate(72 * mm, 33 * mm);
      ctx.rotate(-0.16);
      ctx.font = `400 ${Math.round(11 * mm)}px Anton`;
      const w = ctx.measureText(stamp).width + 8 * mm;
      ctx.lineWidth = 1.1 * mm;
      ctx.strokeStyle = t.status === 'sample' ? 'rgba(255,255,255,.9)' : '#E5484D';
      ctx.fillStyle = t.status === 'sample' ? 'rgba(14,14,16,.35)' : 'rgba(255,255,255,.88)';
      ctx.beginPath();
      ctx.rect(-w / 2, -8.4 * mm, w, 16.8 * mm);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = t.status === 'sample' ? '#FFFFFF' : '#C62828';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stamp, 0, 0.6 * mm);
      ctx.restore();
    }
    return c;
  }

  // Export JPEG sur fond blanc (≈ 5x plus léger qu'un PNG, important en données mobiles)
  function toBlob(canvas, type = 'image/jpeg') {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 0);
    return new Promise((ok) => out.toBlob(ok, type, 0.92));
  }

  const fileName = (t) => `Billet-BioGuera-${t.tier.toUpperCase()}-${t.key.replace(/[^A-Za-z0-9]/g, '').slice(-8)}.jpg`;

  window.FBGTicket = { render, toBlob, fileName, ticketUrl, preload: loadBg };
})();
