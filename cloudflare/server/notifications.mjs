// Notifications never contain public file URLs or authentication credentials.
export async function notifyDraft({endpoint,origin,id,details},send=fetch){
  if(!endpoint)return {status:'disabled',provider:'FormSubmit.io'};
  const url=new URL(endpoint);
  if(url.origin!=='https://formsubmit.io'||!/^\/f\/[a-zA-Z0-9-]+$/.test(url.pathname))return {status:'failed',provider:'FormSubmit.io'};
  const data=new FormData();
  data.set('Short text',String(details.name).slice(0,200));
  data.set('Email',String(details.email).slice(0,254));
  data.set('Long text',[
    'NUOVA RICHIESTA · NUTRIA SPORTSWEAR',
    'Riferimento: '+id,
    'Squadra: '+String(details.team).slice(0,200),
    'Referente: '+String(details.name).slice(0,200),
    'Email: '+String(details.email).slice(0,254),
    'Quantità: '+String(details.qty).slice(0,20),
    'Note: '+String(details.notes||'').slice(0,10000),
    'Apri l’area privata per il PNG, il modello 3D e i dettagli:',
    new URL('/bozze',origin).href
  ].join('\n'));
  data.set('_formsubmit_id','');
  try{
    const response=await send(url.href,{method:'POST',body:data,signal:AbortSignal.timeout(6000)});
    // An HTTP success means accepted by the form service, not delivered to inbox.
    return {status:response.ok?'forwarded':'failed',provider:'FormSubmit.io',updated:new Date().toISOString()};
  }catch{return {status:'failed',provider:'FormSubmit.io',updated:new Date().toISOString()};}
}
