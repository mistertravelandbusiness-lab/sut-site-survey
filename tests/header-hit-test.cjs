const { chromium } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const files=['fields.js','ui.js','photos.js','app.js','report.js','export.js','admin.js','access-control.js'];
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="splash"></div><main id="app"></main><div id="toast"></div></body></html>');});
async function run(browser,role,width,port){
 const context=await browser.newContext({viewport:{width,height:720},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+port+'/');
 await page.addStyleTag({content:fs.readFileSync(path.join(role+'-app','css','app.css'),'utf8')});
 await page.evaluate(role=>{
  window.__SUPABASE_URL='https://example.invalid';window.__SUPABASE_ANON='fake';window.__APP_ROLE=role;
  const user={id:role+'-test',email:role+'@sut-users.app',user_metadata:{username:role}};
  const report={id:'11111111-1111-4111-8111-111111111111',user_id:user.id,locality_id:'TEST-001',locality_name:'Test terrain',date:'2026-10-29',photo_slots:[],is_deleted:false};
  function query(table){let head=false;const q={select(_s,opts){head=!!(opts&&opts.head);return q;},eq(){return q;},order(){return q;},not(){return q;},update(){return q;},upsert(){return q;},insert(){return q;},single(){return Promise.resolve(out(true));},then(a,b){return Promise.resolve(out(false)).then(a,b);}};function out(single){if(table==='sut_app_control')return{data:{enabled:true},error:null};if(head)return{count:0,error:null};const rows=table==='rapports'?[report]:[];return{data:single?(rows[0]||null):rows,error:null};}return q;}
  window.supabase={createClient:()=>({from:query,auth:{getSession:async()=>({data:{session:{user}}}),signOut:async()=>({error:null})},rpc:async n=>n==='get_profile'?{data:{id:user.id,username:role,role:role==='admin'?'admin':'user'},error:null}:{data:true,error:null},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){},storage:{from:()=>({getPublicUrl:p=>({data:{publicUrl:'https://example.invalid/'+p}})})}})};
 },role);
 const scripts=files.map(f=>fs.readFileSync(path.join(role+'-app','js',f),'utf8')).join('\n;\n');
 await page.addScriptTag({content:scripts+'\n;boot();'});
 await page.locator('#btnSync').waitFor({state:'visible',timeout:10000});
 const ids=['btnMenu','btnSync',role==='user'?'btnNew':'btnUsers'];
 for(const id of ids){
  const loc=page.locator('#'+id),box=await loc.boundingBox();assert(box,role+' '+width+' '+id+' introuvable');assert(box.width>=48&&box.height>=48,role+' '+width+' '+id+' trop petit: '+JSON.stringify(box));
  const hit=await loc.evaluate(e=>{const r=e.getBoundingClientRect(),p=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return p===e||e.contains(p);});assert(hit,role+' '+width+' '+id+' recouvert');
 }
 await page.locator('#btnMenu').tap();assert(await page.locator('#mainNav').evaluate(e=>e.classList.contains('open')),'Menu non ouvert');
 await page.locator('#mainNav [data-route="'+(role==='user'?'reports':'all')+'"]').tap();
 if(role==='user'){
  await page.locator('.rcard').waitFor({state:'visible'});await page.locator('.rcard').tap();assert(await page.locator('#page1').isVisible(),'Rapport existant ne s’ouvre pas');
  await page.locator('#btnNew').tap();assert(await page.locator('#page1').isVisible(),'Nouveau rapport ne s’ouvre pas');
 }else assert((await page.locator('#app').innerText()).includes('rapports'),'Liste admin non ouverte');
 await page.locator('#btnSync').tap();assert((await page.locator('#app').innerText()).includes('Synchronisation'),'Synchronisation ne s’ouvre pas');
 if(role==='admin'){await page.locator('#btnUsers').tap();assert((await page.locator('#app').innerText()).includes('Administration'),'Utilisateurs ne s’ouvre pas');}
 assert.deepStrictEqual(errors,[],role+' '+width+' erreurs JS');await context.close();console.log('OK',role,width+'px','menu, rapport/utilisateurs et synchronisation');
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});try{for(const w of [320,360,390,412])for(const role of ['user','admin'])await run(browser,role,w,server.address().port);}finally{await browser.close();server.close();}})().catch(e=>{console.error(e.stack||e);server.close();process.exit(1)});
