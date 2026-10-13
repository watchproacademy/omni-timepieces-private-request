import {commercialStatus,type CommercialDocument} from '../commercial-document';
import {database} from './db';
export const commercialEnabled=()=>process.env.COMMERCIAL_DOCUMENTS_ENABLED==='true';
export async function listCommercialDocuments(id:string,owner:boolean,sql:Pick<ReturnType<typeof database>,'query'>=database()):Promise<CommercialDocument[]>{
 const rows=await sql.query(`SELECT d.id,d.file_id,d.kind,d.state,d.version,d.created_at,d.published_at,d.issued_at,d.expires_at,d.summary${owner?',d.extraction,d.draft':''} FROM commercial_documents d JOIN request_files f ON f.id=d.file_id WHERE d.inquiry_id=$1 AND f.state='ready' AND f.expires_at>now() ${owner?'':"AND d.state='published'"} ORDER BY d.created_at DESC`,[id]);
 return rows.map(row=>{const doc:CommercialDocument={id:row.id,fileId:row.file_id,kind:row.kind,state:row.state,version:row.version,createdAt:String(row.created_at),publishedAt:row.published_at?String(row.published_at):undefined,issuedAt:row.issued_at?new Date(row.issued_at).toISOString():undefined,expiresAt:row.expires_at?new Date(row.expires_at).toISOString():null,summary:row.summary,...(owner?{extraction:row.extraction,draft:row.draft}:{}),status:'Draft'};return {...doc,status:commercialStatus(doc)};});
}
/** JSON projection remains compatible before migration and protects drafts even with the feature flag disabled. */
export function visibleCommercialFileSql(owner:boolean){return owner?'':" AND COALESCE((to_jsonb(request_files)->>'customer_visible')::boolean,true)";}
