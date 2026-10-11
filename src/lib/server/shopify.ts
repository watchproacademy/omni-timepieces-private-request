import { summarizeOrder, type ShopifyOrder } from '../tracking';
export const orderQuery = `query ConciergeOrder($id: ID!) { order(id: $id) { id name email cancelledAt displayFinancialStatus lineItems(first: 100) { nodes { id title quantity } pageInfo { hasNextPage endCursor } } fulfillments { status displayStatus inTransitAt deliveredAt fulfillmentLineItems(first: 100) { nodes { quantity lineItem { id } } pageInfo { hasNextPage endCursor } } trackingInfo { company number url } } } }`;
let cached: {value:string;expires:number}|undefined;
function shopDomain() { const shop=process.env.SHOPIFY_SHOP_DOMAIN; if(shop!=='11af59-2.myshopify.com') throw new Error('Omni Shopify is not configured.'); return shop; }
async function requestToken() {
 if(cached && cached.expires>Date.now()+60000)return cached.value;
 if(!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET)throw new Error('Shopify authentication is not configured.');
 const response=await fetch(`https://${shopDomain()}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:process.env.SHOPIFY_CLIENT_ID,client_secret:process.env.SHOPIFY_CLIENT_SECRET}),signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!response.ok)throw new Error('Shopify authentication failed.');
 const data=await response.json();if(typeof data.access_token!=='string'||!Number.isFinite(data.expires_in))throw new Error('Shopify authentication failed.');
 cached={value:data.access_token,expires:Date.now()+data.expires_in*1000};return cached.value;
}
let tokenRequest: Promise<string>|undefined;
async function token() {
 if(cached && cached.expires>Date.now()+60000)return cached.value;
 if(tokenRequest)return tokenRequest;
 tokenRequest=requestToken();
 try{return await tokenRequest;}finally{tokenRequest=undefined;}
}
export async function readOrder(id:string):Promise<ShopifyOrder> {
 if(!/^gid:\/\/shopify\/Order\/\d+$/.test(id))throw new Error('Use a valid Shopify order ID.');
 const response=await fetch(`https://${shopDomain()}/admin/api/2026-07/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':await token()},body:JSON.stringify({query:orderQuery,variables:{id}}),signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(response.status===401)cached=undefined;
 if(!response.ok)throw new Error('Shopify is temporarily unavailable.');
 const result=await response.json();if(result.errors?.length||!result.data?.order)throw new Error('Shopify order is unavailable. Check access and the order ID.');
 return result.data.order;
}
export async function verifyOrderItem(id:string,lineId:string,email:string) {
 const order=await readOrder(id);
 if(order.email?.trim().toLowerCase()!==email.trim().toLowerCase())throw new Error('The order email must match the inquiry email.');
 return summarizeOrder(order,lineId);
}
