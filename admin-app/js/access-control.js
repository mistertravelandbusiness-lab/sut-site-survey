/* Actions d'administration de l'accès SUT Survey. */
async function loadSurveyControl(){
 const box=document.getElementById('surveyControl');if(!box)return;
 try{
  const {data,error}=await sb.from('sut_app_control').select('enabled').eq('singleton',true).single();
  if(error||!data)throw error||Error('État indisponible');
  const on=data.enabled;
  box.innerHTML=`<h2>Accès SUT Survey</h2><p class="small" style="margin:8px 0">${on?'Application activée':'Application désactivée · logo seul côté utilisateurs'}</p><div class="row tight"><button class="${on?'ghost':'green'}" id="enableSurvey" ${on?'disabled':''}>Activer</button><button class="${on?'red':'ghost'}" id="disableSurvey" ${on?'':'disabled'}>Désactiver</button></div>`;
  box.querySelector('#enableSurvey').onclick=()=>setSurveyAccess(true);
  box.querySelector('#disableSurvey').onclick=()=>setSurveyAccess(false);
 }catch(e){box.innerHTML='<h2>Accès SUT Survey</h2><div class="banner bad">État indisponible : '+esc(e.message||'erreur')+'</div><button id="retryControl" class="ghost">Réessayer</button>';box.querySelector('#retryControl').onclick=loadSurveyControl;}
}
async function setSurveyAccess(enabled){
 if(!enabled){const ok=await confirmDialog('Désactiver SUT Survey ?', 'Les utilisateurs connectés seront déconnectés. Seul le logo restera visible jusqu’à la réactivation.', 'Désactiver');if(!ok)return;}
 const box=document.getElementById('surveyControl');if(box)box.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{const {error}=await sb.rpc('sut_set_access',{p_enabled:enabled});if(error)throw error;toast(enabled?'Application activée':'Application désactivée');}
 catch(e){toast(e.message||'Modification impossible','err');}
 finally{loadSurveyControl();}
}
async function loadAdminExport(){
 if(DEMO||!sb)return;
 try{
  const {data,error}=await sb.from('rapports').select('*').eq('is_deleted',false).order('updated_at',{ascending:false});
  if(error)throw error;
  ST.reports=(data||[]).map(r=>({...r,photo_slots:parseSlots(r.photo_slots)}));
  if(ST.route==='export'){const app=document.getElementById('app');if(app){app.innerHTML=viewExport();wireExport();}}
 }catch(e){toast('Chargement des rapports : '+e.message,'err');}
}
