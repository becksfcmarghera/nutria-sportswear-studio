import {requestContext} from './context';import {verifySession,readCookie,sameOrigin,loginPage,login,logout} from './auth.mjs';
import * as r0 from '../app/api/session/route.ts';
import * as r1 from '../app/api/bozze/route.ts';
import * as r2 from '../app/api/photos/route.ts';
import * as r3 from '../app/api/files/[...key]/route.ts';
const routes=[{pattern:new RegExp("^/api/session/?$"),module:r0,param:null},{pattern:new RegExp("^/api/bozze/?$"),module:r1,param:null},{pattern:new RegExp("^/api/photos/?$"),module:r2,param:null},{pattern:new RegExp("^/api/files/(.+)/?$"),module:r3,param:"key"}];
const slug="nutria";
export default {async fetch(req:Request,env:any){const url=new URL(req.url);try{
 if(url.pathname==='/login')return loginPage(slug,url);
 if(url.pathname==='/api/login'&&req.method==='POST')return login(req,env,slug);
 if(url.pathname==='/api/logout'&&req.method==='POST')return logout(req);
 if(url.pathname==='/logout')return new Response('<!doctype html><html lang="it"><title>Esci</title><form method="post" action="/api/logout"><button>Esci dalla gestione</button></form></html>',{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
 if(url.pathname.startsWith('/api/')){
  if(!['GET','HEAD'].includes(req.method)&&!sameOrigin(req))return new Response('Origine non valida',{status:403});
  if(Number(req.headers.get('Content-Length')||0)>42000000)return new Response('Richiesta troppo grande',{status:413});
  const admin=await verifySession(readCookie(req),env);
  return requestContext.run({admin},async()=>{for(const route of routes){const match=url.pathname.match(route.pattern);if(match){const fn=(route.module as any)[req.method];if(!fn)return new Response('Metodo non consentito',{status:405});let params:any={};if(route.param==='key')params.key=match[1].split('/').map(decodeURIComponent);if(route.param==='id')params.id=decodeURIComponent(match[1]);const response=await fn(req,{params:Promise.resolve(params)});const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.set('X-Content-Type-Options','nosniff');return new Response(response.body,{status:response.status,headers})}}return new Response('Non trovato',{status:404})});
 }
 if(slug==='nutria'&&['/bozze','/progetti'].includes(url.pathname)){url.pathname='/manage.html';return env.ASSETS.fetch(new Request(url,req));}
 if(['/','/studio','/studio.html'].includes(url.pathname)){url.pathname='/index.html';return env.ASSETS.fetch(new Request(url,req));}
 return env.ASSETS.fetch(req);
 }catch(error){console.error('Errore richiesta',url.pathname,error instanceof Error?error.message:'unknown');return Response.json({error:'Operazione non riuscita. Riprova.'},{status:500,headers:{'Cache-Control':'no-store'}})}}};
