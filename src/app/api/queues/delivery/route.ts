import {handleCallback} from '@vercel/queue';
import {processDelivery,retryDelay} from '@/lib/server/worker';
const callback=handleCallback<{jobId:string}>(async message=>{
 if(typeof message.jobId!=='string'||message.jobId.length>150)return;
 await processDelivery(message.jobId);
},{retry:(_error,metadata)=>metadata.deliveryCount>8?{acknowledge:true}:{afterSeconds:retryDelay(metadata.deliveryCount)}});
// Narrow the SDK's adapter input to the App Router route-handler contract.
export async function POST(request:Request){return callback(request);}
