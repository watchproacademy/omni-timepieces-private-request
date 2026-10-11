import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {database} from './db';
import {accessFor,type TrackingAccess} from './tracking-auth';
import {fingerprint} from './repository';
import {requestStages,requestStageLabels,migrateRequestStage,reviewStates} from '../request-workflow';
export const portalEnabled=()=>process.env.REQUEST_PORTAL_ENABLED==='true';
export async function portalAccess(request:Request,id:string):Promise<TrackingAccess> {
 const access=await accessFor(request);
 if(!access || (access.role!=='owner' && access.inquiry_id!==id))throw new Error('ACCESS_DENIED');
 const rows=await database().query("SELECT id FROM inquiries WHERE id=$1 AND COALESCE(retention_until,created_at+interval '1 year')>now()",[id]);
 if(!rows.length)throw new Error('REQUEST_UNAVAILABLE');
 return access;
}
export async function portalLimit(request:Request,limit=120) {
 const key='portal:'+fingerprint(request.headers.get('cookie')||'anonymous');
 const rows=await database().query(`INSERT INTO abuse_windows(key,count,expires_at) VALUES($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN abuse_windows.expires_at<now() THEN 1 ELSE abuse_windows.count+1 END,expires_at=CASE WHEN abuse_windows.expires_at<now() THEN now()+interval '1 hour' ELSE abuse_windows.expires_at END RETURNING count`,[key]);
 if(rows[0].count>limit)throw new Error('RATE_LIMITED');
}
export function checkOrigin(request:Request) {
 const url=new URL(request.url);const host=request.headers.get('host')||url.host;
 if(request.headers.get('origin')!==`${process.env.VERCEL?'https:':url.protocol}//${host}`||request.headers.get('sec-fetch-site')==='cross-site')throw new Error('ACCESS_DENIED');
}
export async function limitedBody(request:Request,max=16000) {
 const reader=request.body?.getReader();if(!reader)throw new Error('INVALID_INPUT');
 let size=0;const parts:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('TOO_LARGE');}parts.push(value);}
 return Buffer.concat(parts);
}
export const portalReply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer'}});
export function portalError(error:unknown) {
 const code=error instanceof Error?error.message:'';
 const messages:Record<string,string>={SCAN_UNAVAILABLE:'Security scanning is temporarily unavailable. Your file was not accepted. Please try again later.',FILE_BLOCKED:'This file did not pass the security scan. Please provide a safe replacement.',SCAN_REQUIRED:'Existing documents must pass a security scan before review or shipping. Open each document to scan it, then refresh.',ACCESS_DENIED:'Please sign in to your private dashboard.',REQUEST_UNAVAILABLE:'This request is unavailable.',STALE_UPDATE:'This request changed. Refresh before saving.',REVIEW_APPROVAL_REQUIRED:'The KYC team must approve the transaction before shipping.',TRACKING_REQUIRED:'Enter a carrier and tracking number.',DOCUMENTS_REQUIRED:'Upload each requested document first.',SUBMITTED_REVIEW_REQUIRED:'The customer must submit their review before approval.',PAYMENT_REQUIRED:'Record payment before approving the review.',UPLOAD_PENDING:'Please wait for pending uploads to finish before submitting or approving.',FILE_LIMIT:'This request has reached its 20-file limit. Contact the private desk.',REVIEW_NOT_OPEN:'Document submission is not currently open.',RATE_LIMITED:'Please wait before trying again.',TOO_LARGE:'This file or message is too large.',INVALID_INPUT:'Check the form fields and try again.'};
 return portalReply({message:messages[code]||'The change could not be saved. Please retry.'},code==='SCAN_UNAVAILABLE'?503:code==='ACCESS_DENIED'?401:code==='RATE_LIMITED'?429:code==='TOO_LARGE'?413:400);
}
export async function portalView(id:string,access:TrackingAccess) {
 const sql=database();
 const [inquiries,watches,reviews,notes,files,events]=await Promise.all([
 sql.query('SELECT payload,created_at,public_reference FROM inquiries WHERE id=$1',[id]),
 sql.query('SELECT * FROM watch_progress WHERE inquiry_id=$1',[id]),
 sql.query('SELECT * FROM request_reviews WHERE inquiry_id=$1',[id]),
 sql.query(`SELECT id,author,visibility,body,created_at FROM request_notes WHERE inquiry_id=$1 ${access.role==='owner'?'':"AND visibility='customer'"} ORDER BY created_at LIMIT 200`,[id]),
 sql.query("SELECT id,kind,mime,size,created_at FROM request_files WHERE inquiry_id=$1 AND state='ready' AND expires_at>now() ORDER BY created_at",[id]),
 sql.query("SELECT action,detail,created_at FROM request_events WHERE inquiry_id=$1 AND action IN ('stage','review') ORDER BY created_at DESC LIMIT 100",[id])]);
 const payload=inquiries[0].payload;
 return {id,reference:inquiries[0].public_reference,createdAt:inquiries[0].created_at,customer:access.role==='owner'?{name:payload.contact.fullName,email:payload.contact.email}:undefined,
 watches:payload.watches.map((watch:{id:string;brand:string;model:string})=>{const row=watches.find(w=>w.watch_id===watch.id);return {id:watch.id,title:`${watch.brand} ${watch.model}`,stage:migrateRequestStage(row?.stage||'received'),version:row?.version||0,carrier:row?.carrier||'',trackingNumber:row?.tracking_number||'',trackingUrl:row?.tracking_url||'',...(access.role==='owner'?{orderId:row?.order_id||'',lineId:row?.line_id||'',shopify:row?.snapshot||null}:{})};}),
 review:reviews[0]||{state:'not_requested',version:0,requirements:['identity'],form:{}},notes,files,events};
}
const common={requestId:z.string().min(1).max(100)};
const safeUrl=z.string().max(2000).refine(v=>!v||(()=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}})());
export const portalMutation=z.discriminatedUnion('action',[
 z.object({...common,action:z.literal('connect'),watchId:z.string().max(100),version:z.number().int().nonnegative(),orderId:z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/),lineId:z.string().regex(/^gid:\/\/shopify\/LineItem\/\d+$/)}),
 z.object({...common,action:z.literal('stage'),watchId:z.string().max(100),stage:z.enum([...requestStages,'waiting','cancelled']),version:z.number().int().nonnegative(),carrier:z.string().trim().max(100),trackingNumber:z.string().trim().max(150),trackingUrl:safeUrl}),
 z.object({...common,action:z.literal('note'),body:z.string().trim().min(1).max(3000),visibility:z.enum(['customer','internal']),key:z.string().uuid()}),
 z.object({...common,action:z.literal('review'),state:z.enum(reviewStates),version:z.number().int().nonnegative(),requirements:z.array(z.enum(['identity','address','business'])).min(1).max(3).refine(items=>items.includes('identity')),reviewed:z.boolean().optional(),form:z.object({legalName:z.string().trim().max(150),address:z.string().trim().max(500),businessName:z.string().trim().max(200),relationship:z.enum(['self','business']),consent:z.boolean()}).optional()}),
]);
export async function portalMutate(request:Request,input:z.infer<typeof portalMutation>,access:TrackingAccess) {
 const sql=database(),event=randomUUID(),actor=access.role+':'+fingerprint(request.headers.get('cookie')||'');
 if(input.action==='connect'){
 if(access.role!=='owner')throw new Error('ACCESS_DENIED');
 const {verifyOrderItem}=await import('./shopify');
 const inquiries=await sql.query('SELECT payload FROM inquiries WHERE id=$1',[input.requestId]);
 if(!inquiries[0].payload.watches.some((w:{id:string})=>w.id===input.watchId))throw new Error('INVALID_INPUT');
 const snapshot=await verifyOrderItem(input.orderId,input.lineId,inquiries[0].payload.contact.email);
 await sql.query('SELECT portal_connect($1,$2,$3,$4,$5::jsonb,$6,$7,$8)',[input.requestId,input.watchId,input.orderId,input.lineId,JSON.stringify(snapshot),input.version,event,actor]);
 }else if(input.action==='stage'){
 if(access.role!=='owner')throw new Error('ACCESS_DENIED');
 const label=requestStageLabels[input.stage as keyof typeof requestStageLabels]||input.stage;
 await sql.query('SELECT portal_stage($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[input.requestId,input.watchId,input.stage,input.version,input.carrier,input.trackingNumber,input.trackingUrl,event,actor,`Your watch request is now: ${label}. Open your dashboard for details.`]);
 }else if(input.action==='review'){
 if(input.state==='approved' && (!input.reviewed || access.role!=='owner'))throw new Error('INVALID_INPUT');
 if(input.form?.relationship==='business'&&!input.form.businessName)throw new Error('INVALID_INPUT');
 if(access.role==='customer' && (input.state!=='submitted'||!input.form?.consent||!input.form.legalName||!input.form.address))throw new Error('INVALID_INPUT');
 await sql.query('SELECT portal_review($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)',[input.requestId,input.state,input.version,JSON.stringify([...new Set(input.requirements)]),JSON.stringify(input.form||{}),event,actor,access.role==='customer']);
 }else{
 if(access.role==='customer' && input.visibility!=='customer')throw new Error('ACCESS_DENIED');
 await sql.query(`WITH added AS (INSERT INTO request_notes(id,inquiry_id,author,visibility,body) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING RETURNING id)
 INSERT INTO delivery_jobs(id,inquiry_id,kind,event) SELECT id||':email',$2,$6,$7::jsonb FROM added WHERE $4='customer'`,[input.key,input.requestId,access.role,input.visibility,input.body,access.role==='owner'?'update':'operator_update',JSON.stringify({title:'New private request message',message:'There is a new message in your private dashboard.'})]);
 }
}
