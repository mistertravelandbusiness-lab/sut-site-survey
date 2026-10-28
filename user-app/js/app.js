/* =====================================================================
   SUT Survey — App : auth (1 compte par collègue), routes, admin, sync
   ===================================================================== */

/* ---------------- Config ---------------- */
const CFG = {
  url:  window.__SUPABASE_URL  || '',
  anon: window.__SUPABASE_ANON || ''
};
let sb = null;
let DEMO = false;          // mode démo si la config manque (aperçu GitHub)
const FAKE_DOMAIN = '@sut-users.app';
/* APP_ROLE = quel APK tourne : 'user' (SUT Survey) ou 'admin' (SUT Admin) */
const APP_ROLE = window.__APP_ROLE || 'user';

/* ---------------- État global ---------------- */
const ST = {
  user: null,            // auth user
  profile: null,         // { id, username, role }
  reports: [],
  current: null,         // rapport en cours d'édition
  currentPhotos: {},     // { slotKey: path } du rapport en cours
  photosTouched: false,
  pending: [],           // rapports à synchroniser (offline)
  route: 'home'
};

/* ---------------- Boot ---------------- */
function boot(){
  if (CFG.url && CFG.anon && window.supabase){
    sb = window.supabase.createClient(CFG.url, CFG.anon, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage: window.localStorage }
    });
  } else {
    DEMO = true;
    console.warn('[SUT] Mode démo : supabase-config.js absent');
  }
  attachRipple();
  bindGlobalEvents();
  setTimeout(hideSplash, 700);
  startAuthFlow();
}

function hideSplash(){
  const s = document.getElementById('splash');
  if (s){ s.classList.add('hide'); setTimeout(() => s.remove(), 600); }
}

/* ---------------- Auth ---------------- */
async function startAuthFlow(){
  if (DEMO){ enterDemo(); return; }
  const { data } = await sb.auth.getSession();
  if (data && data.session && data.session.user) await enterApp(data.session.user);
  else renderLogin();
}

function userToEmail(u){
  const v = (u || '').trim();
  if (!v) return '';
  return v.includes('@') ? v.toLowerCase() : v.toLowerCase().replace(/\s+/g, '') + FAKE_DOMAIN;
}

function renderLogin(msg){
  $('#lock')?.remove();
  const lock = document.createElement('div');
  lock.id = 'lock';
  lock.innerHTML = `
    <div class="lockbox">
      <div class="brand">
        <div class="bmark"><img src="img/icon-512.png" alt="SUT"></div>
        <h1>SUT · Site Survey</h1>
        <div class="sub">Rapports terrain · photos géolocalisées · export Excel</div>
      </div>
      <div class="locktabs">
        <button id="tabLogin" class="active">Se connecter</button>
        <button id="tabSignup">Créer un compte</button>
      </div>
      <div id="loginPane">
        <label class="fl">Nom d'utilisateur</label>
        <input id="liUser" autocomplete="username" placeholder="ex : karim.tech" autocapitalize="none" spellcheck="false">
        <label class="fl">Mot de passe</label>
        <div class="pwwrap">
          <input id="liPass" type="password" autocomplete="current-password" placeholder="••••••••">
          <button class="pwtoggle" data-pw="liPass" type="button">👁️</button>
        </div>
        <button class="block" id="btnLogin" style="margin-top:14px">Se connecter</button>
        <p class="small center" style="margin-top:10px">Chaque collègue a son propre compte : ses rapports restent séparés.</p>
      </div>
      <div id="signupPane" class="hidden">
        <label class="fl">Nom d'utilisateur</label>
        <input id="suUser" autocomplete="username" placeholder="ex : karim.tech" autocapitalize="none" spellcheck="false">
        <label class="fl">Mot de passe (6 caractères min.)</label>
        <div class="pwwrap">
          <input id="suPass" type="password" autocomplete="new-password" placeholder="••••••••">
          <button class="pwtoggle" data-pw="suPass" type="button">👁️</button>
        </div>
        <label class="fl">Confirmer le mot de passe</label>
        <input id="suPass2" type="password" autocomplete="new-password" placeholder="••••••••">
        <button class="block green" id="btnSignup" style="margin-top:14px">Créer mon compte</button>
        <p class="small center" style="margin-top:10px">Inscription libre — pas de validation par e-mail.</p>
      </div>
      ${msg ? `<div class="banner bad" style="margin-top:12px">${esc(msg)}</div>` : ''}
      ${DEMO ? `<div class="banner warn" style="margin-top:12px">Mode démo (base non configurée)</div>` : ''}
      <div class="center small" style="margin-top:14px">v1.0 · SUT</div>
    </div>`;
  document.body.appendChild(lock);
  document.body.style.overflow = '';

  const tL = $('#tabLogin'), tS = $('#tabSignup');
  if (tL) tL.onclick = () => switchAuthTab('login');
  if (tS) tS.onclick = () => switchAuthTab('signup');
  if (!tS) { $('#signupPane')?.remove(); }
  $$('.pwtoggle').forEach(b => b.onclick = () => {
    const inp = document.getElementById(b.dataset.pw);
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  if ($('#btnLogin')) $('#btnLogin').onclick = doLogin;
  if ($('#btnSignup')) $('#btnSignup').onclick = doSignup;
  ['liUser','liPass'].forEach(id => $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }));
  $('#' + (msg ? 'liUser' : 'liUser')).focus();
}

function switchAuthTab(which){
  const isLogin = which === 'login';
  $('#tabLogin').classList.toggle('active', isLogin);
  $('#tabSignup').classList.toggle('active', !isLogin);
  $('#loginPane').classList.toggle('hidden', !isLogin);
  $('#signupPane').classList.toggle('hidden', isLogin);
}

async function doLogin(){
  const u = $('#liUser').value.trim();
  const p = $('#liPass').value;
  if (!u || !p) return toast('Nom d\'utilisateur et mot de passe requis', 'err');
  const btn = $('#btnLogin'); btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email: userToEmail(u), password: p });
    if (error) throw new Error(tradAuthError(error.message));
    await enterApp(data.user);
  } catch (e){
    toast(e.message || 'Connexion impossible', 'err');
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
}

async function doSignup(){
  const u = $('#suUser').value.trim();
  const p = $('#suPass').value;
  const p2 = $('#suPass2').value;
  if (!/^[a-zA-Z0-9._-]{3,24}$/.test(u)) return toast('Nom d\'utilisateur : 3–24 caractères (lettres, chiffres, . _ -)', 'err');
  if (p.length < 6) return toast('Mot de passe : 6 caractères minimum', 'err');
  if (p !== p2) return toast('Les deux mots de passe ne correspondent pas', 'err');
  const btn = $('#btnSignup'); btn.disabled = true; btn.textContent = 'Création…';
  try {
    const { data, error } = await sb.auth.signUp({ email: userToEmail(u), password: p, options: { data: { username: u, app: APP_ROLE } } });
    if (error) throw new Error(tradAuthError(error.message));
    if (!data.session){
      // confirmation e-mail activée côté projet : on connecte directement
      const r = await sb.auth.signInWithPassword({ email: userToEmail(u), password: p });
      if (r.error) throw new Error('Compte créé mais connexion impossible — contacte l\'admin.');
      await enterApp(r.data.user);
    } else {
      await enterApp(data.user);
    }
    toast('Compte créé ✓');
  } catch (e){
    toast(e.message || 'Création impossible', 'err');
    btn.disabled = false; btn.textContent = 'Créer mon compte';
  }
}

function tradAuthError(m){
  const s = (m || '').toLowerCase();
  if (s.includes('invalid login')) return 'Nom d\'utilisateur ou mot de passe incorrect';
  if (s.includes('already registered')) return 'Ce nom d\'utilisateur est déjà pris';
  if (s.includes('password')) return 'Mot de passe trop faible (6 caractères minimum)';
  if (s.includes('email not confirmed')) return 'Compte non confirmé — préviens l\'administrateur';
  return m;
}

async function enterApp(user){
  ST.user = user;
  $('#lock')?.remove();
  // profil (username + rôle)
  const metaName = (user.user_metadata && user.user_metadata.username) || '';
  try {
    const { data, error } = await sb.rpc('get_profile');
    if (error) throw error;
    ST.profile = Array.isArray(data) ? data[0] : data;
  } catch (e){
    ST.profile = { id: user.id, username: metaName || 'utilisateur', role: 'user' };
  }
  // get_profile crée le profil avec l'e-mail : on rétablit le vrai nom d'utilisateur
  const shown = (ST.profile && ST.profile.username) || '';
  const looksLikeEmail = shown.includes('@');
  const wanted = (looksLikeEmail ? (metaName || shown.split('@')[0]) : shown) || 'utilisateur';
  if (wanted !== shown || !shown){
    ST.profile.username = wanted;
    try { await sb.from('users').update({ username: wanted }).eq('id', user.id); } catch (e){}
  }
  if (!ST.profile.username) ST.profile.username = (user.email || '').split('@')[0];
  buildShell();
  await refreshReports();
  stateLoadPending();
  if (!resumeDraft()) route('home');
  else updateSyncDot();
  if (ST.pending.length) toast(`${ST.pending.length} rapport(s) en attente de synchronisation`);
}

async function doLogout(){
  const ok = await confirmDialog('Se déconnecter ?', 'Tes rapports non synchronisés restent sur ce téléphone.', 'Se déconnecter', false);
  if (!ok) return;
  try { await sb.auth.signOut(); } catch (e) {}
  location.reload();
}

/* ---------------- Shell ---------------- */
const isAdmin = () => APP_ROLE === 'admin' && !!ST.profile;
const uname = () => (ST.profile && ST.profile.username) || 'utilisateur';

function buildShell(){
  document.body.innerHTML = `
    <div id="navBackdrop" onclick="closeNav()"></div>
    <header>
      <button class="sm ghost" id="btnMenu" style="padding:8px 10px" onclick="toggleNav()">☰</button>
      <div class="logo"><img src="img/icon-192.png" alt=""></div>
      <div style="min-width:0">
        <b>SUT · Site Survey</b>
        <div class="small" id="hdrSub">${esc(uname())}${isAdmin() ? ' · admin' : ''}</div>
      </div>
      <div class="spacer"></div>
      <button class="sm ghost" id="btnSync" style="padding:8px 10px" title="Synchroniser">⇅<span id="syncDot"></span></button>
      <button class="sm" id="btnNew" style="padding:8px 11px">+ Rapport</button>
    </header>
    <nav id="mainNav">
      <div style="display:flex;align-items:center;gap:9px;padding:2px 6px 10px">
        <div class="logo" style="width:38px;height:38px"><img src="img/icon-192.png" alt=""></div>
        <div><b style="font-size:14px">SUT Survey</b><div class="small">v1.0</div></div>
      </div>
      <div class="navsec">Terrain</div>
      <button class="navbtn" data-route="home"    onclick="route('home')"><i>🏠</i> Accueil</button>
      <button class="navbtn" data-route="new"     onclick="newReport()"><i>➕</i> Nouveau rapport</button>
      <button class="navbtn" data-route="reports" onclick="route('reports')"><i>📋</i> Mes rapports</button>
      <button class="navbtn" data-route="sync"    onclick="route('sync')"><i>⇅</i> Synchronisation</button>
      <div class="navsec">Outils</div>
      <button class="navbtn" data-route="export"  onclick="route('export')"><i>📤</i> Export Excel</button>
      <button class="navbtn" data-route="help"    onclick="route('help')"><i>❓</i> Aide & guide photo</button>
      ${isAdmin() ? `<div class="navsec">Administration</div>
      <button class="navbtn" data-route="admin" onclick="route('admin')"><i>🛡️</i> Utilisateurs</button>
      <button class="navbtn" data-route="all"   onclick="route('all')"><i>🗂️</i> Tous les rapports</button>` : ''}
      <div class="spacer"></div>
      <div class="small" style="padding:10px 12px;border-top:1px solid var(--line);margin-top:10px">
        Connecté : <b>${esc(uname())}</b><br><span class="pill" style="margin-top:5px">${isAdmin() ? 'Administrateur' : 'Utilisateur'}</span>
      </div>
      <button class="navbtn" onclick="doLogout()"><i>🚪</i> Se déconnecter</button>
    </nav>
    <main id="app"></main>
    <div id="bottomnav">
      <button class="tabbtn" data-route="home"    onclick="route('home')"><i>🏠</i>Accueil</button>
      <button class="tabbtn" data-route="new"     onclick="newReport()"><i>➕</i>Nouveau</button>
      <button class="tabbtn" data-route="reports" onclick="route('reports')"><i>📋</i>Rapports</button>
      <button class="tabbtn" data-route="export"  onclick="route('export')"><i>📤</i>Export</button>
      <button class="tabbtn" data-route="admin"   onclick="route('${isAdmin() ? 'admin' : 'help'}')"><i>${isAdmin() ? '🛡️' : '❓'}</i>${isAdmin() ? 'Admin' : 'Aide'}</button>
    </div>
    <div id="toast"></div>`;
  $('#btnNew').onclick = () => newReport();
  $('#btnSync').onclick = () => syncNow();
}

function bindGlobalEvents(){
  window.addEventListener('online',  () => { toast('Connexion rétablie — synchronisation…'); syncNow(true); });
  window.addEventListener('offline', () => toast('Hors ligne : les rapports sont enregistrés sur le téléphone', 'err'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape'){ closeModal(); document.getElementById('lightbox')?.remove(); } });
  document.addEventListener('backbutton', () => { window.androidBack(); }, false);

  /* Pont avec l'APK Android (MainActivity.onKeyDown) : renvoie "handled" si
     l'app a consommé le retour, sinon "exit" => Android ferme l'app. */
  window.androidBack = function(){
    const lb = document.getElementById('lightbox');
    if (lb){ lb.remove(); return 'handled'; }
    if (document.getElementById('modal')){ closeModal(); return 'handled'; }
    if (ST.route === 'report' || ST.route === 'edit'){
      if (ST.current && ST.current.id) route('report');
      else route('reports');
      return 'handled';
    }
    if (ST.route !== 'home'){ route('home'); return 'handled'; }
    return 'exit';
  };
}

/* ---------------- Routes ---------------- */
function route(r){
  if ((r === 'admin' || r === 'all') && !isAdmin()){
    toast('Section réservée à l\'administrateur', 'err');
    r = 'home';
  }
  ST.route = r;
  setNav(r);
  animatePage();
  const app = $('#app');
  if (!app) return;
  switch (r){
    case 'home':    app.innerHTML = viewHome();  break;
    case 'reports': app.innerHTML = viewReports(); break;
    case 'export':  app.innerHTML = viewExport(); break;
    case 'sync':    app.innerHTML = viewSync(); break;
    case 'help':    app.innerHTML = viewHelp(); break;
    case 'admin':   app.innerHTML = viewAdmin(); loadAdmin(); break;
    case 'all':     app.innerHTML = viewAll(); loadAll(); break;
    case 'report':
    case 'edit':
      if (ST.current){ app.innerHTML = viewEditor(!!ST.current.id); wireEditor(); }
      else app.innerHTML = viewReports();
      break;
    default:        app.innerHTML = viewHome();
  }
  if (r === 'reports') wireReportList();
  if (r === 'export') wireExport();
}

/* ---------------- Data : rapports ---------------- */
async function refreshReports(){
  if (DEMO){ ST.reports = ST.reports.length ? ST.reports : demoReports(); return; }
  try {
    const { data, error } = await sb.from('rapports')
      .select('*').eq('user_id', ST.user.id).eq('is_deleted', false)
      .order('updated_at', { ascending:false });
    if (error) throw error;
    ST.reports = (data || []).map(r => ({ ...r, photo_slots: parseSlots(r.photo_slots) }));
  } catch (e){
    console.warn('refreshReports', e.message);
    ST.reports = ST.reports || [];
    toast('Impossible de charger les rapports : ' + e.message, 'err');
  }
  updateSyncDot();
}

function parseSlots(arr){
  // stocké en text[] : "slotKey|chemin" — rétrocompatible "chemin" seul
  const out = {};
  (arr || []).forEach(v => {
    if (!v) return;
    const i = String(v).indexOf('|');
    if (i > 0) out[v.slice(0, i)] = v.slice(i + 1);
    else out['pano'] = v;
  });
  return out;
}
function serializeSlots(obj){
  return Object.keys(obj || {}).filter(k => obj[k]).map(k => `${k}|${obj[k]}`);
}

function reportStats(photos){
  const total = PHOTO_SLOTS.length;
  const filled = Object.keys(photos || {}).length;
  const reqTot = PHOTO_SLOTS.filter(s => s.required).length;
  const reqOk = PHOTO_SLOTS.filter(s => s.required && photos && photos[s.key]).length;
  return { total, filled, reqTot, reqOk, pct: Math.round(filled / total * 100) };
}

function updateSyncDot(){
  const dot = document.getElementById('syncDot');
  if (!dot) return;
  const n = ST.pending.length;
  dot.textContent = n ? ` ${n}` : '';
  dot.style.cssText = n ? 'background:#ef4444;color:#fff;border-radius:9px;padding:0 5px;font-size:10px;margin-left:3px' : '';
}

/* ---------------- Vue : Accueil ---------------- */
function viewHome(){
  const mine = ST.reports || [];
  const today = mine.filter(r => (r.date || '').slice(0, 10) === todayISO()).length;
  const photos = mine.reduce((n, r) => n + Object.keys(r.photo_slots || {}).length, 0);
  const pending = ST.pending.length;
  const last = mine[0];
  return `
  <div class="hero">
    <div class="herobg"></div>
    <h1>Rapports terrain SUT</h1>
    <p>Renseigne la fiche, prends les photos aux bons emplacements, exporte en Excel — même en zone sans réseau.</p>
    <div class="row" style="margin-top:14px;max-width:420px">
      <button onclick="newReport()">➕ Nouveau rapport</button>
      <button class="ghost" onclick="route('reports')">📋 Mes rapports</button>
    </div>
  </div>

  <div class="grid">
    <div class="stat"><b>${mine.length}</b><span>Rapports</span></div>
    <div class="stat"><b>${today}</b><span>Aujourd'hui</span></div>
    <div class="stat"><b>${photos}</b><span>Photos</span></div>
    <div class="stat"><b style="color:${pending ? '#f87171' : '#4ade80'}">${pending}</b><span>À synchroniser</span></div>
  </div>

  ${pending ? `<div class="banner warn" onclick="route('sync')" style="cursor:pointer">
      ⚠️ ${pending} rapport(s) enregistré(s) sur ce téléphone ne sont pas encore envoyés. <b>Toucher pour synchroniser.</b></div>` : ''}

  ${last ? `<div class="sectitle">Dernier rapport</div>${reportCardHTML(last)}` : `
    <div class="card empty">
      <div class="big">📋</div>
      <b>Aucun rapport pour le moment</b>
      <p class="small" style="margin:6px 0 12px">Commence par créer ton premier rapport terrain.</p>
      <button onclick="newReport()">Créer un rapport</button>
    </div>`}

  <div class="sectitle">Actions rapides</div>
  <div class="card">
    <div class="row">
      <button class="ghost" onclick="route('export')">📤 Export Excel</button>
      <button class="ghost" onclick="syncNow()">⇅ Synchroniser</button>
      <button class="ghost" onclick="route('help')">📷 Guide photo</button>
    </div>
  </div>`;
}

function reportCardHTML(r){
  const ph = r.photo_slots || {};
  const first = Object.values(ph)[0];
  const st = reportStats(ph);
  const thumb = first ? `<img class="th" src="${photoUrl(first)}" alt="" loading="lazy">`
                      : `<div class="ph-empty">📷</div>`;
  return `<div class="rcard" onclick="openReport('${r.id}')">
    ${thumb}
    <div class="in">
      <b>${esc(r.locality_name || 'Sans nom')} ${r.locality_id ? `<span class="pill">${esc(r.locality_id)}</span>` : ''}</b>
      <div class="small">${[r.region, r.commune].filter(Boolean).map(esc).join(' · ') || '—'} · ${fmtDate(r.date)}</div>
      <div class="small" style="margin-top:3px"><span class="tag ${st.reqOk === st.reqTot ? 'ok' : 'warn'}">${st.filled}/${st.total} photos</span></div>
    </div>
    <span class="pill">›</span>
  </div>`;
}

/* ---------------- Vue : Mes rapports ---------------- */
function viewReports(){
  if (!ST.reports.length){
    return `<div class="sectitle">Mes rapports</div>
    <div class="card empty"><div class="big">📋</div><b>Aucun rapport</b>
      <p class="small" style="margin:6px 0 12px">Crée ton premier rapport terrain.</p>
      <button onclick="newReport()">Nouveau rapport</button></div>`;
  }
  return `
    <div class="sectitle">Mes rapports (${ST.reports.length})</div>
    <div class="card" style="padding:11px">
      <input id="qSearch" placeholder="🔍 Rechercher : locality, commune, région…" style="margin:0">
      <div class="row tight" style="margin-top:8px">
        <button class="ghost sm" onclick="route('export')">📤 Exporter</button>
        <button class="ghost sm" onclick="refreshReports().then(()=>route('reports'))">⟳ Actualiser</button>
      </div>
    </div>
    <div id="reportsList">${ST.reports.map(reportCardHTML).join('')}</div>`;
}

function wireReportList(){
  const q = document.getElementById('qSearch');
  if (!q) return;
  q.oninput = () => {
    const v = q.value.toLowerCase().trim();
    const list = ST.reports.filter(r => !v ||
      [r.locality_id, r.locality_name, r.commune, r.region, r.date].join(' ').toLowerCase().includes(v));
    document.getElementById('reportsList').innerHTML = list.length ? list.map(reportCardHTML).join('')
      : `<div class="card empty"><div class="big">🔍</div><b>Aucun résultat</b></div>`;
  };
}

/* ---------------- Vue : Synchronisation ---------------- */
function viewSync(){
  return `
    <div class="sectitle">Synchronisation</div>
    <div class="card">
      <p class="small">État : ${navigator.onLine ? '<span class="tag ok">En ligne</span>' : '<span class="tag bad">Hors ligne</span>'}
        · ${ST.pending.length} en attente</p>
      <button class="block" style="margin-top:10px" onclick="syncNow()">⇅ Synchroniser maintenant</button>
      ${ST.pending.length ? `<div class="tablewrap" style="margin-top:12px"><table>
        <tr><th>Locality</th><th>Date</th><th>Photos</th><th></th></tr>
        ${ST.pending.map((p, i) => `<tr>
          <td>${esc(p.locality_id || p.locality_name || '—')}</td>
          <td>${fmtDate(p.date)}</td>
          <td>${Object.keys(p.photo_slots || {}).length}</td>
          <td><button class="sm red" onclick="dropPending(${i})">✕</button></td></tr>`).join('')}
      </table></div>` : `<div class="empty"><div class="big">✅</div>Tout est synchronisé</div>`}
    </div>
    <div class="card">
      <h2>Comment ça marche ?</h2>
      <p class="small" style="margin-top:6px">Les rapports sont d'abord enregistrés <b>sur le téléphone</b>.
      Dès que le réseau revient, touche « Synchroniser » : ils partent vers la base et sont visibles pour l'administrateur.
      Les photos suivent le même chemin.</p>
    </div>`;
}

function dropPending(i){
  confirmDialog('Supprimer ce brouillon ?', 'Il n\'a pas encore été envoyé. Cette action est définitive.').then(ok => {
    if (!ok) return;
    ST.pending.splice(i, 1);
    stateSavePending(); updateSyncDot(); route('sync');
  });
}

/* ---------------- Sync ---------------- */
function userKey(k){ return `sut_${k}_${(ST.user && ST.user.id) || 'anon'}`; }

function stateLoadPending(){
  try { ST.pending = JSON.parse(localStorage.getItem(userKey('pending')) || '[]'); }
  catch (e){ ST.pending = []; }
  updateSyncDot();
}
function stateSavePending(){
  try { localStorage.setItem(userKey('pending'), JSON.stringify(ST.pending)); } catch (e){}
}

async function syncNow(silent){
  if (DEMO){ if (!silent) toast('Mode démo : synchronisation simulée'); return; }
  if (!ST.pending.length){ if (!silent) toast('Rien à synchroniser ✓'); return; }
  if (!navigator.onLine){ if (!silent) toast('Hors ligne', 'err'); return; }
  const btn = document.getElementById('btnSync');
  if (btn) btn.disabled = true;
  let ok = 0;
  const rest = [];
  for (const p of ST.pending){
    try { await saveReportToCloud(p); ok++; }
    catch (e){ console.warn('sync', e.message); rest.push(p); }
  }
  ST.pending = rest;
  stateSavePending(); updateSyncDot();
  await refreshReports();
  if (btn) btn.disabled = false;
  if (!silent) toast(ok ? `${ok} rapport(s) synchronisé(s) ✓` : 'Échec de la synchronisation', ok ? '' : 'err');
  if (ST.route === 'sync') route('sync');
  else if (ST.route === 'home') route('home');
}

/* Écrit un rapport (objet) dans Supabase — utilisé par save + sync */
async function saveReportToCloud(r){
  const payload = {
    user_id: ST.user.id,
    locality_id: r.locality_id || null,
    locality_name: r.locality_name || null,
    site_type: r.site_type || null,
    region: r.region || null,
    commune: r.commune || null,
    rt_possible: r.rt_possible || null,
    longitude: r.longitude || null,
    latitude: r.latitude || null,
    altitude: r.altitude || null,
    agglo_name: r.agglo_name || null,
    site_acq_phone: r.site_acq_phone || null,
    site_acq_email: r.site_acq_email || null,
    village_contact: r.village_contact || null,
    land_owner: r.land_owner || null,
    rural_height: r.rural_height || null,
    space_required: r.space_required || null,
    space_available: r.space_available || null,
    access_road: r.access_road || null,
    road_width: r.road_width || null,
    road_distance: r.road_distance || null,
    soil_type: r.soil_type || null,
    site_surface: r.site_surface || null,
    main_power: r.main_power || null,
    surface_relief: r.surface_relief || null,
    rainy_season: r.rainy_season || null,
    site_access: r.site_access || null,
    surrounding_remark: r.surrounding_remark || null,
    land_acquisition: r.land_acquisition || null,
    matrilas_delivery: r.matrilas_delivery || null,
    voice_network: r.voice_network || null,
    voice_quality: r.voice_quality || null,
    data_network: r.data_network || null,
    speed_test: r.speed_test || null,
    subcontractor_rep: r.subcontractor_rep || null,
    huawei_rep: r.huawei_rep || null,
    date: r.date || todayISO(),
    photo_slots: serializeSlots(r.photo_slots),
    is_deleted: false,
    updated_at: new Date().toISOString()
  };
  let res;
  if (r.id && !String(r.id).startsWith('local-')){
    payload.id = r.id;
    res = await sb.from('rapports').upsert(payload, { onConflict: 'id' }).select('id').single();
  } else {
    res = await sb.from('rapports').insert(payload).select('id').single();
  }
  if (res.error) throw new Error(res.error.message);
  return res.data.id;
}

/* ---------------- Vue : Aide ---------------- */
function viewHelp(){
  return `
    <div class="sectitle">Aide & guide photo</div>
    <div class="card">
      <h2>Remplir un rapport</h2>
      <ol style="margin:8px 0 0 18px;font-size:13px;line-height:1.7">
        <li>Ouvre <b>Nouveau rapport</b>.</li>
        <li>Chaque champ est <b>vide</b> : les valeurs proposées sous le champ sont des <b>suggestions</b> (un clic pour remplir).</li>
        <li>Utilise <b>📍 GPS</b> pour la latitude / longitude (évite les erreurs de saisie).</li>
        <li>Prends les <b>6 photos obligatoires</b> aux emplacements indiqués.</li>
        <li><b>Enregistrer</b> : le rapport part sur la base (ou reste en attente hors ligne).</li>
        <li>Exporte : le fichier Excel porte le nom du <b>Locality ID</b>.</li>
      </ol>
    </div>
    <div class="card">
      <h2>Bien cadrer les photos 📷</h2>
      <div class="banner warn" style="margin-top:8px">Évite les photos de travers, floues, en contre-jour ou avec le doigt devant l'objectif : elles peuvent faire refuser le rapport.</div>
      <ul style="margin:10px 0 0 18px;font-size:13px;line-height:1.8">
        <li>Tiens le téléphone <b>horizontalement</b> (paysage), à hauteur d'yeux.</li>
        <li>Recule pour avoir <b>tout le sujet</b> dans l'image (pylône, portail, local).</li>
        <li><b>Soleil dans le dos</b> — pas de contre-jour.</li>
        <li>Nettoie l'objectif, essuie les gouttes d'eau.</li>
        <li>Une photo = un emplacement. Ne mets pas la même image partout.</li>
        <li>Vérifie l'aperçu après la prise ; supprime et refais si c'est flou.</li>
      </ul>
    </div>
    <div class="card">
      <h2>Emplacements photo</h2>
      <div class="pgrid" style="margin-top:8px">
        ${PHOTO_SLOTS.map(s => `<div class="pslot" onclick="${s.example ? `openLightbox('${s.example}','${esc(s.label)}')` : ''}">
          ${s.example ? `<img src="${s.example}" alt="" loading="lazy"><div class="lbl">${esc(s.label)}</div><div class="ex">EXEMPLE</div>`
            : `<div class="ph"><b>📷</b>${esc(s.label)}</div>`}
        </div>`).join('')}
      </div>
      <p class="small" style="margin-top:8px">Les images marquées <b>EXEMPLE</b> sont des modèles de cadrage — remplace-les par tes propres photos.</p>
    </div>
    <div class="card">
      <h2>Questions fréquentes</h2>
      <h3>Mes rapports sont mélangés avec ceux d'un collègue ?</h3>
      <p class="small">Non : chaque compte ne voit que ses propres rapports. L'administrateur peut tout voir et supprimer un compte.</p>
      <h3>Pas de réseau sur le site ?</h3>
      <p class="small">Enregistre quand même : le rapport reste sur le téléphone et part à la prochaine synchronisation.</p>
      <h3>Nom du fichier exporté ?</h3>
      <p class="small">Il reprend le <b>Locality ID</b> (ex : <kbd>ORA-BEJ-0142.xlsx</kbd>).</p>
    </div>`;
}

/* ---------------- Démo ---------------- */
function demoReports(){
  return [{
    id:'local-demo', locality_id:'ORA-BEJ-0142', locality_name:'Bir el Djir – Hai Es Salem',
    site_type:'Greenfield', region:'Oranie', commune:'Bir el Djir', date:todayISO(),
    photo_slots:{ pano:'img/examples/01-panorama.jpg', antenne:'img/examples/02-antenne.jpg',
                  acces:'img/examples/03-acces.jpg', local:'img/examples/04-local-technique.jpg',
                  sol:'img/examples/05-sol.jpg', village:'img/examples/06-village.jpg' }
  }];
}
function enterDemo(){
  ST.user = { id:'demo-user', email:'demo@sut.local' };
  ST.profile = { id:'demo-user', username:'demo', role:'admin' };
  $('#lock')?.remove();
  buildShell();
  ST.reports = demoReports();
  route('home');
}
