import {z} from 'zod';
import {database} from './db';
import {fingerprint} from './repository';
import type {TrackingAccess} from './tracking-auth';
import {commercialCurrencies,type CommercialSummary} from '../commercial-document';
import type {PaymentState,KycState,FulfilmentState} from '../post-agreement';
export const postAgreementEnabled=()=>process.env.POST_AGREEMENT_ENABLED==='true';
const common={requestId:z.string().min(1).max(100),offerId:z.string().uuid(),version:z.number().int().nonnegative(),key:z.string().uuid(),confirmed:z.literal(true)};
const secureUrl=z.string().max(2000).refine(v=>!v||(()=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}})());
export const transactionInput=z.discriminatedUnion('action',[
 z.object({...common,action:z.literal('payment_submit')}).strict(),
 z.object({...common,action:z.literal('funds_clear'),amount:z.string().trim().regex(/^\d{1,12}(?:\.\d{1,2})?$/),currency:z.enum(commercialCurrencies),note:z.string().trim().min(1).max(500)}).strict(),
 z.object({...common,action:z.literal('payment_changes'),message:z.string().trim().min(1).max(3000)}).strict(),
 z.object({...common,action:z.literal('kyc_approve')}).strict(),
 z.object({...common,action:z.literal('kyc_more_information'),message:z.string().trim().min(1).max(3000)}).strict(),
 z.object({...common,action:z.literal('ship'),carrier:z.string().trim().min(1).max(100),trackingNumber:z.string().trim().min(1).max(150),trackingUrl:secureUrl}).strict(),
 z.object({...common,action:z.literal('deliver')}).strict(),
 z.object({...common,action:z.literal('close')}).strict(),
]);
export const invoiceContextSchema=z.object({offerId:z.string().uuid(),paymentMethod:z.string().trim().min(1).max(100),paymentInstructions:z.string().trim().min(1).max(3000)}).strict();
export type InvoiceContext=z.infer<typeof invoiceContextSchema>;
export type TransactionRecord={offerId:string;invoiceId:string;invoiceSummary:CommercialSummary;paymentMethod:string;paymentInstructions:string;paymentState:PaymentState;paymentSubmittedAt:string|null;fundsClearedAt:string|null;clearanceNote?:string;kycState:KycState;fulfilmentState:FulfilmentState;version:number;carrier:string;trackingNumber:string;trackingUrl:string;shippedAt:string|null;deliveredAt:string|null;closedAt:string|null;files:{id:string;kind:'payment_proof'|'shipment_proof'|'possession_photo';createdAt:string}[]};
type Sql=Pick<ReturnType<typeof database>,'query'>;
export async function listTransactions(id:string,owner:boolean,sql:Sql=database()):Promise<TransactionRecord[]>{
 const rows=await sql.query(`SELECT offer_id,invoice_id,invoice_summary,payment_method,payment_instructions,payment_state,payment_submitted_at,funds_cleared_at,kyc_state,fulfilment_state,version,carrier,tracking_number,tracking_url,shipped_at,delivered_at,closed_at${owner?',clearance_note':''} FROM transaction_workflows WHERE inquiry_id=$1 ORDER BY created_at,offer_id`,[id]);
 const files=await sql.query(`SELECT tf.offer_id,f.id,tf.kind,f.created_at FROM transaction_files tf JOIN request_files f ON f.id=tf.file_id WHERE f.inquiry_id=$1 AND f.state='ready' AND f.scan_status='clean' AND f.expires_at>now() ${owner?'':'AND f.customer_visible=true'} ORDER BY f.created_at,f.id`,[id]);
 const time=(v:unknown)=>v?new Date(String(v)).toISOString():null;
 return rows.map(r=>({offerId:r.offer_id,invoiceId:r.invoice_id,invoiceSummary:r.invoice_summary,paymentMethod:r.payment_method,paymentInstructions:r.payment_instructions,paymentState:r.payment_state,paymentSubmittedAt:time(r.payment_submitted_at),fundsClearedAt:time(r.funds_cleared_at),...(owner?{clearanceNote:r.clearance_note}:{}),kycState:r.kyc_state,fulfilmentState:r.fulfilment_state,version:r.version,carrier:r.carrier,trackingNumber:r.tracking_number,trackingUrl:r.tracking_url,shippedAt:time(r.shipped_at),deliveredAt:time(r.delivered_at),closedAt:time(r.closed_at),files:files.filter(f=>f.offer_id===r.offer_id).map(f=>({id:f.id,kind:f.kind,createdAt:time(f.created_at)!}))}));
}
export function assertTransactionRole(input:z.infer<typeof transactionInput>,access:TrackingAccess){
 if(access.role==='customer'&&access.inquiry_id!==input.requestId||input.action==='payment_submit'&&access.role!=='customer'||input.action!=='payment_submit'&&access.role!=='owner')throw new Error('ACCESS_DENIED');
}
export async function mutateTransaction(request:Request,input:z.infer<typeof transactionInput>,access:TrackingAccess,sql:Sql=database()){
 assertTransactionRole(input,access);const {requestId,offerId,version,key,action,...data}=input;
 const rows=await sql.query('SELECT transaction_mutate($1,$2,$3,$4,$5,$6::jsonb,$7,$8) AS version',[requestId,offerId,version,key,action,JSON.stringify(data),access.role,access.role+':'+fingerprint(request.headers.get('cookie')||'')]);return rows[0].version as number;
}
