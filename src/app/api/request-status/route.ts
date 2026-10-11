import { z } from 'zod';
import { database } from '@/lib/server/db';
import { fingerprint } from '@/lib/server/repository';
import { accessFor,consumeAccess,issueAccess,trackingCookie,tokenHash,revokeAccess } from '@/lib/server/tracking-auth';
import { trackingRequest,updateWatch,orderChoices } from '@/lib/server/tracking-service';
import { config } from '@/lib/config';
export const runtime='nodejs';
const reply=(body:unknown,status=200,extra:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer',...extra}});
const enabled=()=>process.env.REQUEST_TRACKING_ENABLED==='true';
const login=z.object({action:z.literal('login'),role:z.enum(['customer','owner']),email:z.string().email().max(254),requestId:z.string().max(100).default('')});
const edit=z.object({action:z.literal('update'),requestId:z.string().min(1).max(100),watchId:z.string().min(1).max(100),stage:z.enum(['received','sourcing','quoted','waiting','cancelled']),note:z.string().trim().max(1000),orderId:z.string().regex(/^(gid:\/\/shopify\/Order\/\d+)?$/),lineId:z.string().regex(/^(gid:\/\/shopify\/LineItem\/\d+)?$/),version:z.number().int().min(0)}).refine(v=>!!v.orderId===!!v.lineId);
async function throttle(key:string,limit:number) {
 const rows=await database().query(`INSERT INTO abuse_windows(key,count,expires_at) VALUES($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN abuse_windows.expires_at<now() THEN 1 ELSE abuse_windows.count+1 END,expires_at=CASE WHEN abuse_windows.expires_at<now() THEN now()+interval '1 hour' ELSE abuse_windows.expires_at END RETURNING count`,['tracking:'+fingerprint(key)]);
 return rows[0].count<=limit;
}
export async function GET(request:Request) {
 if(!enabled())return reply({message:'Request tracking is being prepared. Please reply to your confirmation email for an update.'},503);
 try{
 const access=await accessFor(request);if(!access)return reply({message:'Open a new private link to view your request.'},401);
 if(!await throttle('session:'+(request.headers.get('cookie')||''),600))return reply({message:'Please wait before refreshing again.'},429);
 const id=new URL(request.url).searchParams.get('id')||access.inquiry_id;
 if(!id){
 const rows=await database().query("SELECT id,created_at,payload->'watches'->0->>'brand' AS brand,payload->'watches'->0->>'model' AS model FROM inquiries WHERE created_at>now()-interval '90 days' ORDER BY created_at DESC LIMIT 100");
 return reply({role:access.role,requests:rows});
 }
 if(access.role!=='owner'&&access.inquiry_id!==id)return reply({message:'Request unavailable.'},404);
 return reply({role:access.role,request:await trackingRequest(id,access.role==='owner')});
 }catch{return reply({message:'Updates are temporarily unavailable. Please retry or contact the private desk.'},503);}
}
export async function POST(request:Request) {
 if(!enabled())return reply({message:'Request tracking is being prepared. Please reply to your confirmation email for an update.'},503);
 const origin=new URL(request.url);const host=request.headers.get('host')||origin.host;
 if(request.headers.get('origin')!==`${process.env.VERCEL?'https:':origin.protocol}//${host}`||request.headers.get('sec-fetch-site')==='cross-site')return reply({message:'Use the private request website.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({message:'JSON required.'},415);
 let input:Record<string,unknown>;
 try{
 const reader=request.body?.getReader();if(!reader)return reply({message:'Request required.'},400);const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6000){await reader.cancel();return reply({message:'Request too large.'},413);}chunks.push(value);}
 input=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!input||typeof input!=='object')throw new Error();
 }catch{return reply({message:'Invalid request.'},400);}
 try{
 if(input.action==='login'){
 const parsed=login.safeParse(input);if(!parsed.success)return reply({message:'Enter a valid email and request reference.'},400);
 const v=parsed.data;const email=v.email.toLowerCase().trim();const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]||'unknown':'local';
 if(!await throttle('ip:'+ip,20)||!await throttle('email:'+email,3))return reply({message:'Please wait before requesting another link.'},429);
 const owner=process.env.TRACKING_OWNER_EMAIL?.toLowerCase().trim();
 const matches=v.role==='owner'?email===owner:(await database().query("SELECT id FROM inquiries WHERE id=$1 AND lower(payload->'contact'->>'email')=$2 AND created_at>now()-interval '90 days'",[v.requestId,email])).length>0;
 if(matches){
 const token=await issueAccess(v.role,v.role==='owner'?null:v.requestId);
 const link=`${process.env.TRACKING_SITE_URL || config.siteUrl}/request-status#access=${token}`;
 const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'tracking:'+tokenHash(token)},body:JSON.stringify({from:process.env.WATCH_REQUEST_FROM_EMAIL,to:[email],subject:'Your private Omni request access',text:`Open your private request page: ${link}\n\nThis one-use link expires in 15 minutes. Keep it private. If you did not request this link, ignore this email.`}),signal:AbortSignal.timeout(10000)});
 if(!result.ok)throw new Error('email unavailable');
 }
 return reply({message:'If the details match, a private link will arrive shortly. Check your inbox and spam folder.'});
 }
 if(input.action==='exchange'){
 if(!await throttle('exchange:'+(process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')||'unknown':'local'),30))return reply({message:'Please try later.'},429);
 const access=await consumeAccess(String(input.token||''));if(!access)return reply({message:'This link expired or was already used. Request another link.'},401);
 const session=await issueAccess(access.role,access.inquiry_id,true);
 return reply({ok:true},200,{'Set-Cookie':`${trackingCookie}=${session}; Path=/api/request-status; HttpOnly; SameSite=Strict; Max-Age=3600${process.env.NODE_ENV==='production'?'; Secure':''}`});
 }
 const access=await accessFor(request);if(!access)return reply({message:'Please sign in again.'},401);
 if(input.action==='logout'){await revokeAccess(request);return reply({ok:true},200,{'Set-Cookie':`${trackingCookie}=; Path=/api/request-status; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV==='production'?'; Secure':''}`});}
 if(access.role!=='owner')return reply({message:'Owner access required.'},403);
 if(input.action==='order'){
 const orderInput=z.object({requestId:z.string().min(1).max(100),orderId:z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/)}).safeParse(input);
 if(!orderInput.success)return reply({message:'Enter an order from Shopify.'},400);
 try{return reply(await orderChoices(orderInput.data.requestId,orderInput.data.orderId));}catch{return reply({message:'Order unavailable or its email does not match this request.'},400);}
 }
 const parsed=edit.safeParse(input);if(!parsed.success)return reply({message:'Check the watch update fields.'},400);
 try{await updateWatch(parsed.data.requestId,parsed.data.watchId,parsed.data);return reply({ok:true});}catch(error){return reply({message:error instanceof Error && !/sql|constraint|database|duplicate/i.test(error.message)?error.message:'The update could not be saved. Check that this order item is not already linked.'},409);}
 }catch{return reply({message:'The service is temporarily unavailable. Please try again.'},503);}
}
