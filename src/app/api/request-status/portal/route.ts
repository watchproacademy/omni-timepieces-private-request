import {publishPending} from '@/lib/server/queue';
import {after} from 'next/server';
import {accessFor} from '@/lib/server/tracking-auth';
import {database} from '@/lib/server/db';
import {pendingJobIds} from '@/lib/server/repository';
import {processDelivery} from '@/lib/server/worker';
import {portalEnabled,portalAccess,portalLimit,checkOrigin,limitedBody,portalReply,portalError,portalView,portalMutation,portalMutate} from '@/lib/server/portal';
export const runtime='nodejs';
export async function GET(request:Request){
 if(!portalEnabled())return portalReply({message:'Dashboard is being prepared.'},503);
 try{
 const access=await accessFor(request);if(!access)throw new Error('ACCESS_DENIED');await portalLimit(request,600);
 const id=new URL(request.url).searchParams.get('id')||access.inquiry_id;
 if(!id){if(access.role!=='owner')throw new Error('ACCESS_DENIED');const rows=await database().query("SELECT id,public_reference AS reference,created_at,payload->'contact'->>'fullName' AS name,payload->'watches'->0->>'brand' AS brand,payload->'watches'->0->>'model' AS model FROM inquiries WHERE COALESCE(retention_until,created_at+interval '1 year')>now() ORDER BY created_at DESC LIMIT 100");return portalReply({role:access.role,requests:rows});}
 await portalAccess(request,id);return portalReply({role:access.role,request:await portalView(id,access)});
 }catch(error){return portalError(error);}
}
export async function POST(request:Request){
 if(!portalEnabled())return portalReply({message:'Dashboard is being prepared.'},503);
 try{
 checkOrigin(request);if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('INVALID_INPUT');
 const parsed=portalMutation.safeParse(JSON.parse((await limitedBody(request)).toString()));if(!parsed.success)throw new Error('INVALID_INPUT');
 const access=await portalAccess(request,parsed.data.requestId);await portalLimit(request);
 await portalMutate(request,parsed.data,access);
 after(async()=>{try{await publishPending(parsed.data.requestId);return;}catch{console.error('portal_queue_pending');}for(const id of await pendingJobIds(parsed.data.requestId)){try{await processDelivery(id);}catch{console.error('portal_email_pending');}}});
 return portalReply({ok:true});
 }catch(error){return portalError(error);}
}
