/* Festival Bio Guera — tableau de bord billetterie (organisation)
   Lit /admin/* de l'API (en-tête X-Admin-Pin). Rafraîchi toutes les 10 s tant que l'onglet est visible. */
(() => {
  'use strict';
  const B = window.FBG.billetterie;
  const API = (B.api || '').replace(/\/$/, '');
  const NAMES = Object.fromEntries(B.categories.map((c) => [c.id, c.nom]));
  const $ = (s, c = document) => c.querySelector(s);
  const ss = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* */ } },
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('fr-FR');
  const hm = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });
  const dt = (iso) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });
  const ago = (iso) => {
    const s = Math.round((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'à l’instant';
    if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
    if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
    return `le ${dt(iso)}`;
  };

  let pin = ss.get('fbg.admin');
  let timer = null;
  let lastOk = 0;

  async function call(path, as = 'json') {
    const r = await fetch(API + path, { headers: { 'X-Admin-Pin': pin } });
    if (r.status === 401) throw Object.assign(new Error('pin'), { pin: true });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return as === 'blob' ? r.blob() : r.json();
  }

  /* ---------- Connexion ---------- */
  const setup = $('[data-setup]');
  const dash = $('[data-dash]');
  $('[data-setup-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-setup-err]');
    if (!API) { err.textContent = 'API non configurée (js/data.js → billetterie.api).'; return; }
    pin = e.target.elements.pin.value.trim();
    if (!pin) { err.textContent = 'Saisissez le code organisation.'; return; }
    err.textContent = 'Vérification…';
    try {
      await call('/admin/stats');
      err.textContent = '';
      ss.set('fbg.admin', pin);
      open();
    } catch (x) {
      err.textContent = x.pin ? 'Code organisation incorrect.' : 'Serveur injoignable. Vérifiez la connexion.';
    }
  });
  $('[data-quit]').addEventListener('click', () => {
    clearTimeout(timer);
    ss.set('fbg.admin', '');
    pin = '';
    dash.hidden = true;
    setup.hidden = false;
  });

  function open() {
    setup.hidden = true;
    dash.hidden = false;
    refresh();
  }

  /* ---------- Rendu ---------- */
  function paint(d) {
    const tot = d.tiers.reduce((a, t) => ({
      tickets: a.tickets + t.tickets, revenue: a.revenue + t.revenue, entered: a.entered + t.entered, revoked: a.revoked + t.revoked,
    }), { tickets: 0, revenue: 0, entered: 0, revoked: 0 });
    const valid = tot.tickets - tot.revoked;
    $('[data-k-sold]').textContent = nf.format(tot.tickets);
    $('[data-k-sold-sub]').textContent = tot.revoked ? `dont ${nf.format(tot.revoked)} annulé${tot.revoked > 1 ? 's' : ''}` : 'toutes catégories';
    $('[data-k-rev]').textContent = nf.format(tot.revenue);
    $('[data-k-in]').textContent = nf.format(tot.entered);
    $('[data-k-in-sub]').textContent = valid ? `${Math.round((tot.entered / valid) * 100)} % des billets valides` : 'aucun billet valide';
    $('[data-k-pace]').textContent = nf.format(d.last15min);

    $('[data-tiers]').innerHTML = d.tiers.map((t) => {
      const v = t.tickets - t.revoked;
      const pct = v ? Math.round((t.entered / v) * 100) : 0;
      return `<tr>
        <th scope="row"><span class="adm__sw adm__sw--${esc(t.tier)}" aria-hidden="true"></span>${esc(NAMES[t.tier] || t.tier)}</th>
        <td>${nf.format(t.tickets)}${t.revoked ? ` <small>(${t.revoked} annulé${t.revoked > 1 ? 's' : ''})</small>` : ''}</td>
        <td>${nf.format(t.revenue)} F</td>
        <td>${nf.format(t.entered)}</td>
        <td class="adm__bar-col"><span class="adm__bar"><span style="--p:${pct}%"></span></span><span class="adm__pct">${pct} %</span></td>
      </tr>`;
    }).join('');

    $('[data-feed]').innerHTML = d.recent.length
      ? d.recent.map((r) => `<li>
          <time datetime="${esc(r.at)}">${hm(r.at)}</time>
          <span class="adm__sw adm__sw--${esc(r.tier)}" aria-label="${esc(NAMES[r.tier] || r.tier)}"></span>
          <span class="adm__feed-name">${esc(r.holder || r.key)}</span>
          <span class="adm__feed-gate">${esc(r.gate)}</span>
        </li>`).join('')
      : '<li class="adm__empty">Aucune entrée pour l’instant.</li>';

    const s = d.sync;
    const sync = $('[data-sync]');
    const parts = [
      s.last_pulse_at ? `Dernière notification Chariow : ${ago(s.last_pulse_at)}` : 'Aucune notification Chariow reçue pour l’instant',
      `Activations Chariow en attente : ${s.pending}`,
    ];
    if (s.failed) parts.push(`en échec : ${s.failed} (voir ci-dessous)`);
    sync.textContent = parts.join(' · ');
    sync.classList.toggle('is-warn', s.failed > 0);
    if (s.failed) loadErrors(); else $('[data-errors]').hidden = true;
  }

  async function loadErrors() {
    try {
      const { jobs } = await call('/admin/sync-errors');
      const ul = $('[data-errors]');
      ul.hidden = !jobs.length;
      ul.innerHTML = jobs.map((j) => `<li><code>${esc(j.key)}</code> ${esc(j.last_error || '')} <small>${j.failed_at ? dt(j.failed_at) : ''}</small></li>`).join('');
    } catch { /* non bloquant */ }
  }

  function live(ok) {
    const el = $('[data-live]');
    el.classList.toggle('is-off', !ok);
    $('[data-live-text]').textContent = ok
      ? `En direct · ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      : `Hors ligne · dernière mise à jour ${lastOk ? ago(new Date(lastOk).toISOString()) : 'jamais'}`;
  }

  async function refresh() {
    clearTimeout(timer);
    try {
      paint(await call('/admin/stats'));
      lastOk = Date.now();
      live(true);
    } catch (x) {
      if (x.pin) { $('[data-quit]').click(); $('[data-setup-err]').textContent = 'Code organisation modifié : reconnectez-vous.'; return; }
      live(false);
    }
    if (document.visibilityState === 'visible') timer = setTimeout(refresh, 10000);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !dash.hidden) refresh(); });

  /* ---------- Recherche ---------- */
  const STATUS = { valid: ['valid', 'Valide'], used: ['used', 'Entré'], revoked: ['used', 'Annulé'], expired: ['used', 'Expiré'] };
  $('[data-search]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = e.target.elements.q.value.trim();
    const out = $('[data-results]');
    if (q.length < 3) { out.innerHTML = '<li class="adm__empty">Saisissez au moins 3 caractères.</li>'; return; }
    out.innerHTML = '<li class="adm__empty">Recherche…</li>';
    try {
      const { results } = await call(`/admin/search?q=${encodeURIComponent(q)}`);
      out.innerHTML = results.length ? results.map((t) => {
        const [kind, label] = STATUS[t.status] || STATUS.valid;
        const scans = (t.scans || []).map((s) => `${dt(s.at)} · ${esc(s.gate)}`).join('<br>');
        return `<li>
          <div class="adm__res-head"><b>${esc(t.holder || '—')}</b><span class="chip chip--${kind}">${label}${t.entries.max > 1 ? ` ${t.entries.used}/${t.entries.max}` : ''}</span></div>
          <p><span class="adm__sw adm__sw--${esc(t.tier)}" aria-hidden="true"></span>${esc(NAMES[t.tier] || t.tier)} · <code>${esc(t.key)}</code></p>
          <p>${esc(t.email)}${t.issued_at ? ` · acheté le ${dt(t.issued_at)}` : ''}</p>
          ${scans ? `<p class="adm__res-scans">${scans}</p>` : ''}
        </li>`;
      }).join('') : '<li class="adm__empty">Aucun billet trouvé.</li>';
    } catch {
      out.innerHTML = '<li class="adm__empty">Recherche impossible pour le moment.</li>';
    }
  });

  /* ---------- Export ---------- */
  $('[data-export]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.classList.add('is-loading');
    try {
      const blob = await call('/admin/export.csv', 'blob');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `billets-bioguera-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch { alert('Export impossible pour le moment.'); }
    btn.classList.remove('is-loading');
  });

  if (pin && API) open();
})();
