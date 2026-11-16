import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {issueSession,COOKIE} from '../server/auth.mjs';
const result=await build({stdin:{contents:"export {default as worker} from './server/worker.ts'; export {env as bindings} from 'cloudflare:workers';",resolveDir:fileURLToPath(new URL('..',import.meta.url))},bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'local-bindings',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'bindings',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env={};'}));}}]});
const {worker,bindings}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].contents).toString('base64'));
const origin='https://nutria.example';
const env={ADMIN_EMAIL:'becksfcmarghera@gmail.com',SESSION_SECRET:'a'.repeat(64),ASSETS:{fetch:async r=>new Response('asset:'+new URL(r.url).pathname)},DB:{prepare:sql=>({all:async()=>({results:sql.includes('sqlite_master')?[{name:'drafts'},{name:'photos'}]:[]})})},BUCKET:{list:async()=>({objects:[]})}};
Object.assign(bindings,env);
const access={...env,AUTH_MODE:'access',ACCESS_TEAM_DOMAIN:'https://nutria-test.cloudflareaccess.com',ACCESS_AUD:'test-audience'};
const fetch=(path,options={},config=access)=>worker.fetch(new Request(origin+path,options),config);
test('Public pages, project listing and customer submission remain outside admin authentication',async()=>{
 assert.equal((await fetch('/')).status,200);
 assert.equal((await fetch('/progetti')).status,200);
 assert.equal((await fetch('/api/photos')).status,200);
 const response=await fetch('/api/bozze',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});
 assert.equal(response.status,400); // Public handler validates input, no Access gate.
 assert.deepEqual(await (await fetch('/api/session')).json(),{isAdmin:false});
});
test('Admin APIs reject anonymous access and old cookies in Access mode',async()=>{
 const cookie=`${COOKIE}=${await issueSession(env)}`;
 for(const path of ['/api/admin/bozze','/api/admin/session','/api/admin/health','/api/admin/photos','/api/admin/files/drafts/id/png'])assert.equal((await fetch(path,{headers:{Cookie:cookie}})).status,401);
 assert.equal((await fetch('/api/bozze')).status,403);
 assert.equal((await fetch('/api/files/drafts/id/png')).status,403);
 assert.equal((await fetch('/api/login',{method:'POST'})).status,403);
});
test('Admin page aliases cannot serve the dashboard without authentication',async()=>{
 for(const path of ['/bozze','/bozze/','/manage.html','/configura-admin.html','/login'])assert.equal((await fetch(path)).headers.get('Location'),origin+'/admin');
 assert.equal((await fetch('/admin')).status,403);
 assert.equal((await fetch('/admin/progetti')).status,403);
 assert.equal((await fetch('/admin',{}, {...access,ACCESS_AUD:''})).status,503);
});
test('Legacy mode stays usable until the deliberate Access switch',async()=>{
 const headers={Cookie:`${COOKIE}=${await issueSession(env)}`};
 assert.equal((await fetch('/admin',{headers},env)).status,200);
 assert.equal((await fetch('/api/admin/bozze',{headers},env)).status,200);
 const health=await fetch('/api/admin/health',{headers},env);assert.equal(health.status,200);assert.deepEqual(await health.json(),{d1:true,r2:true});
 assert.equal((await fetch('/api/admin/bozze',{headers:{...headers,Origin:'https://other.example'},method:'PATCH',body:'{}'},env)).status,403);
 assert.equal((await fetch('/admin',{},env)).status,302);
});
