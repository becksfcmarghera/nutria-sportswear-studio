import test from 'node:test';
import assert from 'node:assert/strict';
import {notifyDraft} from '../server/notifications.mjs';
const input={endpoint:'https://formsubmit.io/f/test-form',origin:'https://nutria.example',id:'test-draft',details:{name:'Cliente test',email:'cliente@example.test',team:'Squadra test',qty:20,notes:'Solo prova locale'}};
test('Notifications forward a summary and an authenticated area link, without attachments',async()=>{
 const result=await notifyDraft(input,async(url,options)=>{
  assert.equal(url,input.endpoint);assert.equal(options.method,'POST');
  assert.equal(options.body.get('Email'),input.details.email);
  assert.match(options.body.get('Long text'),/https:\/\/nutria.example\/bozze/);
  assert.match(options.body.get('Long text'),/test-draft/);
  assert.equal([...options.body.values()].some(v=>typeof v!=='string'),false);
  assert.doesNotMatch(options.body.get('Long text'),/api\/files|SESSION_SECRET|ADMIN_PASSWORD/);
  return new Response('',{status:202});
 });
 assert.equal(result.status,'forwarded');
});
test('Notification errors are returned without rejecting the saved draft',async()=>{
 assert.equal((await notifyDraft(input,async()=>new Response('',{status:503}))).status,'failed');
 assert.equal((await notifyDraft(input,async()=>{throw new Error('Network unavailable')})).status,'failed');
});
test('Unconfigured and unexpected destinations never send data',async()=>{
 const noSend=()=>{throw new Error('Must not send')};
 assert.equal((await notifyDraft({...input,endpoint:''},noSend)).status,'disabled');
 assert.equal((await notifyDraft({...input,endpoint:'https://other.example/f/test'},noSend)).status,'failed');
});
