/* =====================================================================
   SUT Survey — UI helpers (méthode reprise du repo de référence) :
   toast, modal, ripple sur tous les boutons, transitions de page,
   navigation latérale / barre d'onglets mobile.
   ===================================================================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => (s == null ? '' : String(s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])));

/* ---------------- Toast ---------------- */
let toastTimer = null;
function toast(msg, kind){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = kind === 'err' ? 'err' : '';
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ---------------- Modal ---------------- */
function openModal(html){
  closeModal();
  const d = document.createElement('div');
  d.id = 'modal';
  d.innerHTML = `<div class="card">${html}</div>`;
  d.onclick = e => { if (e.target === d) closeModal(); };
  document.body.appendChild(d);
  document.body.style.overflow = 'hidden';
  return d;
}
function closeModal(){
  const m = document.getElementById('modal');
  if (m) m.remove();
  document.body.style.overflow = '';
}
function confirmDialog(title, text, okLabel = 'Confirmer', danger = true){
  return new Promise(resolve => {
    openModal(`
      <div class="mhead"><b>${esc(title)}</b></div>
      <p class="small" style="margin:6px 0 14px">${text}</p>
      <div class="row">
        <button class="ghost" id="cfNo">Annuler</button>
        <button class="${danger ? 'red' : ''}" id="cfYes">${esc(okLabel)}</button>
      </div>`);
    document.getElementById('cfNo').onclick = () => { closeModal(); resolve(false); };
    document.getElementById('cfYes').onclick = () => { closeModal(); resolve(true); };
  });
}

/* ---------------- Ripple (méthode référence) ---------------- */
function attachRipple(){
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('button, .sug, .rcard, .tabbtn, .navbtn');
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top  = (e.clientY - r.top  - size / 2) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.appendChild(s);
    setTimeout(() => s.remove(), 620);
  }, { passive:true });
}

/* ---------------- Navigation ---------------- */
let CURRENT_ROUTE = 'home';

function setNav(route){
  CURRENT_ROUTE = route;
  $$('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.route === route));
  $$('.tabbtn').forEach(b => b.classList.toggle('active', b.dataset.route === route));
  closeNav();
}
function openNav(){ $('#mainNav').classList.add('open'); $('#navBackdrop').classList.add('show'); }
function closeNav(){ $('#mainNav').classList.remove('open'); $('#navBackdrop').classList.remove('show'); }
function toggleNav(){ $('#mainNav').classList.contains('open') ? closeNav() : openNav(); }

/* Rejoue l'animation d'entrée de page */
function animatePage(){
  const m = $('main');
  if (!m) return;
  m.classList.remove('page-enter');
  void m.offsetWidth;
  m.classList.add('page-enter');
  window.scrollTo({ top:0, behavior:'instant' in window ? 'instant' : 'auto' });
}

/* ---------------- Formatage ---------------- */
const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
};
const fmtDateTime = d => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
};
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------------- GPS ---------------- */
function getGPS(){
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS non disponible'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat:p.coords.latitude, lng:p.coords.longitude, alt:p.coords.altitude, acc:p.coords.accuracy }),
      e => reject(new Error(e.code === 1 ? 'Autorisation GPS refusée' : 'GPS indisponible')),
      { enableHighAccuracy:true, timeout:12000, maximumAge:0 }
    );
  });
}

/* ---------------- Vibrate ---------------- */
function buzz(ms = 12){ try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

/* ---------------- Copie ---------------- */
async function copyText(txt){
  try {
    await navigator.clipboard.writeText(txt);
    toast('Copié ✓');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); toast('Copié ✓');
  }
}
