/* Contrôle de disponibilité de SUT Survey : écran logo pendant la pause. */
let surveyPaused = null;
let surveyControlChannel = null;
function surveyLogoOverlay(show){
  let el=document.getElementById('surveyPauseOverlay');
  if(show){
    if(!el){el=document.createElement('div');el.id='surveyPauseOverlay';el.innerHTML='<img src="img/icon-512.png" alt="SUT">';document.body.appendChild(el);}
  }else if(el)el.remove();
}
async function applySurveyAccess(enabled){
  const wasPaused=surveyPaused===true;
  surveyPaused=!enabled;
  try{localStorage.setItem('sut_access_enabled',enabled?'1':'0');}catch(e){}
  if(!enabled){
    surveyLogoOverlay(true);
    if(ST.user){
      if(typeof draftTimer!=='undefined')clearTimeout(draftTimer);
      if(typeof cloudTimer!=='undefined')clearTimeout(cloudTimer);
      if(ST.current&&(ST.route==='edit'||ST.route==='report'))saveDraft();
      clearTimeout(reportLiveTimer);
      if(reportLiveChannel){sb.removeChannel(reportLiveChannel);reportLiveChannel=null;}
      const signingOut=sb.auth.signOut({scope:'local'});
      ST.user=null;ST.profile=null;ST.current=null;ST.reports=[];ST.pending=[];ST.currentPhotos={};
      document.body.innerHTML='<main id="app"></main><div id="toast"></div>';
      surveyLogoOverlay(true);
      try{await signingOut;}catch(e){}
    }
  }else{
    surveyLogoOverlay(false);
    if(wasPaused){document.body.innerHTML='<main id="app"></main><div id="toast"></div>';renderLogin();}
  }
}
async function readSurveyAccess(){
  try{
    const {data,error}=await sb.from('sut_app_control').select('enabled').eq('singleton',true).single();
    if(error||!data||typeof data.enabled!=='boolean')throw error||Error('État indisponible');
    await applySurveyAccess(data.enabled);return data.enabled;
  }catch(e){
    if(surveyPaused===null){
      let cached=null;try{cached=localStorage.getItem('sut_access_enabled');}catch(ignored){}
      await applySurveyAccess(cached==='1');
    }
    return surveyPaused===false;
  }
}
function startSurveyMonitor(){
  if(!sb||DEMO)return;
  surveyLogoOverlay(true);
  surveyControlChannel=sb.channel('sut-access-control').on('postgres_changes',{event:'UPDATE',schema:'public',table:'sut_app_control'},payload=>{
    if(payload.new&&typeof payload.new.enabled==='boolean')applySurveyAccess(payload.new.enabled);
  }).subscribe();
  setInterval(()=>{if(!document.hidden)readSurveyAccess();},5000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)readSurveyAccess();});
  window.addEventListener('online',()=>readSurveyAccess());
}
