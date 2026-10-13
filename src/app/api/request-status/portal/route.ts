import {listRequests} from '@/lib/server/request-list';
import {publishPending} from '@/lib/server/queue';
import {after} from 'next/server';
import {accessFor} from '@/lib/server/tracking-auth';
import {pendingJobIds} from '@/lib/server/repository';
import {processDelivery} from '@/lib/server/worker';
import {portalEnabled,portalAccess,portalLimit,checkOrigin,limitedBody,portalReply,portalError,portalView,portalMutation,portalMutate} from '@/lib/server/portal';
export const runtime='nodejs';
export async function GET(request:Request){
 if(!portalEnabled())return portalReply({message:'Dashboard is being prepared.'},503);
 try{
 const access=await accessFor(request);if(!access)throw new Error('ACCESS_DENIED');await portalLimit(request,600);
 const id=new URL(request.url).searchParams.get('id')||access.inquiry_id;
 if(!id){if(access.role!=='owner')throw new Error('ACCESS_DENIED');return portalReply({role:access.role,...await listRequests(new URL(request.url).searchParams)});}
 await portalAccess(request,id);return portalReply({role:access.role,request:await portalView(id,access)});
 }catch(error){return portalError(error);}
}
export async function POST(request:Request){
 if(!portalEnabled())return portalReply({message:'Dashboard is being prepared.'},503);
 try{
 checkOrigin(request);if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('INVALID_INPUT');
 const parsed=portalMutation.safeParse(JSON.parse((await limitedBody(request,30000)).toString()));if(!parsed.success)throw new Error('INVALID_INPUT');
 const access=await portalAccess(request,parsed.data.requestId);await portalLimit(request);
 const result=await portalMutate(request,parsed.data,access);
 if(parsed.data.action==='request_edit')return portalReply({ok:true,...result});
 after(async()=>{try{await publishPending(parsed.data.requestId);return;}catch{console.error('portal_queue_pending');}for(const id of await pendingJobIds(parsed.data.requestId)){try{await processDelivery(id);}catch{console.error('portal_email_pending');}}});
 return portalReply({ok:true});
 }catch(error){return portalError(error);}
}
