/* =====================================================================
   SUT Survey — Export Excel
   Le nom du fichier = LOCALITY ID  (ex : ORA-BEJ-0142.xlsx)
   - un seul rapport  → <locality_id>.xlsx
   - sélection        → <locality_id>_export.xlsx
   - tout             → EXPORT_SUT_<date>.xlsx
   ===================================================================== */

function safeFileName(s){
  return String(s || 'SANS-ID').trim().replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+$/,'').slice(0, 80) || 'SANS-ID';
}

/* Construit la feuille : 1 ligne d'en-tête + 1 ligne par rapport */
function buildSheet(rows){
  const heads = EXPORT_COLUMNS.map(c => c[1]);
  const body = rows.map(r => EXPORT_COLUMNS.map(c => {
    const v = r[c[0]];
    if (c[0] === 'date' && v) return fmtDate(v);
    return v == null ? '' : v;
  }));
  const aoa = [heads, ...body];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = heads.map(h => ({ wch: Math.max(12, Math.min(26, h.length + 4)) }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}

/* Nom de fichier selon la sélection */
function exportFileName(rows){
  if (rows.length === 1) return safeFileName(rows[0].locality_id || rows[0].locality_name) + '.xlsx';
  if (rows.length > 1 && rows.length <= 6){
    const ids = rows.map(r => safeFileName(r.locality_id || r.locality_name));
    return ids.join('-').slice(0, 90) + '_export.xlsx';
  }
  const d = new Date().toISOString().slice(0, 10);
  return `EXPORT_SUT_${d}.xlsx`;
}

function doExport(rows){
  if (!rows || !rows.length) return toast('Aucun rapport à exporter', 'err');
  if (typeof XLSX === 'undefined') return toast('Module Excel indisponible', 'err');
  const wb = XLSX.utils.book_new();
  const ws = buildSheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'SUT Survey');

  // 2e onglet : index des photos (utile pour le contrôle qualité)
  const pIdx = [['LOCALITY ID', 'EMPLACEMENT', 'URL PHOTO']];
  rows.forEach(r => {
    PHOTO_SLOTS.forEach(s => {
      const p = (r.photo_slots || {})[s.key];
      if (p && !String(p).startsWith('img/examples')) pIdx.push([r.locality_id || '', s.label, photoUrl(p) || '']);
    });
  });
  if (pIdx.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pIdx), 'Photos');

  const name = exportFileName(rows);
  if (window.SUTExport && typeof window.SUTExport.saveWorkbook === 'function') {
    const encoded = XLSX.write(wb, { bookType: 'xlsx', type: 'base64', compression: true });
    window.SUTExport.saveWorkbook(name, encoded);
    toast('Choisissez où enregistrer le rapport');
  } else {
    XLSX.writeFile(wb, name, { compression: true });
    toast('Export : ' + name);
  }
  return name;
}

/* Export d'un seul rapport depuis l'éditeur */
function exportOne(){
  const r = collectForm();
  r.photo_slots = { ...ST.currentPhotos };
  doExport([r]);
}

/* ---------------- Vue : Export ---------------- */
let EXPORT_SEL = new Set();

function viewExport(){
  const list = ST.reports || [];
  return `
    <div class="sectitle">Export Excel</div>
    <div class="card">
      <h2>📤 Exporter les rapports</h2>
      <p class="small">Le fichier porte le nom du <b>Locality ID</b> :
        <kbd>ORA-BEJ-0142.xlsx</kbd>. Pour plusieurs rapports, les identifiants sont regroupés.</p>
      <div class="row tight" style="margin-top:10px">
        <button class="ghost sm" onclick="exportSelectAll()">Tout sélectionner</button>
        <button class="ghost sm" onclick="exportSelectNone()">Aucun</button>
      </div>
    </div>
    <div class="card" style="padding:11px">
      ${list.length ? list.map(r => `
        <label class="checkline" style="cursor:pointer">
          <input type="checkbox" class="exchk" data-id="${r.id}" style="width:18px;margin:0;flex:none" ${EXPORT_SEL.has(r.id) ? 'checked' : ''}>
          <span style="flex:1;min-width:0">
            <b>${esc(r.locality_id || 'SANS-ID')}</b> · ${esc(r.locality_name || '—')}
            <span class="small" style="display:block">${fmtDate(r.date)} · ${Object.keys(r.photo_slots || {}).length} photos</span>
          </span>
          <button class="sm ghost" onclick="event.preventDefault();exportSingle('${r.id}')">⬇</button>
        </label>`).join('')
        : `<div class="empty"><div class="big">📋</div>Aucun rapport à exporter</div>`}
    </div>
    <div class="card">
      <button class="block green" onclick="exportSelected()">📤 Exporter la sélection</button>
      <button class="block ghost" style="margin-top:8px" onclick="exportAllLocal()">📦 Exporter tous mes rapports</button>
      <p class="small" style="margin-top:9px">Le fichier est enregistré dans « Téléchargements ». Il s'ouvre dans Excel / WPS / Google Sheets.</p>
    </div>`;
}

function wireExport(){
  $$('.exchk').forEach(c => c.onchange = () => {
    c.checked ? EXPORT_SEL.add(c.dataset.id) : EXPORT_SEL.delete(c.dataset.id);
  });
}
function exportSelectAll(){ (ST.reports || []).forEach(r => EXPORT_SEL.add(r.id)); route('export'); }
function exportSelectNone(){ EXPORT_SEL.clear(); route('export'); }
async function exportSingle(id){
  const own = ST.reports.find(x => x.id === id);
  if (own) return doExport([own]);
  try {
    const { data, error } = await sb.from('rapports').select('*').eq('id', id).single();
    if (error) throw error;
    data.photo_slots = parseSlots(data.photo_slots);
    doExport([data]);
  } catch (e) { toast('Export impossible : ' + e.message, 'err'); }
}
function exportSelected(){
  const rows = (ST.reports || []).filter(r => EXPORT_SEL.has(r.id));
  if (!rows.length) return toast('Sélectionne au moins un rapport', 'err');
  doExport(rows);
}
function exportAllLocal(){
  if (!(ST.reports || []).length) return toast('Aucun rapport', 'err');
  doExport(ST.reports);
}
