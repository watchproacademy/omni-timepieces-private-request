import {createHash,randomUUID} from 'node:crypto';
import {put} from '@vercel/blob';
import {z} from 'zod';
import {database} from './db';
import {fingerprint} from './repository';
import {scanDocument} from './malware-scan';
import {documentType} from './portal-files';
import {limitedBody} from './portal';
import type {TrackingAccess} from './tracking-auth';
const kinds=['payment_proof','shipment_proof','possession_photo'] as const;
export function assertTransactionFileRole(kind:string,access:TrackingAccess,id:string){
 if(!kinds.includes(kind as typeof kinds[number])||access.role==='customer'&&access.inquiry_id!==id||(kind==='shipment_proof')!==(access.role==='owner'))throw new Error('ACCESS_DENIED');
}
export async function uploadTransactionFile(request:Request,id:string,kind:string,access:TrackingAccess){
 assertTransactionFileRole(kind,access,id);const url=new URL(request.url),offer=z.string().uuid().parse(url.searchParams.get('offer')),file=z.string().uuid().parse(request.headers.get('idempotency-key'));
 const bytes=await limitedBody(request,3*1024*1024);if(!bytes.length)throw new Error('INVALID_INPUT');const type=documentType(bytes);if(kind==='possession_photo'&&type.mime==='application/pdf')throw new Error('INVALID_INPUT');
 const hash=createHash('sha256').update(bytes).digest('hex'),sql=database();
 const prior=await sql.query('SELECT tf.offer_id,tf.kind,tf.content_hash,tf.upload_lease_until,f.inquiry_id,f.state,f.scan_status,f.expires_at FROM transaction_files tf JOIN request_files f ON f.id=tf.file_id WHERE f.id=$1',[file]);
 if(prior[0]){if(prior[0].inquiry_id!==id||prior[0].offer_id!==offer||prior[0].kind!==kind||prior[0].content_hash!==hash)throw new Error('IDEMPOTENCY_CONFLICT');if(prior[0].state==='pending'&&Date.parse(String(prior[0].upload_lease_until||''))>Date.now())throw new Error('UPLOAD_IN_PROGRESS');if(prior[0].state==='deleting')throw new Error('UPLOAD_EXPIRED');if(prior[0].state==='ready'&&Date.parse(String(prior[0].expires_at))>Date.now()){if(prior[0].scan_status==='blocked')throw new Error('FILE_BLOCKED');if(prior[0].scan_status!=='clean')throw new Error('SCAN_REQUIRED');return file;}}
 const flows=await sql.query('SELECT payment_state,kyc_state,fulfilment_state FROM transaction_workflows WHERE offer_id=$1 AND inquiry_id=$2',[offer,id]);const flow=flows[0];if(!flow)throw new Error('INVOICE_REQUIRED');
 if(kind==='shipment_proof'&&(flow.payment_state!=='cleared'||flow.kyc_state!=='approved'||flow.fulfilment_state!=='pending'))throw new Error('SHIPPING_NOT_READY');
 if(kind==='payment_proof'&&(flow.payment_state==='cleared'||flow.fulfilment_state!=='pending'))throw new Error('PAYMENT_NOT_OPEN');
 if(kind==='possession_photo'&&!['delivered','closed'].includes(flow.fulfilment_state))throw new Error('DELIVERY_REQUIRED');
 await scanDocument(bytes,type.mime);const path=`requests/${id}/${file}.${type.extension}`;
 const token=randomUUID();
 const reserved=await sql.query('SELECT transaction_reserve_file($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS token',[id,offer,file,kind,path,type.mime,bytes.length,hash,access.role==='owner',token]);
 if(reserved[0]?.token==='ready')return file;
 // A failed/uncertain storage operation retains its finite lease. Retry the same identifier after expiry;
 // do not release early and race a provider operation whose outcome is unknown.
 await put(path,bytes,{access:'private',addRandomSuffix:false,contentType:type.mime,abortSignal:AbortSignal.timeout(60000)});
 await sql.query('SELECT transaction_complete_file($1,$2,$3,$4)',[id,file,token,access.role+':'+fingerprint(request.headers.get('cookie')||'')]);
 return file;
}
