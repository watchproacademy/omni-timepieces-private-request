import {allowsAdmin,internalPortalOrigin} from '@/lib/server/admin-boundary';
import {randomBytes} from 'node:crypto';
import {generateRegistrationOptions,generateAuthenticationOptions,verifyRegistrationResponse,verifyAuthenticationResponse,type RegistrationResponseJSON,type AuthenticationResponseJSON} from '@simplewebauthn/server';
import {database} from '@/lib/server/db';
import {pendingAccessFor,sessionToken,tokenHash,trackingCookie} from '@/lib/server/tracking-auth';
import {checkOrigin,limitedBody,portalReply,portalLimit} from '@/lib/server/portal';
export const runtime='nodejs';
function relyingParty(){
 const site=new URL(internalPortalOrigin()||'https://invalid.invalid');
 if(site.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&site.hostname==='localhost'))throw new Error('Invalid passkey origin');
 return {rpID:site.hostname,origin:site.origin};
}
export async function GET(request:Request){
 if(!allowsAdmin(request))return portalReply({message:'Not found.'},404);
 try{
 const access=await pendingAccessFor(request);if(!access||access.role!=='owner')return portalReply({message:'Please sign in with your private email link.'},401);
 const {rpID}=relyingParty(),owner=process.env.TRACKING_OWNER_EMAIL?.trim().toLowerCase();
 const keys=await database().query('SELECT id FROM admin_passkeys WHERE owner_email=$1 AND rp_id=$2',[owner,rpID]);
 return portalReply({required:!access.mfa_verified,enrolled:keys.length>0});
 }catch{return portalReply({message:'Admin verification is unavailable.'},503);}
}
export async function POST(request:Request){
 if(!allowsAdmin(request))return portalReply({message:'Not found.'},404);
 try{
 checkOrigin(request);
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error();
 const access=await pendingAccessFor(request);if(!access||access.role!=='owner')return portalReply({message:'Please sign in with your private email link.'},401);
 await portalLimit(request,30);
 const input=JSON.parse((await limitedBody(request,20000)).toString());
 const owner=process.env.TRACKING_OWNER_EMAIL!.trim().toLowerCase(),session=tokenHash(sessionToken(request)!),sql=database(),{rpID,origin}=relyingParty();
 if(request.headers.get('origin')!==origin)throw new Error();
 const keys=await sql.query('SELECT * FROM admin_passkeys WHERE owner_email=$1 AND rp_id=$2',[owner,rpID]);
 if(input.action==='options'){
  const register=input.register===true;
  let bootstrap:string|null=null;
  if(register&&!access.mfa_verified){
   if(keys.length||typeof input.setupCode!=='string'||input.setupCode.length>200)throw new Error();
   bootstrap=tokenHash(input.setupCode.trim());
   const rows=await sql.query('SELECT 1 FROM admin_enrollment WHERE owner_email=$1 AND code_hash=$2 AND expires_at>now()',[owner,bootstrap]);if(!rows.length)throw new Error();
  }
  if(!register&&!keys.length)throw new Error();
  const options=register?await generateRegistrationOptions({rpName:'Omni Private Desk',rpID,userName:owner,userID:new Uint8Array(Buffer.from(tokenHash(owner),'hex')),attestationType:'none',excludeCredentials:keys.map(key=>({id:key.id})),authenticatorSelection:{residentKey:'required',userVerification:'required'}}):await generateAuthenticationOptions({rpID,userVerification:'required',allowCredentials:keys.map(key=>({id:key.id,transports:key.transports}))});
  await sql.query(`INSERT INTO admin_challenges(session_hash,challenge,kind,owner_email,rp_id,bootstrap_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '5 minutes') ON CONFLICT(session_hash) DO UPDATE SET challenge=EXCLUDED.challenge,kind=EXCLUDED.kind,owner_email=EXCLUDED.owner_email,rp_id=EXCLUDED.rp_id,bootstrap_hash=EXCLUDED.bootstrap_hash,expires_at=EXCLUDED.expires_at`,[session,options.challenge,register?'register':'authenticate',owner,rpID,bootstrap]);
  return portalReply({options});
 }
 if(input.action!=='verify')throw new Error();
 const newToken=randomBytes(32).toString('base64url');
 const rows=await sql.query('DELETE FROM admin_challenges WHERE session_hash=$1 AND owner_email=$2 AND rp_id=$3 AND expires_at>now() RETURNING *',[session,owner,rpID]);
 if(!rows.length)throw new Error();const challenge=rows[0];
 if(challenge.kind==='register'){
  const result=await verifyRegistrationResponse({response:input.response as RegistrationResponseJSON,expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
  if(!result.verified||!result.registrationInfo)throw new Error();
  const key=result.registrationInfo.credential;
  await sql.query('SELECT complete_admin_passkey($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)',[session,owner,rpID,key.id,Buffer.from(key.publicKey).toString('base64url'),key.counter,0,JSON.stringify(key.transports||[]),challenge.bootstrap_hash,tokenHash(newToken)]);
 }else{
  const key=keys.find(key=>key.id===input.response?.id);if(!key)throw new Error();
  const result=await verifyAuthenticationResponse({response:input.response as AuthenticationResponseJSON,expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true,credential:{id:key.id,publicKey:new Uint8Array(Buffer.from(key.public_key,'base64url')),counter:Number(key.counter),transports:key.transports}});
  if(!result.verified)throw new Error();
  await sql.query('SELECT complete_admin_passkey($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)',[session,owner,rpID,key.id,null,result.authenticationInfo.newCounter,Number(key.counter),'[]',null,tokenHash(newToken)]);
 }
 const response=portalReply({ok:true});response.headers.set('Set-Cookie',`${trackingCookie}=${newToken}; Path=/api/request-status; HttpOnly; SameSite=Strict; Max-Age=3600${process.env.NODE_ENV==='production'?'; Secure':''}`);return response;
 }catch{return portalReply({message:'Verification could not be completed. Check your setup code or retry with your registered passkey.'},403);}
}
