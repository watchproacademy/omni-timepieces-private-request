export const trackingStages = ['received','sourcing','quoted','paid','shipped','delivered'] as const;
export const stageLabels: Record<string,string> = {received:'Request received',sourcing:'Sourcing your watch',quoted:'Quote / invoice',paid:'Paid',shipped:'Shipped',delivered:'Delivered',waiting:'Awaiting your response',cancelled:'Cancelled',refunded:'Refunded',partial_payment:'Partially paid',partial_refund:'Partially refunded',ready:'Preparing shipment'};
export type OrderSnapshot = { stage: string; payment: string; tracking: {company:string|null;number:string|null;url:string|null}[] };
export type ShopifyOrder = {
 id:string;name:string;email:string|null;cancelledAt:string|null;displayFinancialStatus:string;
 lineItems:{nodes:{id:string;title:string;quantity:number}[];pageInfo:{hasNextPage:boolean}};
 fulfillments:{status:string;displayStatus:string;inTransitAt:string|null;deliveredAt:string|null;fulfillmentLineItems:{nodes:{quantity:number;lineItem:{id:string}}[];pageInfo:{hasNextPage:boolean}};trackingInfo:{company:string|null;number:string|null;url:string|null}[]}[];
};
export function summarizeOrder(order:ShopifyOrder,lineId:string):OrderSnapshot {
 const line=order.lineItems.nodes.find(item=>item.id===lineId);
 if(!line || line.quantity!==1 || order.lineItems.pageInfo.hasNextPage || order.fulfillments.some(f=>f.fulfillmentLineItems.pageInfo.hasNextPage)) throw new Error('Order item cannot be tracked safely. Use a separate quantity-one line for each watch.');
 const shipments=order.fulfillments.filter(f=>f.status==='SUCCESS' && f.fulfillmentLineItems.nodes.some(item=>item.lineItem.id===lineId && item.quantity>0));
 const payment=order.displayFinancialStatus;
 let stage=payment==='PAID'?'paid':payment==='PARTIALLY_PAID'?'partial_payment':'quoted';
 if(shipments.some(f=>f.inTransitAt || ['IN_TRANSIT','OUT_FOR_DELIVERY'].includes(f.displayStatus))) stage='shipped';
 if(shipments.length && shipments.every(f=>f.deliveredAt || f.displayStatus==='DELIVERED')) stage='delivered';
 if(payment==='PARTIALLY_REFUNDED') stage='partial_refund';
 if(payment==='REFUNDED') stage='refunded';
 if(order.cancelledAt) stage='cancelled';
 return {stage,payment,tracking:shipments.flatMap(f=>f.trackingInfo).map(t=>({...t,url:safeTrackingUrl(t.url)}))};
}
export function safeTrackingUrl(value:string|null) {
 try { const url=new URL(value||''); return url.protocol==='https:' && !url.username && !url.password ? url.href:null; } catch{return null;}
}
