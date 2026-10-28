/* =====================================================================
   SUT Survey — Définition des champs du rapport FR (Fiche de Renseignement)
   + SUGGESTIONS (les cases sont VIDES, les valeurs ci-dessous sont
   proposées en un clic sous chaque champ) + emplacements photos.
   ===================================================================== */

/* ---------- Emplacements photos (grille type rapport SUT) ---------- */
const PHOTO_SLOTS = [
  { key:'pano',    label:'Panorama du site',        required:true,  example:'img/examples/01-panorama.jpg' },
  { key:'antenne', label:'Antenne / pylône',        required:true,  example:'img/examples/02-antenne.jpg' },
  { key:'acces',   label:'Voie d\'accès',           required:true,  example:'img/examples/03-acces.jpg' },
  { key:'local',   label:'Local technique',         required:true,  example:'img/examples/04-local-technique.jpg' },
  { key:'sol',     label:'Sol / fondation',         required:true,  example:'img/examples/05-sol.jpg' },
  { key:'village', label:'Agglomération proche',    required:true,  example:'img/examples/06-village.jpg' },
  { key:'plaque',  label:'Plaque / panneau site',   required:true,  example:null },
  { key:'az_nord', label:'Azimut Nord',             required:false, example:null },
  { key:'az_sud',  label:'Azimut Sud',              required:false, example:null },
  { key:'equipe',  label:'Équipe sur site',         required:false, example:null }
];

/* ---------- Champs : chaque champ = clé en base ---------- */
/* type: text | num | date | tel | email | area | select(sugg) */
const FR_FIELDS = {
  /* --- Page 1 / A. Identification --- */
  locality_id:   { g:'A', label:'Locality ID *',        type:'text',  ph:'ex : ORA-BEJ-0142',  req:true,
                   sugg:['ORA-BEJ-0142','ORA-ESN-0031','ALG-BAB-0007'], hint:'Identifiant unique — sert aussi de nom de fichier export' },
  locality_name: { g:'A', label:'Locality Name *',      type:'text',  ph:'Nom de la localité', req:true, sugg:[] },
  site_type:     { g:'A', label:'Site Type',            type:'text',  ph:'Type de site',
                   sugg:['Greenfield','Rooftop','Shelter','BTS','NodeB','LTE','2G / 3G','4G'] },
  region:        { g:'A', label:'Région / Region',      type:'text',  ph:'Région',
                   sugg:['Oranie','Alger','Centre','Est','Ouest','Sud','Hauts Plateaux'] },
  commune:       { g:'A', label:'Commune',              type:'text',  ph:'Commune', sugg:[] },
  agglo_name:    { g:'A', label:'Agglomération (nom)',  type:'text',  ph:'Nom de l\'agglomération', sugg:[] },
  date:          { g:'A', label:'Date *',               type:'date',  req:true },
  rt_possible:   { g:'A', label:'RT possible ?',        type:'text',  ph:'Oui / Non',
                   sugg:['Oui','Non','À vérifier'] },

  /* --- B. Coordonnées & contacts --- */
  /* gpsOnly : rendus uniquement dans la carte GPS (page 2) — évite les doublons */
  latitude:      { g:'B', label:'Latitude',   type:'num', gpsOnly:true, ph:'ex : 35.7054' },
  longitude:     { g:'B', label:'Longitude',  type:'num', gpsOnly:true, ph:'ex : -0.6389' },
  altitude:      { g:'B', label:'Altitude (m)', type:'num', gpsOnly:true, ph:'ex : 148' },
  site_acq_phone:{ g:'B', label:'Tél. acquisition site', type:'tel', ph:'0X XX XX XX XX', sugg:[] },
  site_acq_email:{ g:'B', label:'E-mail acquisition',    type:'email', ph:'nom@exemple.dz', sugg:[] },
  village_contact:{g:'B', label:'Contact village',       type:'text', ph:'Nom + tél.', sugg:[] },
  land_owner:    { g:'B', label:'Propriétaire du terrain', type:'text', ph:'Nom du propriétaire', sugg:[] },

  /* --- C. Terrain & environnement --- */
  rural_height:  { g:'C', label:'Hauteur rurale',        type:'text', ph:'', sugg:['< 10 m','10 – 20 m','20 – 30 m','> 30 m'] },
  space_required:{ g:'C', label:'Espace requis',         type:'text', ph:'', sugg:['100 m²','200 m²','400 m²','625 m² (25×25)'] },
  space_available:{g:'C', label:'Espace disponible',     type:'text', ph:'', sugg:['Oui','Non','Partiel'] },
  access_road:   { g:'C', label:'Route d\'accès',        type:'text', ph:'', sugg:['Route goudronnée','Chemin de terre','Piste','Aucun accès carrossable'] },
  road_width:    { g:'C', label:'Largeur route (m)',     type:'text', ph:'', sugg:['3 m','4 m','5 m','6 m'] },
  road_distance: { g:'C', label:'Distance route',        type:'text', ph:'', sugg:['< 100 m','100 – 500 m','500 m – 1 km','> 1 km'] },
  soil_type:     { g:'C', label:'Nature du sol',         type:'text', ph:'', sugg:['Rocheux','Argileux','Sableux','Terre végétale','Mixte'] },
  site_surface:  { g:'C', label:'Topographie du site',   type:'text', ph:'', sugg:['Plat','Légère pente','Forte pente','Ondulé'] },
  main_power:    { g:'C', label:'Électricité (SONELGAZ)',type:'text', ph:'', sugg:['Oui','Non','À proximité (< 200 m)','Groupe électrogène'] },
  surface_relief:{ g:'C', label:'Relief de surface',     type:'text', ph:'', sugg:['Plat','Ondulé','Accidenté','Rocheux'] },
  rainy_season:  { g:'C', label:'Accessible en saison des pluies', type:'text', ph:'', sugg:['Oui','Non','Difficilement'] },
  site_access:   { g:'C', label:'Accessibilité du site', type:'text', ph:'', sugg:['Facile','Difficile','Très difficile'] },
  surrounding_remark:{ g:'C', label:'Remarque environnement', type:'area', ph:'Habitations, lignes HT, obstacles…', sugg:[] },
  land_acquisition:{ g:'C', label:'Mode d\'acquisition du terrain', type:'text', ph:'', sugg:['Achat','Location','Don','Litige','À négocier'] },
  matrilas_delivery:{ g:'C', label:'Livraison matériaux (Matrilas)', type:'text', ph:'', sugg:['Oui','Non','Partiel'] },

  /* --- Page 2 / D. Réseau radio --- */
  voice_network: { g:'D', label:'Réseau voix',      type:'text', ph:'', sugg:['2G','3G','4G','5G','Aucun'] },
  voice_quality: { g:'D', label:'Qualité voix',     type:'text', ph:'', sugg:['Bonne','Moyenne','Mauvaise'] },
  data_network:  { g:'D', label:'Réseau data',      type:'text', ph:'', sugg:['3G','4G','4G+','5G','Aucun'] },
  speed_test:    { g:'D', label:'Débit mesuré (Mbps)', type:'text', ph:'ex : 18.4', sugg:['0 – 1','1 – 5','5 – 20','> 20'] },
  subcontractor_rep:{ g:'D', label:'Représentant sous-traitant', type:'text', ph:'Nom', sugg:[] },
  huawei_rep:    { g:'D', label:'Représentant Huawei', type:'text', ph:'Nom', sugg:[] }
};

/* Libellés de groupes (sections du formulaire) */
const GROUPS = {
  A:{ title:'A · Identification du site', icon:'📍' },
  B:{ title:'B · Coordonnées & contacts', icon:'🗺️' },
  C:{ title:'C · Terrain & environnement', icon:'⛰️' },
  D:{ title:'D · Réseau & présence sur site', icon:'📶' }
};

/* Champs exportés (ordre du fichier Excel = ordre du rapport SUT) */
const EXPORT_COLUMNS = [
  ['locality_id','LOCALITY ID'], ['locality_name','LOCALITY NAME'],
  ['site_type','SITE TYPE'], ['region','REGION'], ['commune','COMMUNE'],
  ['agglo_name','AGGLO NAME'], ['rt_possible','RT POSSIBLE'],
  ['latitude','LATITUDE'], ['longitude','LONGITUDE'], ['altitude','ALTITUDE'],
  ['site_acq_phone','SITE ACQ PHONE'], ['site_acq_email','SITE ACQ EMAIL'],
  ['village_contact','VILLAGE CONTACT'], ['land_owner','LAND OWNER'],
  ['rural_height','RURAL HEIGHT'], ['space_required','SPACE REQUIRED'],
  ['space_available','SPACE AVAILABLE'], ['access_road','ACCESS ROAD'],
  ['road_width','ROAD WIDTH'], ['road_distance','ROAD DISTANCE'],
  ['soil_type','SOIL TYPE'], ['site_surface','SITE SURFACE'],
  ['main_power','MAIN POWER'], ['surface_relief','SURFACE RELIEF'],
  ['rainy_season','RAINY SEASON'], ['site_access','SITE ACCESS'],
  ['surrounding_remark','SURROUNDING REMARK'], ['land_acquisition','LAND ACQUISITION'],
  ['matrilas_delivery','MATRILAS DELIVERY'],
  ['voice_network','VOICE NETWORK'], ['voice_quality','VOICE QUALITY'],
  ['data_network','DATA NETWORK'], ['speed_test','SPEED TEST'],
  ['subcontractor_rep','SUBCONTRACTOR REP'], ['huawei_rep','HUAWEI REP'],
  ['date','DATE']
];

/* Valeurs par défaut d'un nouveau rapport : CASES VIDES */
function emptyReport(){
  const o = {};
  Object.keys(FR_FIELDS).forEach(k => o[k] = '');
  o.date = new Date().toISOString().slice(0,10);
  o.photo_slots = [];
  return o;
}
