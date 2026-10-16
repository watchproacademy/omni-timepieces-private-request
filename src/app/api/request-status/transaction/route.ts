import {after} from 'next/server';
import {postAgreementEnabled,transactionInput,listTransactions,mutateTransaction} from '@/lib/server/post-agreement';
import {portalEnabled,portalAccess,portalLimit,checkOrigin,limitedBody,portalReply,portalError} from '@/lib/server/portal';
import {publishPending} from '@/lib/server/queue';
export const runtime='nodejs';
export async function GET(request:Request){if(!portalEnabled()||!postAgreementEnabled())return portalReply({message:'Transaction workflow is unavailable.'},503);try{const id=new URL(request.url).searchParams.get('id')||'',access=await portalAccess(request,id);await portalLimit(request,600);return portalReply({transactions:await listTransactions(id,access.role==='owner')});}catch(error){return portalError(error);}}
export async function POST(request:Request){
 if(!portalEnabled()||!postAgreementEnabled())return portalReply({message:'Transaction workflow is unavailable.'},503);
 try{checkOrigin(request);if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('INVALID_INPUT');const input=transactionInput.parse(JSON.parse((await limitedBody(request,16000)).toString()));const access=await portalAccess(request,input.requestId);await portalLimit(request,120);const version=await mutateTransaction(request,input,access);after(async()=>{try{await publishPending(input.requestId);}catch{console.error('transaction_outbox_pending');}});return portalReply({ok:true,version});}catch(error){return portalError(error);}
}
