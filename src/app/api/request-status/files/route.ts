import {scanDocument} from '@/lib/server/malware-scan';
import {publishPending} from '@/lib/server/queue';
import {after} from 'next/server';
import {pendingJobIds,fingerprint} from '@/lib/server/repository';
import {processDelivery} from '@/lib/server/worker';
import {randomUUID} from 'node:crypto';
import {put,get} from '@vercel/blob';
import {database} from '@/lib/server/db';
import {documentType} from '@/lib/server/portal-files';
import {portalEnabled,portalAccess,portalLimit,checkOrigin,limitedBody,portalReply,portalError} from '@/lib/server/portal';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!portalEnabled())return portalReply({message:'Document uploads are being prepared.'},503);
 try{
 checkOrigin(request);const url=new URL(request.url),id=url.searchParams.get('id')||'',kind=url.searchParams.get('kind')||'';
 const access=await portalAccess(request,id);await portalLimit(request,120);
 if(!['identity','address','business','invoice'].includes(kind)||(kind==='invoice')!==(access.role==='owner'))throw new Error('ACCESS_DENIED');
 const bytes=await limitedBody(request,3*1024*1024);if(!bytes.length)throw new Error('INVALID_INPUT');
 const type=documentType(bytes),file=randomUUID(),path=`requests/${id}/${file}.${type.extension}`;
 await scanDocument(bytes,type.mime);
 await database().query('SELECT portal_reserve_file($1,$2,$3,$4,$5,$6,$7)',[id,file,kind,path,type.mime,bytes.length,access.role==='owner']);
 await put(path,bytes,{access:'private',addRandomSuffix:false,contentType:type.mime});
 await database().query(`WITH ready AS (UPDATE request_files SET state='ready',scan_status='clean',scanned_at=now() WHERE id=$1 AND state='pending' RETURNING id,inquiry_id)
 INSERT INTO delivery_jobs(id,inquiry_id,kind,event) SELECT id||':email',inquiry_id,$2,$3::jsonb FROM ready`,[file,kind==='invoice'?'update':'operator_update',JSON.stringify({title:kind==='invoice'?'Your invoice is available':'A document was uploaded',message:kind==='invoice'?'An invoice is available in your private dashboard.':'A customer uploaded a document for manual review. Open the private dashboard.'})]);
 after(async()=>{try{await publishPending(id);return;}catch{console.error('portal_queue_pending');}for(const job of await pendingJobIds(id)){try{await processDelivery(job);}catch{console.error('portal_email_pending');}}});
 return portalReply({ok:true,id:file});
 }catch(error){return portalError(error);}
}
export async function GET(request:Request){
 if(!portalEnabled())return portalReply({message:'Unavailable'},503);
 try{
 const url=new URL(request.url),id=url.searchParams.get('id')||'',file=url.searchParams.get('file')||'';
 await portalAccess(request,id);await portalLimit(request,120);
 const rows=await database().query("SELECT pathname,mime,kind,scan_status FROM request_files WHERE id=$1 AND inquiry_id=$2 AND state='ready' AND expires_at>now()",[file,id]);
 if(!rows[0])return portalReply({message:'File unavailable.'},404);
 if(rows[0].scan_status==='blocked')throw new Error('FILE_BLOCKED');
 await database().query('INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES($1,$2,$3,$4,$5::jsonb)',[randomUUID(),id,fingerprint(request.headers.get('cookie')||''),'document_download',JSON.stringify({fileId:file})]);
 const result=await get(rows[0].pathname,{access:'private',useCache:false});
 if(!result||result.statusCode!==200)return portalReply({message:'File unavailable.'},404);
 let content:ReadableStream|Buffer=result.stream;
 if(rows[0].scan_status!=='clean'){
  const bytes=await limitedBody(new Request('https://internal.invalid',{method:'POST',body:result.stream,duplex:'half'} as RequestInit),3*1024*1024);
  try{await scanDocument(bytes,rows[0].mime);}catch(error){if(error instanceof Error&&error.message==='FILE_BLOCKED')await database().query("UPDATE request_files SET scan_status='blocked',scanned_at=now() WHERE id=$1",[file]);throw error;}
  await database().query("UPDATE request_files SET scan_status='clean',scanned_at=now() WHERE id=$1",[file]);content=bytes;
 }
 return new Response(content as BodyInit,{headers:{'Content-Type':rows[0].mime,'Content-Disposition':`attachment; filename="omni-${rows[0].kind}.${rows[0].mime==='application/pdf'?'pdf':rows[0].mime==='image/png'?'png':'jpg'}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer'}});
 }catch(error){return portalError(error);}
}
