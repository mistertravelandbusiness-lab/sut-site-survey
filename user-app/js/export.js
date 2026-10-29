/* Export vers les deux feuilles du modèle fourni par le client. */
function safeFileName(s){return String(s||'SANS-ID').trim().replace(/[\\/:*?"<>|\x00-\x1f]+/g,'_').replace(/[. ]+$/,'').slice(0,120)||'SANS-ID';}
function exportFileName(rows){return safeFileName(rows[0].locality_id||rows[0].locality_name)+'.xlsx';}
const REPORT_CELLS={locality_name:'B4',locality_id:'D4',site_type:'F4',region:'B5',commune:'D5',rt_possible:'F5',longitude:'B6',latitude:'D6',altitude:'F6',agglo_name:'B7',site_acq_phone:'D7',site_acq_email:'F7',village_contact:'B8',land_owner:'E8',rural_height:'B9',space_required:'D9',space_available:'F9',access_road:'B10',road_width:'D10',road_distance:'F10',soil_type:'B11',site_surface:'D11',main_power:'F11',surface_relief:'B12',rainy_season:'D12',site_access:'F12',surrounding_remark:'C13',land_acquisition:'F13',matrilas_delivery:'C14',voice_network:'B16',voice_quality:'D16',data_network:'B17',speed_test:'D17'};
const PHOTO_ZONES={site_location:[1,6,19,19],power_available_photo:[0,1,22,22],power_distance_photo:[1,2,22,22],power_access_1:[2,4,22,22],power_access_2:[4,6,22,22],az_nord:[0,3,25,25],az_030:[3,6,25,25],az_060:[0,3,27,27],az_090:[3,6,27,27],az_120:[0,3,29,29],az_150:[3,6,29,29],az_sud:[0,3,31,31],az_210:[3,6,31,31],az_240:[0,3,33,33],az_270:[3,6,33,33],az_300:[0,3,35,35],az_330:[3,6,35,35],obstacle_photo:[0,2,37,37],acces:[2,4,37,37],road_extra:[4,6,37,37],site_sketch:[0,6,39,39],power_source_1:[0,3,41,41],power_source_2:[3,6,41,41],power_sketch:[0,6,43,43],pano:[0,3,45,45],overview_2:[3,6,45,45],antenne:[0,6,47,47],building_1:[0,3,49,76],building_2:[3,6,49,76]};
async function reportPhotoBlob(ref){
 if(String(ref).startsWith('local:')){const b=await idbGet(String(ref).slice(6));if(!b)throw Error('photo locale introuvable');return b;}
 if(/^(blob:|data:|https?:)/i.test(String(ref))){const r=await fetch(ref);if(!r.ok)throw Error('photo inaccessible');return r.blob();}
 const {data,error}=await sb.storage.from('rapports').download(ref);if(error||!data)throw Error((error&&error.message)||'photo inaccessible');return data;
}
function blobDimensions(blob){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),im=new Image();im.onload=()=>{URL.revokeObjectURL(url);resolve({width:im.naturalWidth,height:im.naturalHeight});};im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('image illisible'));};im.src=url;});}
function toBase64(bytes){let text='';for(let i=0;i<bytes.length;i+=0x6000)text+=String.fromCharCode(...bytes.subarray(i,i+0x6000));return btoa(text);}
function placeFittedImage(wb,sh,data,dims,zone){
 const [c0,c1,r0,r1]=zone, widths=[],heights=[];
 for(let c=c0;c<c1;c++)widths.push(Math.max(20,(sh.getColumn(c+1).width||10)*7+5));
 for(let r=r0;r<=r1;r++)heights.push((sh.getRow(r).height||15)*4/3);
 const width=widths.reduce((a,b)=>a+b,0),height=heights.reduce((a,b)=>a+b,0),scale=Math.min((width-12)/dims.width,(height-12)/dims.height),w=dims.width*scale,h=dims.height*scale;
 // Excel offsets are EMU, not ExcelJS's internal 10000-based column units.
 // Native markers keep the image's aspect ratio and keep it inside the photo box.
 const pos=(sizes,start,px)=>{let i=0;while(i<sizes.length-1&&px>=sizes[i]){px-=sizes[i];i++;}return {index:start+i,offset:Math.max(0,Math.round(px*9525))};};
 const marker=(x,y)=>{const col=pos(widths,c0,x),row=pos(heights,r0-1,y);return {nativeCol:col.index,nativeColOff:col.offset,nativeRow:row.index,nativeRowOff:row.offset};};
 const x=(width-w)/2,y=(height-h)/2,tl=marker(x,y),br=marker(x+w,y+h);
 const id=wb.addImage({base64:'data:image/jpeg;base64,'+toBase64(new Uint8Array(data)),extension:'jpeg'});sh.addImage(id,{tl,br,editAs:'oneCell'});
}
async function buildTemplateReport(r){
 if(typeof ExcelJS==='undefined')throw Error('Module Excel indisponible');const res=await fetch('assets/report-template.xlsx');if(!res.ok)throw Error('Modèle introuvable');
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(await res.arrayBuffer());const cover=wb.getWorksheet('FACE PAGE'),sh=wb.getWorksheet('Report');if(!cover||!sh)throw Error('Modèle incomplet');
 cover.getCell('B3').value=r.locality_id||'';cover.getCell('B5').value=r.locality_name||'';cover.getCell('A8').value=r.subcontractor_rep||'';cover.getCell('C8').value=r.huawei_rep||'';cover.getCell('B9').value=r.date||'';cover.getCell('C9').value=r.date||'';
 sh.getCell('A1').value='Report ('+(r.locality_id||'')+')';for(const [field,cell] of Object.entries(REPORT_CELLS))sh.getCell(cell).value=r[field]==null?'':String(r[field]);
 let slots=r.photo_slots||{};if(Array.isArray(slots))slots=parseSlots(slots);const extras=[];
 for(const [key,ref] of Object.entries(slots)){
  if(!ref||String(ref).startsWith('img/examples/'))continue;
  try{const blob=await reportPhotoBlob(ref),dims=await blobDimensions(blob),data=await blob.arrayBuffer();if(!dims.width||!dims.height)throw Error('dimensions invalides');if(PHOTO_ZONES[key])placeFittedImage(wb,sh,data,dims,PHOTO_ZONES[key]);else extras.push({key,data,dims});}
  catch(e){const slot=PHOTO_SLOTS.find(s=>s.key===key);throw Error('Photo « '+(slot?slot.label:key)+' » : '+(e.message||'inaccessible')+'. Vérifiez la connexion et réessayez.');}
 }
 if(extras.length){const extra=wb.addWorksheet('Photos complémentaires');extra.columns=[{width:42},{width:42}];for(let i=0;i<extras.length;i++){const row=i*3+1,item=extras[i],slot=PHOTO_SLOTS.find(s=>s.key===item.key);extra.getCell('A'+row).value=slot?slot.label:item.key;extra.getRow(row).height=24;extra.getRow(row+1).height=260;extra.getRow(row+2).height=14;placeFittedImage(wb,extra,item.data,item.dims,[0,2,row+1,row+1]);}}
 return new Uint8Array(await wb.xlsx.writeBuffer());
}
async function doExport(rows){
 if(typeof photoImportsInFlight !== 'undefined' && photoImportsInFlight > 0){toast('Attendez la fin de l’importation des photos avant l’export','err');return;}
 if(!rows||!rows.length){toast('Aucun rapport à exporter','err');return;}if(rows.length!==1){toast('Sélectionnez un seul rapport par fichier Excel','err');return;}
 const name=exportFileName(rows);try{toast('Préparation du rapport et des photos…');const bytes=await buildTemplateReport(rows[0]);if(window.SUTExport&&typeof window.SUTExport.saveWorkbook==='function'){const encoded=toBase64(bytes);if(encoded.length>40000000)throw Error('Rapport trop volumineux pour cet appareil');window.SUTExport.saveWorkbook(name,encoded);toast('Choisissez où enregistrer le rapport');}else{const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Export : '+name);}return name;}
 catch(e){toast('Export impossible : '+e.message,'err');console.error('Export report failed',e);return null;}
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
        <kbd>ORA-BEJ-0142.xlsx</kbd>. Sélectionnez un rapport à la fois pour conserver la mise en page et les photos.</p>
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
      <p class="small" style="margin-top:9px">Choisissez le dossier d’enregistrement sur votre téléphone. Il s'ouvre dans Excel / WPS / Google Sheets.</p>
    </div>`;
}

function wireExport(){
  $$('.exchk').forEach(c => c.onchange = () => {
    c.checked ? EXPORT_SEL.add(c.dataset.id) : EXPORT_SEL.delete(c.dataset.id);
  });
}
function exportSelectAll(){ (ST.reports || []).forEach(r => EXPORT_SEL.add(r.id)); route('export'); }
function exportSelectNone(){ EXPORT_SEL.clear(); route('export'); }
function exportSingle(id){ const r = ST.reports.find(x => x.id === id); if (r) doExport([r]); }
function exportSelected(){
  const rows = (ST.reports || []).filter(r => EXPORT_SEL.has(r.id));
  if (!rows.length) return toast('Sélectionne au moins un rapport', 'err');
  doExport(rows);
}
function exportAllLocal(){
  if (!(ST.reports || []).length) return toast('Aucun rapport', 'err');
  doExport(ST.reports);
}
