/* Festival Bio Guera — page « Mon billet »
   1. Retour de paiement : interroge l'API billetterie jusqu'à ce que la vente soit payée et la licence émise.
   2. Affiche chaque billet (généré par js/ticket.js), avec téléchargement et partage.
   3. Garde les billets sur l'appareil (localStorage) : ils s'affichent même sans réseau devant le JPN. */
(() => {
  'use strict';
  const B = window.FBG.billetterie;
  const API = (B.api || '').replace(/\/$/, '');
  const $ = (s, c = document) => c.querySelector(s);
  const NAMES = Object.fromEntries(B.categories.map((c) => [c.id, c.nom]));
  const store = {
    get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* navigation privée */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch { /* idem */ } },
  };
  const list = $('[data-list]');
  const q = new URLSearchParams(location.search);

  /* ---------- Billets enregistrés ---------- */
  const saved = () => store.get('fbg.tickets') || [];
  const save = (t) => {
    const all = saved();
    const i = all.findIndex((x) => x.key === t.key);
    if (i >= 0) all[i] = { ...all[i], ...t };
    else all.unshift({ ...t, saved_at: Date.now() });
    store.set('fbg.tickets', all.slice(0, 30));
  };

  const fmtWhen = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });
  };
  const chip = (t) => {
    if (t.status === 'used') return ['used', t.first_used_at ? `Utilisé le ${fmtWhen(t.first_used_at)}` : 'Déjà utilisé'];
    if (t.status === 'revoked') return ['used', 'Billet annulé'];
    if (t.status === 'expired') return ['used', 'Billet expiré'];
    const e = t.entries;
    if (e && e.max > 1) return ['valid', `Valide · ${e.remaining} entrée${e.remaining > 1 ? 's' : ''} sur ${e.max}`];
    return ['valid', 'Valide · prêt à être scanné'];
  };

  const updateTitle = () => {
    const n = list.children.length;
    $('[data-title]').textContent = n > 1 ? 'Vos billets' : n === 1 ? 'Votre billet' : 'Mon billet';
  };

  async function show(t, { offline = false, first = false } = {}) {
    let card = list.querySelector(`[data-key="${CSS.escape(t.key)}"]`);
    if (!card) {
      card = document.createElement('article');
      card.className = 'tk';
      card.dataset.key = t.key;
      card.innerHTML = `
        <img class="tk__img" alt="">
        <div class="tk__bar">
          <span class="chip" data-chip></span>
          <div class="tk__actions">
            <button class="btn btn--light btn--sm" type="button" data-dl><span>Télécharger</span><span class="btn__ic"><svg><use href="#down"/></svg></span></button>
            <button class="btn btn--ghost btn--sm" type="button" data-share hidden><span>Partager</span><span class="btn__ic"><svg><use href="#share"/></svg></span></button>
          </div>
        </div>`;
      if (first) list.prepend(card); else list.append(card);
    }
    const [kind, label] = chip(t);
    const c = $('[data-chip]', card);
    c.className = `chip chip--${kind}`;
    c.textContent = offline ? `${label} · hors ligne` : label;
    card.classList.toggle('is-used', kind === 'used');

    const canvas = await window.FBGTicket.render(t);
    const img = $('.tk__img', card);
    img.alt = `Billet ${NAMES[t.tier] || ''} du Festival Bio Guera au nom de ${t.holder || 'du titulaire'}, n° ${t.key}`;
    const png = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
    if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
    img.dataset.url = URL.createObjectURL(png);
    img.src = img.dataset.url;

    const jpg = await window.FBGTicket.toBlob(canvas);
    const name = window.FBGTicket.fileName(t);
    $('[data-dl]', card).onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(jpg);
      a.download = name;
      document.body.append(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    };
    const file = new File([jpg], name, { type: 'image/jpeg' });
    const sh = $('[data-share]', card);
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      sh.hidden = false;
      sh.onclick = () => navigator.share({ files: [file], title: 'Mon billet Festival Bio Guera' }).catch(() => {});
    }
    updateTitle();
  }

  async function getTicket(key) {
    const r = await fetch(`${API}/ticket/${encodeURIComponent(key)}`);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.error || 'Billet introuvable.'); e.status = r.status; throw e; }
    return d.ticket;
  }

  /* ---------- Messages ---------- */
  const lead = (t) => { $('[data-lead]').textContent = t; };
  const notice = (title, text, cta = false) => {
    const n = $('[data-notice]');
    n.hidden = !title;
    $('[data-notice-title]').textContent = title || '';
    $('[data-notice-text]').textContent = text || '';
    $('[data-notice-cta]').hidden = !cta;
  };
  const wait = (on, title, text) => {
    const w = $('[data-wait]');
    w.hidden = !on;
    if (title) $('[data-wait-title]').textContent = title;
    if (text) $('[data-wait-text]').textContent = text;
  };

  /* ---------- Retour de paiement : attente de la vente puis de la licence ---------- */
  async function poll(pending) {
    wait(true);
    const started = Date.now();
    const LIMIT = 4 * 60 * 1000;
    for (;;) {
      let d = null;
      try {
        const r = await fetch(`${API}/sale/${encodeURIComponent(pending.sale_id)}`);
        d = await r.json().catch(() => null);
      } catch { /* réseau : on retente */ }
      if (d) {
        if (d.status === 'completed' && d.tickets && d.tickets.length) {
          store.del('fbg.pending');
          wait(false);
          d.tickets.forEach(save);
          for (const t of d.tickets) await show(t, { first: true });
          lead(d.tickets.length > 1
            ? 'Paiement confirmé. Téléchargez vos billets ou gardez cette page : ils restent sur ce téléphone.'
            : 'Paiement confirmé. Téléchargez votre billet ou gardez cette page : il reste sur ce téléphone. Une copie part aussi par e-mail.');
          list.firstElementChild && list.firstElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (d.status === 'issuing') wait(true, 'Paiement reçu. Création de votre billet…', 'Encore quelques secondes.');
        if (d.status === 'failed' || d.status === 'abandoned') {
          store.del('fbg.pending');
          wait(false);
          notice(d.status === 'failed' ? 'Le paiement n’a pas abouti' : 'Paiement abandonné',
            d.message || 'Aucun montant n’a été débité pour cette tentative. Vous pouvez recommencer.', true);
          return;
        }
        if (d.status === 'not_found') { store.del('fbg.pending'); wait(false); return; }
      }
      if (Date.now() - started > LIMIT) {
        wait(true, 'Toujours en attente de l’opérateur…',
          'Votre paiement n’est pas encore confirmé. Gardez cette page ouverte ou revenez plus tard : le billet apparaîtra ici dès la confirmation, et vous le recevrez par e-mail.');
        await new Promise((ok) => setTimeout(ok, 15000));
      } else {
        await new Promise((ok) => setTimeout(ok, 3000));
      }
    }
  }

  /* ---------- Recherche par n° ---------- */
  const lf = $('[data-lookup]');
  lf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = lf.elements.key;
    const field = input.closest('.field');
    const err = $('[data-lookup-err]');
    const key = input.value.trim().replace(/\s+/g, '');
    field.classList.remove('is-err');
    if (!key) { err.textContent = 'Collez le n° de billet reçu par e-mail.'; field.classList.add('is-err'); input.focus(); return; }
    const btn = lf.querySelector('button');
    btn.classList.add('is-loading');
    try {
      const t = await getTicket(key);
      save(t);
      await show(t, { first: true });
      input.value = '';
      list.firstElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (x) {
      err.textContent = x.status === 404 ? 'Aucun billet ne correspond à ce n°. Vérifiez qu’il est complet (tirets compris).' : 'Connexion impossible. Réessayez dans un instant.';
      field.classList.add('is-err');
    } finally {
      btn.classList.remove('is-loading');
    }
  });

  /* ---------- Démarrage ---------- */
  (async () => {
    if (!API) {
      lead('La billetterie en ligne ouvre très prochainement.');
      lf.closest('.lookup').hidden = true;
      return;
    }
    // Billets déjà sur l'appareil : affichage immédiat depuis le cache, puis rafraîchissement de leur état
    const mine = saved();
    for (const t of mine) await show(t, { offline: true }).catch(() => {});
    if (q.get('k')) {
      try { const t = await getTicket(q.get('k')); save(t); await show(t, { first: true }); }
      catch (x) { notice('Billet introuvable', x.status === 404 ? 'Ce lien ne correspond à aucun billet du festival.' : 'Connexion impossible pour le moment.'); }
    }
    const pending = store.get('fbg.pending');
    const fresh = pending && Date.now() - pending.at < 24 * 3600 * 1000;
    if (fresh) poll(pending);
    else if (q.get('retour')) {
      notice('Paiement terminé ?', 'Votre n° de billet vous a été envoyé par e-mail. Collez-le ci-dessous pour afficher votre billet.');
    }
    for (const t of mine) getTicket(t.key).then((n) => { save(n); return show(n); }).catch(() => {});
    if (!mine.length && !fresh && !q.get('k')) lead('Aucun billet enregistré sur ce téléphone. Achetez votre billet ou retrouvez-le avec le n° reçu par e-mail.');
  })();
})();
