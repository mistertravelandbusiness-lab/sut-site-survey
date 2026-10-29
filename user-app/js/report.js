/* =====================================================================
   SUT Survey — Éditeur de rapport (2 pages) + photos + brouillon
   ===================================================================== */

/* ---------------- Ouverture ---------------- */
function newReport(){
  ST.current = emptyReport();
  ST.currentPhotos = {};
  ST.photosTouched = false;
  ST.currentPage = 1;
  ST.route = 'edit';
  animatePage();
  setNav('new');
  $('#app').innerHTML = viewEditor();
  wireEditor();
  window.scrollTo(0, 0);
}

function openReport(id){
  const r = ST.reports.find(x => x.id === id);
  if (!r) return toast('Rapport introuvable', 'err');
  ST.current = JSON.parse(JSON.stringify(r));
  ST.currentPhotos = { ...(r.photo_slots || {}) };
  ST.photosTouched = false;
  ST.currentPage = 1;
  ST.route = 'report';
  animatePage();
  $('#app').innerHTML = viewEditor(true);
  wireEditor();
  window.scrollTo(0, 0);
}

/* ---------------- Rendu ---------------- */
function fieldHTML(key){
  const f = FR_FIELDS[key];
  const val = ST.current[key] || '';
  const id = 'f_' + key;
  let input;
  if (f.type === 'area'){
    input = `<textarea id="${id}" data-key="${key}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`;
  } else if (f.type === 'date'){
    input = `<input id="${id}" data-key="${key}" type="date" value="${esc(val || todayISO())}">`;
  } else if (f.type === 'num'){
    input = `<input id="${id}" data-key="${key}" type="text" inputmode="decimal" value="${esc(val)}" placeholder="${esc(f.ph || '')}">`;
  } else {
    input = `<input id="${id}" data-key="${key}" type="${f.type === 'tel' ? 'tel' : (f.type === 'email' ? 'email' : 'text')}"
      value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${key === 'locality_id' ? 'autocapitalize="characters" spellcheck="false"' : ''}>`;
  }
  const sugs = (f.sugg || []).map(s => {
    const isGps = s === 'GPS auto';
    return `<span class="sug${isGps ? ' add' : ''}" data-sug="${esc(s)}" data-target="${id}">${isGps ? '📍 ' : ''}${esc(s)}</span>`;
  }).join('');
  return `<label class="fl" for="${id}">${esc(f.label)}</label>
    ${input}
    ${sugs ? `<div class="sugs">${sugs}</div>` : ''}
    ${f.hint ? `<div class="small" style="margin-top:2px">${esc(f.hint)}</div>` : ''}`;
}

function groupHTML(g){
  const keys = Object.keys(FR_FIELDS).filter(k => FR_FIELDS[k].g === g && !FR_FIELDS[k].gpsOnly);
  return `<div class="card">
    <h2>${GROUPS[g].icon} ${esc(GROUPS[g].title)}</h2>
    ${keys.map(fieldHTML).join('')}
  </div>`;
}

function photoGridHTML(){
  return `<div class="pgrid">${PHOTO_SLOTS.map(s => {
    const path = ST.currentPhotos[s.key];
    const isExample = path && path.startsWith('img/examples/');
    if (path){
      return `<div class="pslot ${s.required ? 'required' : ''}">
        <img src="${isExample ? path : photoUrl(path)}" alt="" onclick="openLightbox('${isExample ? path : photoUrl(path)}','${esc(s.label)}')">
        <div class="lbl">${esc(s.label)}${s.required ? ' *' : ''}</div>
        ${isExample ? `<div class="ex">EXEMPLE</div>` : ''}
        <button class="del" data-delphoto="${s.key}" title="Supprimer">✕</button>
        <button class="cam" data-shot="${s.key}" title="Prendre une photo">📷</button>
      </div>`;
    }
    return `<div class="pslot ${s.required ? 'required' : ''}">
      <div class="ph" data-shot="${s.key}"><b>📷</b>${esc(s.label)}${s.required ? ' *' : ''}<br><span style="font-size:9px;opacity:.75">appareil ou galerie</span></div>
    </div>`;
  }).join('')}</div>`;
}

function viewEditor(isExisting){
  const r = ST.current;
  const page = ST.currentPage || 1;
  const st = reportStats(ST.currentPhotos);
  return `
  <div style="display:flex;align-items:center;gap:8px;margin:2px 0 6px">
    <button class="ghost sm" onclick="confirmLeave()">‹ Retour</button>
    <div style="min-width:0;flex:1">
      <b style="font-size:14.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${esc(r.locality_name || 'Nouveau rapport')}</b>
      <div class="small">${r.locality_id ? esc(r.locality_id) + ' · ' : ''}${fmtDate(r.date)}</div>
    </div>
  </div>

  <div class="locktabs" style="margin:10px 0 4px">
    <button class="${page === 1 ? 'active' : ''}" onclick="switchPage(1)">Page 1 · Fiche</button>
    <button class="${page === 2 ? 'active' : ''}" onclick="switchPage(2)">Page 2 · Réseau & photos</button>
  </div>

  <div id="page1" class="${page === 1 ? '' : 'hidden'}">
    <div class="banner">💡 Les champs sont vides : les pastilles sous chaque champ sont des <b>suggestions</b> — un clic pour remplir, tu peux toujours corriger.</div>
    ${groupHTML('A')}
    ${groupHTML('B')}
  </div>

  <div id="page2" class="${page === 2 ? '' : 'hidden'}">
    <div class="card">
      <h2>📍 Coordonnées GPS</h2>
      <p class="small">Un clic : latitude, longitude et altitude sont remplies automatiquement.</p>
      <button class="block" id="btnGPS" style="margin-top:8px">📍 Récupérer ma position</button>
      <div class="row" style="margin-top:8px">
        <div><label class="fl">Latitude</label><input id="f_latitude" data-key="latitude" value="${esc(r.latitude || '')}" placeholder="35.xxxx"></div>
        <div><label class="fl">Longitude</label><input id="f_longitude" data-key="longitude" value="${esc(r.longitude || '')}" placeholder="-0.xxxx"></div>
        <div><label class="fl">Altitude (m)</label><input id="f_altitude" data-key="altitude" value="${esc(r.altitude || '')}" placeholder="120"></div>
      </div>
    </div>
    ${groupHTML('C')}
    ${groupHTML('D')}
    <div class="card">
      <h2>📷 Photos du site <span class="tag ${st.reqOk === st.reqTot ? 'ok' : 'warn'}">${st.reqOk}/${st.reqTot} obligatoires</span></h2>
      <p class="small">${st.filled}/${st.total} emplacements remplis · touche un emplacement vide pour prendre une photo ou choisir dans la galerie.</p>
      <div class="bar" style="margin:8px 0 4px"><i style="width:${st.pct}%"></i></div>
      ${photoGridHTML()}
      <p class="small" style="margin-top:10px">⚠️ Cadre droit, sujet entier, pas de contre-jour. Les images <b>EXEMPLE</b> sont des modèles : remplace-les.</p>
    </div>
  </div>

  <div class="card" style="position:sticky;bottom:76px;z-index:20;backdrop-filter:blur(10px);background:rgba(12,20,48,.96)">
    <div class="row tight">
      <button class="green" id="btnSave">💾 Enregistrer</button>
      ${isExisting ? `<button class="ghost" onclick="exportOne()">📤 Excel</button>` : ''}
      ${isExisting ? `<button class="red" onclick="deleteCurrent()">🗑️</button>` : ''}
    </div>
    <div class="small" id="autoSaveState" role="status" style="margin-top:7px">Enregistrement automatique activé</div>
  </div>`;
}

function switchPage(p){
  ST.currentPage = p;
  const r = ST.current;
  // conserver la saisie
  collectForm();
  $('#page1').classList.toggle('hidden', p !== 1);
  $('#page2').classList.toggle('hidden', p !== 2);
  $$('.locktabs button').forEach((b, i) => b.classList.toggle('active', (i + 1) === p));
  window.scrollTo({ top:0, behavior:'smooth' });
}

/* ---------------- Wiring ---------------- */
function wireEditor(){
  // saisie → état
  $$('#app [data-key]').forEach(inp => {
    inp.addEventListener('input', () => {
      ST.current[inp.dataset.key] = inp.value;
      saveDraftSoon();
    });
  });
  // suggestions
  $$('#app [data-sug]').forEach(chip => {
    chip.onclick = async () => {
      const target = document.getElementById(chip.dataset.target);
      if (!target) return;
      if (chip.dataset.sug === 'GPS auto'){ await fillGPS(); return; }
      target.value = chip.dataset.sug;
      ST.current[target.dataset.key] = chip.dataset.sug;
      buzz(8);
      saveDraftSoon();
    };
  });
  const g = document.getElementById('btnGPS');
  if (g) g.onclick = fillGPS;
  const save = document.getElementById('btnSave');
  if (save) save.onclick = () => saveCurrent();
  // photos
  $$('#app [data-shot]').forEach(el => el.onclick = e => {
    e.stopPropagation();
    const key = el.dataset.shot;
    const slot = PHOTO_SLOTS.find(s => s.key === key);
    photoActionSheet(slot, {
      currentPath: ST.currentPhotos[key],
      onFile: (file) => handlePhoto(key, file),
      onDelete: () => { deletePhotoSlot(key); }
    });
  });
  $$('#app [data-delphoto]').forEach(el => el.onclick = e => {
    e.stopPropagation();
    deletePhotoSlot(el.dataset.delphoto);
  });
  restoreDraftIfAny();
}

function renderPhotosOnly(){
  const card = $$('#app .card').find(c => c.querySelector('.pgrid'));
  if (!card) return;
  const st = reportStats(ST.currentPhotos);
  const grid = card.querySelector('.pgrid');
  const bar = card.querySelector('.bar > i');
  const tag = card.querySelector('h2 .tag');
  const small = card.querySelector('p.small');
  if (grid) grid.outerHTML = photoGridHTML();
  if (bar) bar.style.width = st.pct + '%';
  if (tag){ tag.className = 'tag ' + (st.reqOk === st.reqTot ? 'ok' : 'warn'); tag.textContent = `${st.reqOk}/${st.reqTot} obligatoires`; }
  if (small) small.textContent = `${st.filled}/${st.total} emplacements remplis · touche un emplacement vide pour prendre une photo ou choisir dans la galerie.`;
  // re-wire
  $$('#app [data-shot]').forEach(el => el.onclick = e => {
    e.stopPropagation();
    const key = el.dataset.shot;
    const slot = PHOTO_SLOTS.find(s => s.key === key);
    photoActionSheet(slot, {
      currentPath: ST.currentPhotos[key],
      onFile: (file) => handlePhoto(key, file),
      onDelete: () => { deletePhotoSlot(key); }
    });
  });
  $$('#app [data-delphoto]').forEach(el => el.onclick = e => {
    e.stopPropagation();
    deletePhotoSlot(el.dataset.delphoto);
  });
  saveDraftSoon();
}

let photoImportsInFlight = 0;
const photoImportVersions = Object.create(null);
function deletePhotoSlot(key){
  photoImportVersions[key] = (photoImportVersions[key] || 0) + 1;
  delete ST.currentPhotos[key];
  renderPhotosOnly();
}
async function handlePhoto(key, file){
  if (!/^image\//.test(file.type)) return toast('Fichier image requis', 'err');
  toast('Traitement de la photo…');
  const reportAtStart = ST.current, userAtStart = ST.user && ST.user.id;
  const importVersion = photoImportVersions[key] = (photoImportVersions[key] || 0) + 1;
  photoImportsInFlight++;
  try {
    const blob = await compressImage(file);
    if (ST.current !== reportAtStart || !ST.user || ST.user.id !== userAtStart || photoImportVersions[key] !== importVersion) return toast('Rapport changé : veuillez réimporter la photo', 'err');
    ST.photosTouched = true;
    if (!DEMO && navigator.onLine){
      try {
        const rid = ST.current.id || ('draft-' + Date.now());
        const path = await uploadPhoto(blob, rid, key, ST.user.id, ST.current.locality_id);
        if (ST.current !== reportAtStart || !ST.user || ST.user.id !== userAtStart || photoImportVersions[key] !== importVersion) return toast('Rapport changé : veuillez réimporter la photo', 'err');
        ST.currentPhotos[key] = path;
        toast('Photo importée — enregistrement en cours');
      } catch (e){
        const lid = await idbPut('photo:' + key, blob);
        if (ST.current !== reportAtStart || !ST.user || ST.user.id !== userAtStart || photoImportVersions[key] !== importVersion) return toast('Rapport changé : veuillez réimporter la photo', 'err');
        ST.currentPhotos[key] = 'local:' + lid;
        toast('Hors ligne : photo gardée sur le téléphone', 'err');
      }
    } else if (DEMO){
      ST.currentPhotos[key] = URL.createObjectURL(blob);
      toast('Photo ajoutée (démo) ✓');
    } else {
      const lid = await idbPut('photo:' + key, blob);
      if (ST.current !== reportAtStart || !ST.user || ST.user.id !== userAtStart || photoImportVersions[key] !== importVersion) return toast('Rapport changé : veuillez réimporter la photo', 'err');
      ST.currentPhotos[key] = 'local:' + lid;
      toast('Hors ligne : photo gardée sur le téléphone', 'err');
    }
    renderPhotosOnly();
  } catch (e){
    toast(e.message || 'Photo impossible', 'err');
  } finally {
    photoImportsInFlight--;
  }
}

/* ---------------- GPS ---------------- */
async function fillGPS(){
  const btn = document.getElementById('btnGPS');
  if (btn){ btn.disabled = true; btn.textContent = 'Recherche du signal…'; }
  try {
    const g = await getGPS();
    const set = (k, v) => {
      ST.current[k] = String(v);
      const el = document.querySelector(`[data-key="${k}"]`);
      if (el) el.value = String(v);
    };
    set('latitude', g.lat.toFixed(6));
    set('longitude', g.lng.toFixed(6));
    if (g.alt != null) set('altitude', Math.round(g.alt));
    saveDraftSoon();
    toast(`Position captée (±${Math.round(g.acc || 0)} m)`);
  } catch (e){
    toast(e.message, 'err');
  } finally {
    if (btn){ btn.disabled = false; btn.textContent = '📍 Récupérer ma position'; }
  }
}

/* ---------------- Collecte + validation ---------------- */
function collectForm(){
  $$('#app [data-key]').forEach(inp => { ST.current[inp.dataset.key] = inp.value; });
  return ST.current;
}

function validateReport(r){
  const errs = [];
  if (!(r.locality_id || '').trim()) errs.push('Locality ID obligatoire');
  if (!(r.locality_name || '').trim()) errs.push('Locality Name obligatoire');
  if ((r.site_acq_email || '').trim() && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(r.site_acq_email.trim()))
    errs.push('E-mail acquisition invalide');
  if ((r.latitude || '').trim() && (isNaN(parseFloat(r.latitude)) || Math.abs(parseFloat(r.latitude)) > 90))
    errs.push('Latitude invalide (entre -90 et 90)');
  if ((r.longitude || '').trim() && (isNaN(parseFloat(r.longitude)) || Math.abs(parseFloat(r.longitude)) > 180))
    errs.push('Longitude invalide (entre -180 et 180)');
  return errs;
}

/* ---------------- Enregistrement ---------------- */
async function saveCurrent(){
  clearTimeout(cloudTimer);
  if (cloudFlight) await cloudFlight;
  const r = collectForm();
  const errs = validateReport(r);
  if (errs.length){
    openModal(`<div class="mhead"><b>Champs à corriger</b><span class="spacer"></span>
      <button class="sm ghost" onclick="closeModal()">✕</button></div>
      ${errs.map(e => `<div class="checkline bad"><i>⚠️</i>${esc(e)}</div>`).join('')}
      <button class="block" style="margin-top:10px" onclick="closeModal()">Corriger</button>`);
    return;
  }
  const st = reportStats(ST.currentPhotos);
  if (st.reqOk < st.reqTot){
    const ok = await confirmDialog('Photos manquantes',
      `${st.reqTot - st.reqOk} photo(s) obligatoire(s) manquante(s). Enregistrer quand même le rapport ?`,
      'Enregistrer quand même');
    if (!ok) return;
  }
  r.photo_slots = { ...ST.currentPhotos };
  const btn = document.getElementById('btnSave');
  if (btn){ btn.disabled = true; btn.textContent = 'Enregistrement…'; }

  try {
    // 1) photos encore stockées sur le téléphone → à envoyer
    const localKeys = Object.keys(r.photo_slots).filter(k => String(r.photo_slots[k]).startsWith('local:'));
    for (const k of localKeys){
      if (DEMO || !navigator.onLine) break;
      const blob = await idbGet(String(r.photo_slots[k]).slice(6));
      if (!blob) continue;
      const path = await uploadPhoto(blob, r.id || ('draft-' + Date.now()), k, ST.user.id, r.locality_id);
      r.photo_slots[k] = path;
    }

    if (DEMO){
      r.id = r.id || 'local-' + Date.now();
      const i = ST.reports.findIndex(x => x.id === r.id);
      if (i >= 0) ST.reports[i] = r; else ST.reports.unshift(r);
      clearDraft();
      toast('Rapport enregistré (démo) ✓');
      route('reports');
      return;
    }

    const stillLocal = Object.values(r.photo_slots).some(v => String(v).startsWith('local:'));
    if (!navigator.onLine || stillLocal){
      queuePending(r);
      clearDraft();
      toast('Enregistré sur le téléphone — en attente de synchronisation');
      route('sync');
      return;
    }

    const id = await saveReportToCloud(r);
    r.id = id;
    clearDraft();
    await refreshReports();
    toast('Rapport enregistré ✓');
    route('reports');
  } catch (e){
    console.warn(e);
    // échec réseau : on met en file d'attente plutôt que de perdre la saisie
    queuePending(r);
    clearDraft();
    toast('Réseau indisponible : rapport gardé en attente', 'err');
    route('sync');
  } finally {
    if (btn){ btn.disabled = false; btn.textContent = '💾 Enregistrer'; }
  }
}

function queuePending(r){
  const copy = JSON.parse(JSON.stringify(r));
  if (!copy.id) copy.id = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const i = ST.pending.findIndex(x => x.id === copy.id);
  if (i >= 0) ST.pending[i] = copy; else ST.pending.unshift(copy);
  // visible aussi dans la liste locale
  const j = ST.reports.findIndex(x => x.id === copy.id);
  if (j >= 0) ST.reports[j] = copy; else ST.reports.unshift(copy);
  stateSavePending(); updateSyncDot();
}

async function deleteCurrent(){
  const r = ST.current;
  const ok = await confirmDialog('Supprimer ce rapport ?', 'Le rapport sera définitivement supprimé.', 'Supprimer');
  if (!ok) return;
  if (DEMO){ ST.reports = ST.reports.filter(x => x.id !== r.id); route('reports'); return; }
  try {
    const { error } = await sb.rpc('soft_delete_rapport', { p_id: r.id });
    if (error) throw error;
    await refreshReports();
    toast('Rapport supprimé');
    route('reports');
  } catch (e){ toast(e.message, 'err'); }
}

async function confirmLeave(){
  const r = collectForm();
  const hasData = Object.keys(r).some(k => r[k] && k !== 'date');
  if (hasData && !ST.current.id){
    const ok = await confirmDialog('Quitter sans enregistrer ?', 'Les champs saisis restent en brouillon sur ce téléphone.', 'Quitter', false);
    if (!ok) return;
    saveDraft();
  }
  route('reports');
}

/* ---------------- Brouillon local ---------------- */
let draftTimer = null;
let cloudTimer = null;
let cloudFlight = null;
let cloudRevision = 0;
function autoSaveState(text, error){
  const el = document.getElementById('autoSaveState');
  if (el) { el.textContent = text; el.style.color = error ? '#fbbf24' : ''; }
}
function secureReportId(){
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
function saveDraftSoon(){
  cloudRevision++;
  autoSaveState(navigator.onLine ? 'Enregistrement en cours…' : 'Hors ligne : sauvegardé sur ce téléphone, envoi en attente', !navigator.onLine);
  clearTimeout(draftTimer);
  clearTimeout(cloudTimer);
  draftTimer = setTimeout(saveDraft, 400);
  cloudTimer = setTimeout(autoSaveCurrent, 2000);
}
async function autoSaveCurrent(){
  if (!ST.user || !ST.current || DEMO) return;
  if (!navigator.onLine) { autoSaveState('Hors ligne : envoi en attente', true); cloudTimer = setTimeout(autoSaveCurrent, 30000); return; }
  if (cloudFlight) { cloudTimer = setTimeout(autoSaveCurrent, 2000); return; }
  const current = ST.current, owner = ST.user.id;
  if (!Object.keys(FR_FIELDS).some(k => k !== 'date' && current[k]) && !Object.keys(ST.currentPhotos || {}).length) return;
  if (current.id && String(current.id).startsWith('local-')) return;
  if (!current.id) {
    current.id = secureReportId();
    saveDraft();
  }
  const revision = cloudRevision;
  const snapshot = JSON.parse(JSON.stringify(current));
  snapshot.photo_slots = { ...ST.currentPhotos };
  cloudFlight = (async () => {
    try {
      for (const key of Object.keys(snapshot.photo_slots)) {
        const ref = snapshot.photo_slots[key];
        if (!String(ref).startsWith('local:')) continue;
        const blob = await idbGet(String(ref).slice(6));
        if (!blob) throw new Error('Photo locale introuvable');
        const path = await uploadPhoto(blob, snapshot.id, key, owner, snapshot.locality_id);
        snapshot.photo_slots[key] = path;
        if (ST.user && ST.user.id === owner && ST.current === current && ST.currentPhotos[key] === ref) ST.currentPhotos[key] = path;
      }
      if (!ST.user || ST.user.id !== owner) return;
      await saveReportToCloud(snapshot);
      if (ST.user && ST.user.id === owner && ST.current === current) {
        saveDraft();
        if (revision === cloudRevision) autoSaveState('Enregistré en ligne ✓');
        else { autoSaveState('Enregistrement des dernières modifications…'); clearTimeout(cloudTimer); cloudTimer = setTimeout(autoSaveCurrent, 500); }
      }
    } catch (e) {
      console.warn('Enregistrement automatique en attente', e.message);
      autoSaveState('Envoi en attente : ' + (e.message || 'connexion impossible'), true);
      if (ST.user && ST.user.id === owner && ST.current === current) cloudTimer = setTimeout(autoSaveCurrent, 30000);
    }
  })();
  try { await cloudFlight; } finally { cloudFlight = null; }
}
function saveDraft(){
  try {
    const photos = {};
    Object.keys(ST.currentPhotos || {}).forEach(k => {
      const v = ST.currentPhotos[k];
      if (v && !String(v).startsWith('blob:')) photos[k] = v;   // blob: = aperçu local non sérialisable
    });
    localStorage.setItem(userKey('draft'), JSON.stringify({ report:ST.current, photos, at:Date.now() }));
  } catch (e){}
}

/* Reprise du brouillon au démarrage (appelée par enterApp dans app.js) */
function resumeDraft(){
  try {
    const d = JSON.parse(localStorage.getItem(userKey('draft')) || 'null');
    if (!d || !d.report) return false;
    if (Date.now() - (d.at || 0) > 7 * 24 * 3600 * 1000) return false;
    const hasData = Object.keys(d.report).some(k => d.report[k] && k !== 'date');
    if (!hasData) return false;
    ST.current = d.report;
    ST.currentPhotos = d.photos || {};
    ST.currentPage = 1;
    ST.route = 'edit';
    animatePage();
    setNav('new');
    $('#app').innerHTML = viewEditor(false);
    wireEditor();
    saveDraftSoon();
    toast('Brouillon repris');
    return true;
  } catch (e){ return false; }
}
function clearDraft(){ try { localStorage.removeItem(userKey('draft')); } catch (e){} }
function restoreDraftIfAny(){
  // rien d'automatique : on restaure seulement si l'éditeur vient d'être ouvert sur un nouveau rapport
  try {
    const d = JSON.parse(localStorage.getItem(userKey('draft')) || 'null');
    if (!d || !d.report || ST.current.id) return;
    const same = (d.report.locality_id || '') === (ST.current.locality_id || '');
    if (!same) return;
    ST.current = { ...d.report, ...ST.current };
    ST.currentPhotos = d.photos || {};
  } catch (e){}
}

/* ---------------- IndexedDB minimal (photos hors ligne) ---------------- */
function idbOpen(){
  return new Promise((res, rej) => {
    const rq = indexedDB.open('sut-photos', 1);
    rq.onupgradeneeded = () => { try { rq.result.createObjectStore('blobs'); } catch (e){} };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
async function idbPut(key, blob){
  const db = await idbOpen();
  const id = key + ':' + Date.now() + ':' + Math.random().toString(36).slice(2);
  await new Promise((res, rej) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put(blob, id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
  return id;
}
async function idbGet(id){
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('blobs', 'readonly');
    const rq = tx.objectStore('blobs').get(id);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
