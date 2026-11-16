import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair, SignJWT, createLocalJWKSet, exportJWK} from 'jose';
import {verifyAccess, accessSettings} from '../server/access.mjs';
import {draftRows} from '../app/bozze/rows.mjs';
const env={AUTH_MODE:'access',ADMIN_EMAIL:'becksfcmarghera@gmail.com',ACCESS_TEAM_DOMAIN:'https://nutria-test.cloudflareaccess.com',ACCESS_AUD:'test-admin-audience'};
const {privateKey,publicKey}=await generateKeyPair('RS256');
const jwk=await exportJWK(publicKey);jwk.kid='test';
const keys=createLocalJWKSet({keys:[jwk]});
async function token(overrides={}){return new SignJWT({email:env.ADMIN_EMAIL,...overrides}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).setSubject('test-admin').setIssuedAt().setExpirationTime('5m').sign(privateKey)}
const request=t=>new Request('https://nutria.example/api/admin/bozze',{headers:{'Cf-Access-Jwt-Assertion':t}});
test('Access accepts a signed token only for the intended admin',async()=>{
 assert.equal(await verifyAccess(request(await token()),env,keys),true);
 assert.equal(await verifyAccess(request(await token({email:'other@example.com'})),env,keys),false);
 assert.equal(await verifyAccess(request(await token()),{...env,ACCESS_AUD:'other-app'},keys),false);
 assert.equal(await verifyAccess(request(await token()),{...env,ACCESS_TEAM_DOMAIN:'https://other.cloudflareaccess.com'},keys),false);
});
test('Access rejects expired, forged and missing tokens and spoofed email headers',async()=>{
 const expired=await new SignJWT({email:env.ADMIN_EMAIL}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).setSubject('test-admin').setIssuedAt().setExpirationTime(1).sign(privateKey);
 assert.equal(await verifyAccess(request(expired),env,keys),false);
 const valid=await token();const [head,body,sig]=valid.split('.');
 assert.equal(await verifyAccess(request(head+'.'+body+'.'+(sig[0]==='A'?'B':'A')+sig.slice(1)),env,keys),false);
 assert.equal(await verifyAccess(new Request('https://nutria.example',{headers:{'Cf-Access-Authenticated-User-Email':env.ADMIN_EMAIL}}),env,keys),false);
 assert.equal(accessSettings({...env,ACCESS_TEAM_DOMAIN:'https://untrusted.example'}),null);
 assert.equal(await verifyAccess(request(valid),{...env,ACCESS_AUD:''},keys),false);
 assert.equal(await verifyAccess(request(valid),{...env,ADMIN_EMAIL:'other@example.com'},keys),false);
});
test('One malformed draft does not prevent the other requests from rendering',()=>{
 const rows=draftRows([{id:'good',details:'{"team":"Becks"}',files:'{"png":"drafts/good/png"}'},{id:'old',details:'broken',files:null}]);
 assert.equal(rows[0].details.team,'Becks');assert.deepEqual(rows[1].details,{});assert.deepEqual(rows[1].files,{});
 assert.throws(()=>draftRows({error:'db unavailable'}));
});
