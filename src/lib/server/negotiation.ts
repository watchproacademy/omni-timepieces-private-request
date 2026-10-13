import {negotiationInput,type Offer,type OfferEvent} from '../negotiation';
import {database} from './db';
import type {TrackingAccess} from './tracking-auth';
import {fingerprint} from './repository';
export const negotiationEnabled=()=>process.env.NEGOTIATION_ENABLED==='true';
type Sql=Pick<ReturnType<typeof database>,'query'>;
const timestamp=(value:unknown)=>value?new Date(String(value)).toISOString():null;
export async function listNegotiation(id:string,owner:boolean,sql:Sql=database()){
 const [rows,events]=await Promise.all([sql.query('SELECT * FROM negotiation_offers WHERE inquiry_id=$1 ORDER BY created_at DESC,id DESC',[id]),sql.query('SELECT * FROM negotiation_events WHERE inquiry_id=$1 ORDER BY created_at,id',[id])]);
 const offers:Offer[]=rows.map(row=>({id:row.id,documentId:row.document_id,sourceDocumentVersion:row.source_document_version,sourceContentHash:row.source_content_hash,parentId:row.parent_id,revision:row.revision,version:row.version,kind:row.kind,state:row.state,terms:row.terms,sourceSummary:row.source_summary,termsHash:row.terms_hash,expiresAt:timestamp(row.expires_at)!,createdAt:timestamp(row.created_at)!,operatorAssentedAt:timestamp(row.operator_assented_at),customerAssentedAt:timestamp(row.customer_assented_at),decidedAt:timestamp(row.decided_at),actor:owner?row.actor:row.kind==='quote'?'Private desk':'Customer',reason:row.reason}));
 const history:OfferEvent[]=events.map(row=>({offerId:row.offer_id,action:row.action,actor:owner?row.actor:row.action==='publish'||row.action==='superseded'?'Private desk':'Decision recorded',identity:owner?row.identity:'',reason:row.reason,createdAt:timestamp(row.created_at)!,revision:row.revision,termsHash:row.terms_hash}));
 return {offers,history};
}
export async function mutateNegotiation(request:Request,input:ReturnType<typeof negotiationInput.parse>,access:TrackingAccess,sql:Sql=database()){
 if(access.role==='customer'&&access.inquiry_id!==input.requestId||input.action==='publish'&&access.role!=='owner'||input.action==='counter'&&access.role!=='customer')throw new Error('ACCESS_DENIED');
 const identity=access.role==='owner'?process.env.TRACKING_OWNER_EMAIL?.trim().toLowerCase()||'Private desk operator':String((await sql.query("SELECT payload->'contact'->>'email' AS email FROM inquiries WHERE id=$1",[input.requestId]))[0]?.email||'Authenticated customer');
 const {requestId,offerId,version,key,action,...data}=input;
 const result=await sql.query('SELECT negotiation_mutate($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9) AS offer_id',[requestId,offerId,version,key,action,JSON.stringify(data),access.role,access.role+':'+fingerprint(request.headers.get('cookie')||''),identity]);
 return String(result[0].offer_id);
}
