import {createHash} from 'node:crypto';
import {z} from 'zod';
import {put} from '@vercel/blob';
import {after} from 'next/server';
import {commercialDraftSchema,commercialSummarySchema} from '@/lib/commercial-document';
import {commercialEnabled,listCommercialDocuments} from '@/lib/server/commercial-documents';
import {extractCommercialPdf} from '@/lib/server/commercial-extraction';
import {documentType} from '@/lib/server/portal-files';
import {database} from '@/lib/server/db';
import {scanDocument} from '@/lib/server/malware-scan';
import {fingerprint,pendingJobIds} from '@/lib/server/repository';
import {publishPending} from '@/lib/server/queue';
import {processDelivery} from '@/lib/server/worker';
import {portalEnabled,portalAccess,portalLimit,checkOrigin,limitedBody,portalReply,portalError} from '@/lib/server/portal';
export const runtime='nodejs';
export const maxDuration=30;
const inputSchema=z.object({requestId:z.string().min(1).max(100),documentId:z.string().uuid(),version:z.number().int().nonnegative(),key:z.string().uuid(),action:z.enum(['save','approve','discard']),data:z.unknown().optional(),reviewed:z.boolean().optional()}).strict();
export async function GET(request:Request){if(!portalEnabled()||!commercialEnabled())return portalReply({message:'Commercial document review is unavailable.'},503);try{const id=new URL(request.url).searchParams.get('id')||'';const access=await portalAccess(request,id);await portalLimit(request,120);return portalReply({documents:await listCommercialDocuments(id,access.role==='owner')});}catch(error){return portalError(error);}}
export async function POST(request:Request){
 if(!portalEnabled()||!commercialEnabled())return portalReply({message:'Commercial document review is unavailable.'},503);
 try{
  checkOrigin(request);const url=new URL(request.url);
  if(request.headers.get('content-type')==='application/octet-stream'){
   const id=url.searchParams.get('id')||'',kind=z.enum(['quote','invoice']).parse(url.searchParams.get('kind')),file=z.string().uuid().parse(request.headers.get('idempotency-key'));
   const access=await portalAccess(request,id);if(access.role!=='owner')throw new Error('ACCESS_DENIED');await portalLimit(request,60);
   const bytes=await limitedBody(request,3*1024*1024),type=documentType(bytes),hash=createHash('sha256').update(bytes).digest('hex'),path=`requests/${id}/${file}.${type.extension}`,sql=database();
   const prior=await sql.query('SELECT state,content_hash,inquiry_id,kind FROM commercial_documents WHERE id=$1',[file]);
   if(prior[0]&&(prior[0].content_hash!==hash||prior[0].inquiry_id!==id||prior[0].kind!==kind))throw new Error('IDEMPOTENCY_CONFLICT');
   if(prior[0]){const ready=await sql.query("SELECT id FROM request_files WHERE id=$1 AND state='ready'",[file]);if(ready[0])return portalReply({ok:true,id:file,documents:await listCommercialDocuments(id,true)});}
   await scanDocument(bytes,type.mime);
   await sql.query('SELECT commercial_reserve($1,$2,$3,$4,$5,$6,$7)',[id,file,kind,path,type.mime,bytes.length,hash]);
   await put(path,bytes,{access:'private',addRandomSuffix:false,contentType:type.mime});
   const extraction=type.mime==='application/pdf'?await extractCommercialPdf(bytes):{status:'manual',fields:{},evidence:[],warnings:['Image documents require manual entry. OCR is not enabled.'],pageCount:1};
   await sql.transaction([sql.query("UPDATE request_files SET state='ready',scan_status='clean',scanned_at=now() WHERE id=$1 AND state='pending'",[file]),sql.query("UPDATE commercial_documents SET extraction=$2::jsonb WHERE id=$1 AND state='draft' AND version=0",[file,JSON.stringify(extraction)])]);
   return portalReply({ok:true,id:file,documents:await listCommercialDocuments(id,true)});
  }
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('INVALID_INPUT');
  const input=inputSchema.parse(JSON.parse((await limitedBody(request,30000)).toString())),access=await portalAccess(request,input.requestId);if(access.role!=='owner')throw new Error('ACCESS_DENIED');await portalLimit(request,120);
  let data:unknown={};if(input.action==='save')data=commercialDraftSchema.parse(input.data);if(input.action==='approve'){if(!input.reviewed)throw new Error('COMMERCIAL_REVIEW_REQUIRED');data=commercialSummarySchema.parse(input.data);const doc=await database().query('SELECT kind FROM commercial_documents WHERE id=$1 AND inquiry_id=$2',[input.documentId,input.requestId]);if(doc[0]?.kind==='quote'&&(data as {paymentDueDate:string}).paymentDueDate)throw new Error('INVALID_INPUT');}
  await database().query('SELECT commercial_mutate($1,$2,$3,$4,$5,$6::jsonb,$7)',[input.requestId,input.documentId,input.version,input.key,input.action,JSON.stringify(data),fingerprint(request.headers.get('cookie')||'')]);
  if(input.action==='approve')after(async()=>{try{await publishPending(input.requestId);return;}catch{console.error('commercial_queue_pending');}for(const job of await pendingJobIds(input.requestId)){try{await processDelivery(job);}catch{console.error('commercial_email_pending');}}});
  return portalReply({ok:true,documents:await listCommercialDocuments(input.requestId,true)});
 }catch(error){if(error instanceof z.ZodError)return portalReply({message:error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`).join(' ')},400);return portalError(error);}
}
