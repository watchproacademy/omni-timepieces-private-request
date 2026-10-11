import {del} from '@vercel/blob';
import {database} from './db';
export function documentType(bytes:Buffer) {
 if(bytes.subarray(0,5).toString()==='%PDF-')return {mime:'application/pdf',extension:'pdf'};
 if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime:'image/png',extension:'png'};
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {mime:'image/jpeg',extension:'jpg'};
 throw new Error('INVALID_INPUT');
}
/** Delete private objects before their database rows can disappear with an inquiry. */
export async function purgePortalFiles() {
 const sql=database();
 await sql.query("UPDATE request_files SET state='deleting' WHERE expires_at<=now() OR (state='pending' AND created_at<now()-interval '1 hour')");
 const files=await sql.query("SELECT id,pathname FROM request_files WHERE state='deleting' LIMIT 100");
 for(const file of files){await del(file.pathname);await sql.query("DELETE FROM request_files WHERE id=$1 AND state='deleting'",[file.id]);}
 // Stop parent cleanup until all expired objects were removed, preserving retry paths.
 const remaining=await sql.query("SELECT 1 FROM request_files f JOIN inquiries i ON i.id=f.inquiry_id WHERE COALESCE(i.retention_until,i.created_at+interval '1 year')<=now() LIMIT 1");
 if(remaining.length)throw new Error('Document cleanup is pending.');
}
