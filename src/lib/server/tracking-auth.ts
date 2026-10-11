import { createHash, randomBytes } from 'node:crypto';
import { database } from './db';
export const trackingCookie='omni_request_access';
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export type TrackingAccess={role:'owner'|'customer';inquiry_id:string|null};
export async function issueAccess(role:TrackingAccess['role'],id:string|null,session=false) {
 await database().query('DELETE FROM tracking_access WHERE expires_at<now()');
 const token=randomBytes(32).toString('base64url');
 await database().query("INSERT INTO tracking_access(token_hash,role,inquiry_id,expires_at,session) VALUES($1,$2,$3,now()+($4 * interval '1 minute'),$5)",[tokenHash(token),role,id,session?60:15,session]);return token;
}
export async function consumeAccess(token:string) {
 if(!/^[\w-]{43}$/.test(token))return null;
 // Atomic deletion prevents replay even when two devices open the same link.
 const rows=await database().query('DELETE FROM tracking_access WHERE token_hash=$1 AND NOT session AND expires_at>now() RETURNING role,inquiry_id',[tokenHash(token)]);
 return rows[0] as TrackingAccess|undefined;
}
export async function accessFor(request:Request):Promise<TrackingAccess|null> {
 const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(trackingCookie+'='))?.slice(trackingCookie.length+1);
 if(!token||!/^[\w-]{43}$/.test(token))return null;
 const rows=await database().query('SELECT role,inquiry_id FROM tracking_access WHERE token_hash=$1 AND session AND expires_at>now()',[tokenHash(token)]);return rows[0] as TrackingAccess||null;
}

export async function revokeAccess(request:Request) {
 const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(trackingCookie+'='))?.slice(trackingCookie.length+1);
 if(token)await database().query('DELETE FROM tracking_access WHERE token_hash=$1',[tokenHash(token)]);
}
