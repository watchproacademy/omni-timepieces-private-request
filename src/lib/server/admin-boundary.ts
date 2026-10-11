// This switch belongs only on a separate deployment protected at the hosting/network layer.
// Never enable it on the customer deployment, including its preview aliases.
export function configuredInternalOrigin():string|null {
 try {
  const url=new URL(process.env.INTERNAL_PORTAL_URL||'');
  const customer=new URL(process.env.TRACKING_SITE_URL||'https://concierge.omnitimepieces.com');
  if(url.protocol!=='https:'||url.origin===customer.origin||url.hostname==='concierge.omnitimepieces.com'||url.username||url.password)return null;
  return url.origin;
 }catch{return null;}
}
export function internalPortalOrigin():string|null {
 return process.env.OMNI_PORTAL_MODE==='internal'?configuredInternalOrigin():null;
}
export function allowsAdmin(request:Request):boolean {
 const origin=internalPortalOrigin();
 return !!origin && new URL(request.url).origin===origin;
}
