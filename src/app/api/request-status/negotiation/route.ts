import {z} from 'zod';
import {after} from 'next/server';
import {negotiationInput} from '@/lib/negotiation';
import {negotiationEnabled,listNegotiation,mutateNegotiation} from '@/lib/server/negotiation';
import {portalEnabled,portalAccess,portalLimit,checkOrigin,limitedBody,portalReply,portalError} from '@/lib/server/portal';
import {publishPending} from '@/lib/server/queue';
import {pendingJobIds} from '@/lib/server/repository';
import {processDelivery} from '@/lib/server/worker';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(request:Request){
 if(!portalEnabled()||!negotiationEnabled())return portalReply({message:'Offer decisions are unavailable.'},503);
 try{const id=new URL(request.url).searchParams.get('id')||'',access=await portalAccess(request,id);await portalLimit(request);return portalReply(await listNegotiation(id,access.role==='owner'));}catch(error){return portalError(error);}
}
export async function POST(request:Request){
 if(!portalEnabled()||!negotiationEnabled())return portalReply({message:'Offer decisions are unavailable.'},503);
 try{
  checkOrigin(request);if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('INVALID_INPUT');
  const input=negotiationInput.parse(JSON.parse((await limitedBody(request,16000)).toString())),access=await portalAccess(request,input.requestId);await portalLimit(request);
  const offerId=await mutateNegotiation(request,input,access);
  after(async()=>{try{await publishPending(input.requestId);return;}catch{console.error('negotiation_queue_pending');}for(const job of await pendingJobIds(input.requestId)){try{await processDelivery(job);}catch{console.error('negotiation_email_pending');}}});
  return portalReply({ok:true,offerId});
 }catch(error){if(error instanceof z.ZodError)return portalReply({message:error.issues.map(issue=>issue.message).join(' ')},400);return portalError(error);}
}
