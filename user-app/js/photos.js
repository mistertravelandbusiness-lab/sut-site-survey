/* =====================================================================
   SUT Survey — Photos : appareil photo + galerie, compression, upload
   Les photos d'exemple embarquées servent de MODÈLE (badge EXEMPLE).
   Elles ne sont jamais envoyées à la base : elles disparaissent dès que
   l'utilisateur prend sa propre photo.
   ===================================================================== */

const PHOTO_MAX = 1600;      // px côté max
const PHOTO_QUALITY = 0.72;  // jpeg

/* ---------- Compression avant upload (data-saver terrain) ---------- */
/* Texte incrusté en bas de la photo : locality + date + GPS.
   Évite les contestations sur le lieu / la date du cliché. */
function stampLines(){
  const r = (typeof ST !== 'undefined' && ST.current) ? ST.current : {};
  const l1 = [r.locality_id, r.locality_name].filter(Boolean).join(' · ') || (typeof uname === 'function' ? uname() : 'SUT');
  const d = new Date();
  const l2 = d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  const gps = (r.latitude && r.longitude) ? `GPS ${r.latitude}, ${r.longitude}` : 'GPS non renseigné';
  return [l1, l2 + ' · ' + gps];
}

function compressImage(file, maxSide = PHOTO_MAX, quality = PHOTO_QUALITY, stamp = false){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const cx = cv.getContext('2d');
      cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h);
      cx.drawImage(img, 0, 0, w, h);
      if (stamp){
        const lines = stampLines();
        const pad = Math.round(w * 0.012) + 4;
        const fs = Math.max(11, Math.round(w * 0.019));
        const barH = Math.round(fs * (lines.length * 1.5) + pad * 1.4);
        cx.fillStyle = 'rgba(4,7,16,.62)';
        cx.fillRect(0, h - barH, w, barH);
        cx.fillStyle = '#fde68a';
        cx.font = `bold ${fs}px system-ui,Roboto,sans-serif`;
        cx.textBaseline = 'top';
        lines.forEach((t, i) => cx.fillText(t.slice(0, 90), pad, h - barH + pad * 0.6 + i * fs * 1.5));
      }
      URL.revokeObjectURL(url);
      cv.toBlob(b => b ? resolve(b) : reject(new Error('Compression impossible')), 'image/jpeg', quality);
    };
    img.onerror = e => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

/* ---------- Sélecteur : appareil photo OU galerie ---------- */
/* Renvoie un File (ou null si annulé) */
function pickPhoto(mode){ // mode = 'camera' | 'gallery'
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    if (mode === 'camera') inp.setAttribute('capture', 'environment');
    inp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(inp);
    let done = false;
    const finish = f => { if (done) return; done = true; setTimeout(() => inp.remove(), 400); resolve(f || null); };
    inp.addEventListener('change', () => finish(inp.files && inp.files[0]));
    // si l'utilisateur annule (WebView) : on libère au focus sans fichier
    window.addEventListener('focus', () => setTimeout(() => { if (!inp.files || !inp.files.length) finish(null); }, 1200), { once:true });
    inp.click();
  });
}

/* ---------- Upload Storage ---------- */
async function uploadPhoto(blob, reportId, slotKey, userId, localityId){
  const folder = [userId || 'anon', (localityId || reportId || 'sans-id').toString().replace(/[^\w\-]/g, '_')].join('/');
  const path = `${folder}/${slotKey}-${Date.now()}.jpg`;
  const { error } = await sb.storage.from('rapports').upload(path, blob, {
    contentType: 'image/jpeg', cacheControl: '31536000', upsert: false
  });
  if (error) throw error;
  return path;
}

function photoUrl(path){
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  const { data } = sb.storage.from('rapports').getPublicUrl(path);
  return data.publicUrl;
}

/* ---------- Feuille d'actions (photo) ---------- */
function photoActionSheet(slot, opts){
  const hasPhoto = !!opts.currentPath;
  const hasExample = !!slot.example;
  openModal(`
    <div class="mhead"><b>${esc(slot.label)}</b><span class="spacer"></span>
      <button class="sm ghost" onclick="closeModal()">✕</button></div>
    <p class="small" style="margin:2px 0 10px">Choisis la source de l'image.</p>
    <div class="row" style="flex-direction:column">
      <button class="block" data-act="camera">📷 Appareil photo</button>
      <button class="block blue" data-act="gallery">🖼️ Galerie</button>
      ${hasPhoto ? `<button class="block red" data-act="delete">🗑️ Supprimer la photo</button>` : ''}
      ${hasExample ? `<button class="block ghost" data-act="example">👁️ Voir l'exemple (modèle)</button>` : ''}
      ${hasPhoto ? `<button class="block ghost" data-act="view">🔍 Voir la photo actuelle</button>` : ''}
    </div>
    <p class="small" style="margin-top:10px">💡 Cadre le sujet <b>horizontalement</b>, évite le contre-jour et
    les doigts devant l'objectif. Le GPS est enregistré avec le rapport.</p>
  `);
  const m = document.getElementById('modal');
  m.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
    const act = b.dataset.act;
    if (act === 'example'){ closeModal(); openLightbox(slot.example); return; }
    if (act === 'view'){ closeModal(); openLightbox(photoUrl(opts.currentPath)); return; }
    if (act === 'delete'){ closeModal(); opts.onDelete(); return; }
    closeModal();
    const file = await pickPhoto(act);
    if (file) opts.onFile(file, act);
  });
}

/* ---------- Lightbox ---------- */
function openLightbox(src, caption){
  const d = document.createElement('div');
  d.id = 'lightbox';
  d.innerHTML = `<div style="text-align:center">
      <img src="${src}" alt="">
      ${caption ? `<div class="small" style="margin-top:8px">${esc(caption)}</div>` : ''}
      <button class="ghost sm" style="margin-top:10px">Fermer</button></div>`;
  d.onclick = e => { if (e.target === d || e.target.tagName === 'BUTTON') d.remove(); };
  document.body.appendChild(d);
}
