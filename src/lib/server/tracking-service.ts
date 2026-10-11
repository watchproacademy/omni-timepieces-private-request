import { database } from './db';
import { readOrder, verifyOrderItem } from './shopify';
import { summarizeOrder } from '../tracking';
import type { Inquiry } from '../validation';
export async function trackingRequest(id:string,owner:boolean) {
 const rows=await database().query("SELECT payload,created_at FROM inquiries WHERE id=$1 AND created_at>now()-interval '90 days'",[id]);
 if(!rows[0])throw new Error('This request is unavailable or has expired. Contact the private desk.');
 const payload=rows[0].payload as Inquiry;
 const progress=await database().query('SELECT * FROM watch_progress WHERE inquiry_id=$1',[id]);
 const orders=new Map<string,ReturnType<typeof readOrder>>();
 const watches=await Promise.all(payload.watches.map(async watch=>{
  const row=progress.find(p=>p.watch_id===watch.id);
  let snapshot=row?.snapshot,checked=row?.checked_at,stale=false;
  if(row?.order_id && (!checked || Date.now()-new Date(checked).getTime()>60000)) {
   try{
    if(!orders.has(row.order_id))orders.set(row.order_id,readOrder(row.order_id));
    const order=await orders.get(row.order_id)!;
    if(order.email?.toLowerCase()!==payload.contact.email.toLowerCase())throw new Error('order mismatch');
    snapshot=summarizeOrder(order,row.line_id);checked=new Date().toISOString();
    await database().query('UPDATE watch_progress SET snapshot=$3::jsonb,checked_at=$4 WHERE inquiry_id=$1 AND watch_id=$2 AND version=$5',[id,watch.id,JSON.stringify(snapshot),checked,row.version]);
   }catch{stale=true;}
  }
  return {id:watch.id,title:`${watch.brand} ${watch.model}`,stage:snapshot?.stage||row?.stage||'received',manualStage:row?.stage||'received',note:row?.note||'',tracking:snapshot?.tracking||[],payment:snapshot?.payment||null,checkedAt:checked||null,stale,linked:!!row?.order_id,...(owner?{version:row?.version||0,orderId:row?.order_id||'',lineId:row?.line_id||''}:{})};
 }));
 return {id,createdAt:rows[0].created_at,watches};
}
export async function updateWatch(id:string,watchId:string,input:{stage:string;note:string;orderId:string;lineId:string;version:number}) {
 const rows=await database().query("SELECT payload FROM inquiries WHERE id=$1 AND created_at>now()-interval '90 days'",[id]);
 const payload=rows[0]?.payload as Inquiry|undefined;
 if(!payload?.watches.some(w=>w.id===watchId))throw new Error('Request or watch not found.');
 const snapshot=input.orderId?await verifyOrderItem(input.orderId,input.lineId,payload.contact.email):null;
 // The update and audit entry are one statement; a stale owner form cannot
 // overwrite a newer update. Linking is explicit and scoped to one watch.
 const updated=await database().query(updateProgressSql,[id,watchId,input.stage,input.note,input.orderId,input.lineId,JSON.stringify(snapshot),input.version]);
 if(!updated.length)throw new Error('This request changed. Refresh before saving again.');
}

export async function orderChoices(id:string,orderId:string) {
 const rows=await database().query(`SELECT payload FROM inquiries WHERE id=$1 AND ${process.env.REQUEST_PORTAL_ENABLED==='true'?"COALESCE(retention_until,created_at+interval '1 year')>now()":"created_at>now()-interval '90 days'"}`,[id]);
 const payload=rows[0]?.payload as Inquiry|undefined;
 if(!payload)throw new Error('Request unavailable.');
 const order=await readOrder(orderId);
 if(order.email?.trim().toLowerCase()!==payload.contact.email.trim().toLowerCase())throw new Error('The order email must match the inquiry email.');
 if(order.lineItems.pageInfo.hasNextPage)throw new Error('This order has too many items. Contact the private desk.');
 return {orderId:order.id,name:order.name,items:order.lineItems.nodes.filter(item=>item.quantity===1)};
}

export const updateProgressSql = `WITH changed AS (
 INSERT INTO watch_progress(inquiry_id,watch_id,stage,note,order_id,line_id,snapshot,checked_at,version)
 SELECT $1,$2,$3,$4,NULLIF($5,''),NULLIF($6,''),$7::jsonb,CASE WHEN $5='' THEN NULL ELSE now() END,1 WHERE $8=0
 ON CONFLICT(inquiry_id,watch_id) DO NOTHING RETURNING *
 ), revised AS (
 UPDATE watch_progress SET stage=$3,note=$4,order_id=NULLIF($5,''),line_id=NULLIF($6,''),snapshot=$7::jsonb,checked_at=CASE WHEN $5='' THEN NULL ELSE now() END,version=version+1
 WHERE inquiry_id=$1 AND watch_id=$2 AND version=$8 AND $8>0 RETURNING *
 ), changes AS (SELECT * FROM changed UNION ALL SELECT * FROM revised)
 INSERT INTO tracking_history(inquiry_id,watch_id,stage,note) SELECT inquiry_id,watch_id,stage,note FROM changes RETURNING id`;
