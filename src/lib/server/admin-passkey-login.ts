import {randomBytes} from 'node:crypto';
import {generateAuthenticationOptions,verifyAuthenticationResponse,type AuthenticationResponseJSON} from '@simplewebauthn/server';
import {allowsAdmin,internalPortalOrigin} from './admin-boundary';
import {database} from './db';
import {fingerprint} from './repository';
import {checkOrigin,limitedBody,portalReply} from './portal';
import {sessionToken,tokenHash,trackingCookie} from './tracking-auth';

export const adminLoginCookie='omni_admin_login';
const cookiePath='/api/request-status/admin/login';
const denied='Passkey sign-in could not be completed. Try again or use your email link and passkey.';
// Valid P-256 public key used only to equalize the verification path for unknown IDs.
// It can never authorize a session: a matching stored credential is required below.
const unknownPublicKey=Buffer.from('a50102032620012158206b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c2962258204fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5','hex');
type LoginDatabase={query:(text:string,params?:unknown[])=>Promise<Record<string,unknown>[]>};
type Dependencies={database:()=>LoginDatabase;generate:typeof generateAuthenticationOptions;verify:typeof verifyAuthenticationResponse};
const defaults:Dependencies={database,generate:generateAuthenticationOptions,verify:verifyAuthenticationResponse};
function browserToken(request:Request){const value=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(adminLoginCookie+'='))?.slice(adminLoginCookie.length+1);return value&&/^[\w-]{43}$/.test(value)?value:null;}
const challengeCookie=(value:string,maxAge:number)=>`${adminLoginCookie}=${value}; Path=${cookiePath}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`;
async function limit(request:Request,sql:LoginDatabase){
 // Vercel replaces this header at its trusted edge. Never use caller cookies as a rate identity.
 const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown':'local';
 for(const [key,maximum] of [[`ip:${fingerprint(ip)}`,60],['global',300]] as const){const rows=await sql.query(`INSERT INTO abuse_windows(key,count,expires_at) VALUES($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN abuse_windows.expires_at<now() THEN 1 ELSE abuse_windows.count+1 END,expires_at=CASE WHEN abuse_windows.expires_at<now() THEN now()+interval '1 hour' ELSE abuse_windows.expires_at END RETURNING count`,['admin-login:'+key]);if(Number(rows[0]?.count)>maximum)throw new Error('RATE_LIMITED');}
}
export function createAdminPasskeyLogin(deps:Dependencies=defaults){return async function POST(request:Request){
 if(!allowsAdmin(request))return portalReply({message:'Not found.'},404);
 const started=Date.now();
 try{
  checkOrigin(request);const site=new URL(internalPortalOrigin()!);
  if(request.headers.get('origin')!==site.origin||site.protocol!=='https:')throw new Error('ACCESS_DENIED');
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('ACCESS_DENIED');
  const sql=deps.database();await limit(request,sql);
  const input=JSON.parse((await limitedBody(request,20000)).toString());
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('ACCESS_DENIED');
  const owner=process.env.TRACKING_OWNER_EMAIL?.trim().toLowerCase()||'',rpID=site.hostname;
  if(input.action==='options'){
   if(Object.keys(input).some(key=>key!=='action'))throw new Error('ACCESS_DENIED');
   const token=browserToken(request)||randomBytes(32).toString('base64url');
   const options=await deps.generate({rpID,userVerification:'required',allowCredentials:[],timeout:60000});
   await sql.query('DELETE FROM admin_login_challenges WHERE expires_at<=now()');
   await sql.query(`INSERT INTO admin_login_challenges(browser_hash,challenge,owner_email,rp_id,origin,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '5 minutes') ON CONFLICT(browser_hash) DO UPDATE SET challenge=EXCLUDED.challenge,owner_email=EXCLUDED.owner_email,rp_id=EXCLUDED.rp_id,origin=EXCLUDED.origin,expires_at=EXCLUDED.expires_at`,[tokenHash(token),options.challenge,owner,rpID,site.origin]);
   const response=portalReply({options});response.headers.set('Set-Cookie',challengeCookie(token,300));return response;
  }
  if(input.action!=='verify'||Object.keys(input).some(key=>!['action','response'].includes(key)))throw new Error('ACCESS_DENIED');
  const token=browserToken(request);if(!token)throw new Error('ACCESS_DENIED');
  // Consume before inspecting the credential or verifying a signature; invalid attempts also burn it.
  const challenges=await sql.query('DELETE FROM admin_login_challenges WHERE browser_hash=$1 RETURNING *',[tokenHash(token)]);
  const challenge=challenges[0];if(!challenge||!owner||challenge.owner_email!==owner||challenge.rp_id!==rpID||challenge.origin!==site.origin||new Date(String(challenge.expires_at)).getTime()<=Date.now())throw new Error('ACCESS_DENIED');
  const assertion=input.response as AuthenticationResponseJSON;
  if(!assertion||typeof assertion.id!=='string'||assertion.id.length>2000||!/^[\w-]+$/.test(assertion.id))throw new Error('ACCESS_DENIED');
  // This desk does not authorize embedded ceremonies, including Safari assertions without topOrigin.
  const clientData=JSON.parse(Buffer.from(assertion.response.clientDataJSON,'base64url').toString());
  if(clientData.crossOrigin===true||clientData.topOrigin!==undefined)throw new Error('ACCESS_DENIED');
  const keys=await sql.query('SELECT id,public_key,counter,transports FROM admin_passkeys WHERE id=$1 AND owner_email=$2 AND rp_id=$3',[assertion.id,owner,rpID]);
  const key=keys[0];
  const result=await deps.verify({response:assertion,expectedChallenge:String(challenge.challenge),expectedOrigin:site.origin,expectedRPID:rpID,requireUserVerification:true,credential:{id:assertion.id,publicKey:key?new Uint8Array(Buffer.from(String(key.public_key),'base64url')):unknownPublicKey,counter:key?Number(key.counter):0,transports:(key?.transports||[]) as ('ble'|'hybrid'|'internal'|'nfc'|'usb')[]}});
  if(!key||!result.verified||assertion.response?.userHandle!==Buffer.from(tokenHash(owner),'hex').toString('base64url')||process.env.TRACKING_OWNER_EMAIL?.trim().toLowerCase()!==owner||internalPortalOrigin()!==site.origin)throw new Error('ACCESS_DENIED');
  const newToken=randomBytes(32).toString('base64url');
  // Rotate the previous owner session atomically, only after verified authentication.
  const previous=sessionToken(request);
  await sql.query('SELECT complete_admin_passkey_login($1,$2,$3,$4,$5,$6,$7,$8)',[owner,rpID,key.id,key.public_key,Number(key.counter),result.authenticationInfo.newCounter,tokenHash(newToken),previous&&/^[\w-]{43}$/.test(previous)?tokenHash(previous):null]);
  const response=portalReply({ok:true});response.headers.append('Set-Cookie',challengeCookie('',0));response.headers.append('Set-Cookie',`${trackingCookie}=${newToken}; Path=/api/request-status; HttpOnly; SameSite=Strict; Max-Age=3600${process.env.NODE_ENV==='production'?'; Secure':''}`);return response;
 }catch(error){const rateLimited=error instanceof Error&&error.message==='RATE_LIMITED';if(!rateLimited)await new Promise(resolve=>setTimeout(resolve,Math.max(0,250-(Date.now()-started))));return portalReply({message:rateLimited?'Please wait before trying again.':denied},rateLimited?429:403);}
};}
