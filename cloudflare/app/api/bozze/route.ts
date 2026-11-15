import {env} from 'cloudflare:workers';
import {isAdmin} from '../../admin';
export async function GET(){if(!await isAdmin())return Response.json({error:'Accesso riservato'}, {status:403});const r=await env.DB.prepare('SELECT * FROM drafts ORDER BY created DESC').all();return Response.json(r.results,{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origine non valida'},{status:403});
 if(!/^(multipart\/form-data|application\/x-www-form-urlencoded)/i.test(req.headers.get('content-type')||''))return Response.json({error:'Formato richiesta non valido'},{status:400});
 try{const form=await req.formData();const details=JSON.parse(String(form.get('details')));const png=form.get('png');
 if(!details.name||!details.team||!/^\S+@\S+\.\S+$/.test(details.email)||!(png instanceof File)||png.type!=='image/png'||png.size>10000000)return Response.json({error:'Dati o PNG non validi'},{status:400});
 const signature=new Uint8Array(await png.slice(0,8).arrayBuffer());if(signature.join(',')!=='137,80,78,71,13,10,26,10')return Response.json({error:'PNG non valido'},{status:400});
 const id=crypto.randomUUID();const files:Record<string,string>={};
 try{for(const name of ['png','model','logoFile','frontSponsorFile','backSponsorFile']){const file=form.get(name);if(file instanceof File){if(name==='model'){
 if(file.size<20||file.size>25000000||file.type!=='model/gltf-binary')throw new Error('Modello non valido');
 const header=new DataView(await file.slice(0,12).arrayBuffer());
 if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||header.getUint32(8,true)!==file.size)throw new Error('GLB non valido');
 }else if(file.size>10000000||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Immagine non valida');const key=`drafts/${id}/${name}`;await env.BUCKET.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});files[name]=key}}
 await env.DB.prepare('INSERT INTO drafts (id,created,details,files,status,notes) VALUES (?,?,?,?,?,?)').bind(id,new Date().toISOString(),JSON.stringify(details),JSON.stringify(files),'Nuova','').run();
 }catch(e){await Promise.all(Object.values(files).map(k=>env.BUCKET.delete(k)));throw e}
 return Response.json({id},{status:201});
 }catch(error){console.error('bozza-save-failed',error instanceof Error?error.message:'unknown');return Response.json({error:'Impossibile salvare la bozza. Riprova.'},{status:500})}}
export async function PATCH(req:Request){if(!await isAdmin())return Response.json({error:'Accesso riservato'},{status:403});if(req.headers.get('origin')!==new URL(req.url).origin)return new Response(null,{status:403});const d=await req.json();if(!['Nuova','In lavorazione','Confermata'].includes(d.status))return new Response(null,{status:400});await env.DB.prepare('UPDATE drafts SET status=?,notes=? WHERE id=?').bind(d.status,String(d.notes).slice(0,10000),d.id).run();return Response.json({ok:true})}
