const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),path=require('path'),assert=require('assert');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const state={enabled:true,channels:[],users:[],reports:[]};
function createClient(role){
 let logged=null;
 function query(table){
  let count=false;
  const q={select(_fields,opts){count=!!(opts&&opts.head);return q;},eq(){return q;},order(){return q;},not(){return q;},update(){return q;},upsert(){return q;},insert(){return q;},single(){return Promise.resolve(result(true));},then(resolve,reject){return Promise.resolve(result(false)).then(resolve,reject);}};
  function result(single){if(table==='sut_app_control')return {data:{enabled:state.enabled},error:null};if(count)return {count:0,data:null,error:null};const data=table==='users'?state.users:state.reports;return {data:single?(data[0]||null):data,error:null,count:0};}return q;
 }
 return {auth:{getSession:async()=>({data:{session:logged?{user:logged}:null}}),signInWithPassword:async()=>{logged={id:role+'-id',email:role+'@sut-users.app',user_metadata:{username:role}};return {data:{user:logged},error:null};},signOut:async()=>{logged=null;return {error:null}},signUp:async()=>({data:{session:null},error:{message:'test only'}})},from:query,
  rpc:async(name,args)=>{if(name==='get_profile')return {data:{id:role+'-id',username:role,role:role==='admin'?'admin':'user'},error:null};if(name==='sut_set_access'){if(role!=='admin')return {error:{message:'denied'}};state.enabled=args.p_enabled;for(const cb of state.channels.slice())cb({new:{enabled:state.enabled}});return {data:state.enabled,error:null};}return {data:true,error:null};},
  channel(){return {on(_type,spec,cb){if(spec.table==='sut_app_control')state.channels.push(cb);return this;},subscribe(){return this;}}},removeChannel(){},storage:{from:()=>({getPublicUrl:p=>({data:{publicUrl:'https://example.invalid/'+p}})})}};
}
async function createApp(role){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<!doctype html><html><body><div id="splash"></div><main id="app"></main><div id="toast"></div></body></html>',{url:'https://appassets.androidplatform.net/assets/www/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;w.scrollTo=()=>{};w.__SUPABASE_URL='https://test.invalid';w.__SUPABASE_ANON='anon';w.__APP_ROLE=role;w.supabase={createClient:()=>createClient(role)};
 const names=['fields.js','ui.js','photos.js','app.js','report.js','export.js','admin.js','access-control.js'];
 const code=names.map(n=>fs.readFileSync(path.join(role+'-app','js',n),'utf8')).join('\n;\n')+'\n;boot();';
 const script=w.document.createElement('script');script.textContent=code;w.document.body.appendChild(script);await delay(80);
 return {dom,w,errors,doc:w.document};
}
async function click(doc,selector){const e=doc.querySelector(selector);assert(e,'Bouton absent: '+selector);assert(!e.disabled,'Bouton désactivé: '+selector);e.click();await delay(40);}
async function login(app,role){app.doc.querySelector('#liUser').value=role;app.doc.querySelector('#liPass').value='test-pass';await click(app.doc,'#btnLogin');assert(app.doc.querySelector('#bottomnav'),'Écran principal absent après connexion '+role);}
(async()=>{
 const user=await createApp('user');assert(user.doc.querySelector('#tabSignup'),'Inscription absente');
 await click(user.doc,'#tabSignup');assert(!user.doc.querySelector('#signupPane').classList.contains('hidden'),'Onglet inscription bloqué');
 await click(user.doc,'#tabLogin');assert(!user.doc.querySelector('#loginPane').classList.contains('hidden'),'Onglet connexion bloqué');
 await click(user.doc,'.pwtoggle');assert.equal(user.doc.querySelector('#liPass').type,'text','Affichage mot de passe bloqué');
 await login(user,'user');
 for(const selector of ['[data-route="reports"].tabbtn','[data-route="export"].tabbtn','[data-route="home"].tabbtn']){await click(user.doc,selector);assert(user.doc.querySelector('#app').textContent.trim(),'Section vide '+selector);}
 await click(user.doc,'#btnNew');assert(user.doc.querySelector('#page1'),'Formulaire absent');
 await click(user.doc,'#app .locktabs button:nth-child(2)');
 assert(!user.doc.querySelector('#page2').classList.contains('hidden'),'Page 2 absente');
 const photo=user.doc.querySelector('[data-shot]');assert(photo,'Bouton photo absent');photo.click();await delay(20);assert(user.doc.querySelector('#modal'),'Choix photo absent');
 await click(user.doc,'#modal .mhead button');
 const admin=await createApp('admin');await click(admin.doc,'#tabLogin');await login(admin,'admin');
 assert(admin.doc.querySelector('#disableSurvey'),'Contrôle de désactivation absent');
 await click(admin.doc,'#disableSurvey');assert(admin.doc.querySelector('#cfYes'),'Confirmation absente');await click(admin.doc,'#cfYes');await delay(60);
 assert(!state.enabled,'Désactivation échouée');assert(user.doc.querySelector('#surveyPauseOverlay'),'Logo pause absent');assert(!user.doc.querySelector('#bottomnav'),'Utilisateur encore connecté');
 await click(admin.doc,'#enableSurvey');await delay(60);assert(state.enabled,'Réactivation échouée');assert(!user.doc.querySelector('#surveyPauseOverlay'),'Logo non masqué après réactivation');assert(user.doc.querySelector('#btnLogin'),'Connexion non restaurée');
 for(const sel of ['[data-route="admin"].tabbtn','[data-route="all"].tabbtn','[data-route="export"].tabbtn','[data-route="home"].tabbtn']){await click(admin.doc,sel);assert(admin.doc.querySelector('#app').textContent.trim(),'Section admin vide '+sel);}
 assert.deepStrictEqual(user.errors,[],'Erreurs JS utilisateur: '+user.errors.join(' | '));assert.deepStrictEqual(admin.errors,[],'Erreurs JS admin: '+admin.errors.join(' | '));
 user.dom.window.close();admin.dom.window.close();console.log('Tests UI OK : connexion, inscription, navigation, formulaire, photo, pause et réactivation.');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
