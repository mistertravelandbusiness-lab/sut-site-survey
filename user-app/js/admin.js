/* =====================================================================
   SUT Survey — Administration (réservé au rôle admin)
   L'admin peut : voir tous les utilisateurs, voir tous les rapports,
   supprimer un utilisateur (et ses rapports).
   ===================================================================== */

let ALL_USERS = [];
let ALL_REPORTS = [];

function viewAdmin(){
  return `
    <div class="sectitle">Administration</div>
    <div class="card">
      <h2>🛡️ Utilisateurs</h2>
      <p class="small">Gestion des comptes et des rapports.</p>
      <div class="row tight" style="margin-top:9px">
        <button class="ghost sm" onclick="loadAdmin()">⟳ Actualiser</button>
        <button class="ghost sm" onclick="route('all')">🗂️ Tous les rapports</button>
      </div>
    </div>
    <div id="adminUsers"><div class="card"><div class="loader"></div></div></div>`;
}

async function loadAdmin(){
  const box = document.getElementById('adminUsers');
  if (!box) return;
  if (DEMO){
    box.innerHTML = `<div class="card"><div class="banner warn">Mode démo : gestion des utilisateurs désactivée.</div></div>`;
    return;
  }
  try {
    const [{ data:us, error:e1 }, { data:rs, error:e2 }] = await Promise.all([
      sb.from('users').select('id, username, role, created_at').order('created_at', { ascending:true }),
      sb.from('rapports').select('id, user_id, locality_id, locality_name, date, is_deleted, photo_slots').eq('is_deleted', false)
    ]);
    if (e1) throw e1;
    ALL_USERS = us || [];
    ALL_REPORTS = (rs || []).map(r => ({ ...r, photo_slots: parseSlots(r.photo_slots) }));
  } catch (e){
    box.innerHTML = `<div class="card"><div class="banner bad">Erreur : ${esc(e.message)}</div></div>`;
    return;
  }
  const counts = {};
  ALL_REPORTS.forEach(r => counts[r.user_id] = (counts[r.user_id] || 0) + 1);

  box.innerHTML = `
    <div class="grid" style="margin-bottom:10px">
      <div class="stat"><b>${ALL_USERS.length}</b><span>Utilisateurs</span></div>
      <div class="stat"><b>${ALL_REPORTS.length}</b><span>Rapports actifs</span></div>
      <div class="stat"><b>${ALL_REPORTS.reduce((n, r) => n + Object.keys(r.photo_slots || {}).length, 0)}</b><span>Photos</span></div>
    </div>
    <div class="card" style="padding:9px">
      <div class="tablewrap"><table>
        <tr><th>Utilisateur</th><th>Rôle</th><th>Rapports</th><th>Créé le</th><th></th></tr>
        ${ALL_USERS.map(u => `<tr>
          <td><b>${esc(u.username || '—')}</b><div class="small mono">${esc((u.id || '').slice(0, 8))}…</div></td>
          <td><span class="tag ${u.role === 'admin' ? 'vio' : 'mut'}">${esc(u.role || 'user')}</span></td>
          <td class="mono">${counts[u.id] || 0}</td>
          <td class="small">${fmtDate(u.created_at)}</td>
          <td>${u.id === (ST.user && ST.user.id)
            ? `<span class="pill">moi</span>`
            : `<button class="sm red" onclick="deleteUser('${u.id}','${esc(u.username || '')}')">Supprimer</button>`}</td>
        </tr>`).join('')}
      </table></div>
      <p class="small" style="margin-top:9px">⚠️ La suppression efface le compte et ses rapports. Les fichiers photo déjà stockés peuvent subsister.</p>
    </div>`;
}

async function deleteUser(id, username){
  const ok = await confirmDialog('Supprimer cet utilisateur ?',
    `Le compte <b>${esc(username)}</b> et tous ses rapports seront supprimés définitivement. Les fichiers photo déjà stockés peuvent subsister.`, 'Supprimer');
  if (!ok) return;
  try {
    const { data, error } = await sb.rpc('delete_user', { p_id: id });
    if (error) throw error;
    if (!data) throw new Error('Compte introuvable');
    toast('Utilisateur supprimé');
    loadAdmin();
  } catch (e){ toast(e.message, 'err'); }
}

/* ---------------- Tous les rapports (admin) ---------------- */
function viewAll(){
  return `
    <div class="sectitle">Tous les rapports</div>
    <div class="card" style="padding:11px">
      <input id="qAll" placeholder="🔍 Filtrer : locality, user, date…" style="margin:0">
    </div>
    <div id="allList"><div class="card"><div class="loader"></div></div></div>`;
}

async function loadAll(){
  const box = document.getElementById('allList');
  if (!box) return;
  if (DEMO){
    box.innerHTML = `<div class="card"><div class="banner warn">Mode démo.</div></div>`;
    return;
  }
  try {
    if (!ALL_REPORTS.length){
      const { data, error } = await sb.from('rapports')
        .select('id, user_id, locality_id, locality_name, date, is_deleted, photo_slots')
        .eq('is_deleted', false).order('updated_at', { ascending:false });
      if (error) throw error;
      ALL_REPORTS = (data || []).map(r => ({ ...r, photo_slots: parseSlots(r.photo_slots) }));
    }
  } catch (e){
    box.innerHTML = `<div class="card"><div class="banner bad">Erreur : ${esc(e.message)}</div></div>`;
    return;
  }
  const unameById = {};
  ALL_USERS.forEach(u => unameById[u.id] = u.username);

  const render = (filter) => {
    const v = (filter || '').toLowerCase();
    const rows = ALL_REPORTS.filter(r => !v ||
      [r.locality_id, r.locality_name, r.date, unameById[r.user_id]].join(' ').toLowerCase().includes(v));
    box.innerHTML = rows.length ? `<div class="card" style="padding:9px"><div class="tablewrap"><table>
      <tr><th>Locality ID</th><th>Nom</th><th>Utilisateur</th><th>Date</th><th>Photos</th><th></th></tr>
      ${rows.map(r => `<tr>
        <td><b>${esc(r.locality_id || '—')}</b></td>
        <td>${esc(r.locality_name || '—')}</td>
        <td class="small">${esc(unameById[r.user_id] || '—')}</td>
        <td class="small">${fmtDate(r.date)}</td>
        <td class="mono">${Object.keys(r.photo_slots || {}).length}</td>
        <td><button class="sm ghost" onclick="exportSingle('${r.id}')">⬇</button></td>
      </tr>`).join('')}</table></div></div>`
      : `<div class="card empty"><div class="big">🔍</div><b>Aucun rapport</b></div>`;
  };
  render('');
  const q = document.getElementById('qAll');
  if (q) q.oninput = () => render(q.value);
}
