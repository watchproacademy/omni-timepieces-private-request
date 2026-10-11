import {allowsAdmin} from './admin-boundary';
import { createHash, randomBytes } from 'node:crypto';
import { database } from './db';
export const trackingCookie='omni_request_access';
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export type TrackingAccess={role:'owner'|'customer';inquiry_id:string|null};
export async function issueAccess(role:TrackingAccess['role'],id:string|null,session=false) {
 await database().query('DELETE FROM tracking_access WHERE expires_at<now()');
 const token=randomBytes(32).toString('base64url');
 await database().query("INSERT INTO tracking_access(token_hash,role,inquiry_id,expires_at,session,owner_email) VALUES($1,$2,$3,now()+($4 * interval '1 minute'),$5,$6)",[tokenHash(token),role,id,session?60:15,session,role==='owner'?process.env.TRACKING_OWNER_EMAIL?.trim().toLowerCase():null]);return token;
}
export async function consumeAccess(token:string,request:Request) {
 if(!/^[\w-]{43}$/.test(token))return null;
 // Atomic deletion prevents replay even when two devices open the same link.
 const rows=await database().query("DELETE FROM tracking_access WHERE token_hash=$1 AND NOT session AND expires_at>now() AND (role='customer' OR (owner_email=$2 AND $3::boolean)) RETURNING role,inquiry_id",[tokenHash(token),process.env.TRACKING_OWNER_EMAIL?.trim().toLowerCase(),allowsAdmin(request)]);
 return rows[0] as TrackingAccess|undefined;
}
export function sessionToken(request:Request) {
 return request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(trackingCookie+'='))?.slice(trackingCookie.length+1);
}
export async function pendingAccessFor(request:Request):Promise<(TrackingAccess & {mfa_verified:boolean})|null> {
 const token=sessionToken(request);
 if(!token||!/^[\w-]{43}$/.test(token))return null;
 const rows=await database().query("SELECT role,inquiry_id,mfa_verified FROM tracking_access WHERE token_hash=$1 AND session AND expires_at>now() AND (role='customer' OR (owner_email=$2 AND $3::boolean))",[tokenHash(token),process.env.TRACKING_OWNER_EMAIL?.trim().toLowerCase(),allowsAdmin(request)]);return rows[0] as (TrackingAccess & {mfa_verified:boolean})||null;
}

export async function revokeAccess(request:Request) {
 const token=sessionToken(request);
 if(token)await database().query('DELETE FROM tracking_access WHERE token_hash=$1',[tokenHash(token)]);
}

export async function accessFor(request:Request):Promise<TrackingAccess|null> {
 const access=await pendingAccessFor(request);
 return access && (access.role==='customer'||access.mfa_verified) ? access : null;
}
