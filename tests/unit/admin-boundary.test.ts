import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowsAdmin,internalPortalOrigin} from '../../src/lib/server/admin-boundary';
test('admin access fails closed on public deployments and other origins',()=>{
 const previous={...process.env};
 try {
 delete process.env.OMNI_PORTAL_MODE;
 process.env.INTERNAL_PORTAL_URL='https://internal.example.com';
 process.env.TRACKING_SITE_URL='https://customer.example.com';
 assert.equal(allowsAdmin(new Request('https://internal.example.com/api/request-status')),false);
 process.env.OMNI_PORTAL_MODE='internal';
 assert.equal(allowsAdmin(new Request('https://internal.example.com/api/request-status')),true);
 assert.equal(allowsAdmin(new Request('https://customer.example.com/api/request-status',{headers:{'x-forwarded-host':'internal.example.com'}})),false);
 process.env.INTERNAL_PORTAL_URL=process.env.TRACKING_SITE_URL;
 assert.equal(internalPortalOrigin(),null);
 process.env.INTERNAL_PORTAL_URL='http://internal.example.com';assert.equal(internalPortalOrigin(),null);
 delete process.env.INTERNAL_PORTAL_URL;assert.equal(internalPortalOrigin(),null);
 }finally{process.env=previous;}
});
test('public API rejects owner login before database or email access',async()=>{
 const previous=process.env.REQUEST_TRACKING_ENABLED;
 process.env.REQUEST_TRACKING_ENABLED='true';
 try{
 const {POST}=await import('../../src/app/api/request-status/route');
 const response=await POST(new Request('https://customer.example.com/api/request-status',{method:'POST',headers:{origin:'https://customer.example.com',host:'customer.example.com','content-type':'application/json'},body:JSON.stringify({action:'login',role:'owner',email:'owner@example.com'})}));
 assert.equal(response.status,404);
 }finally{if(previous===undefined)delete process.env.REQUEST_TRACKING_ENABLED;else process.env.REQUEST_TRACKING_ENABLED=previous;}
});
test('internal deployment still requires authentication and same-origin requests',async()=>{
 const previous={...process.env};
 try{
 process.env.OMNI_PORTAL_MODE='internal';process.env.INTERNAL_PORTAL_URL='https://staff.example.com';process.env.TRACKING_SITE_URL='https://customer.example.com';
 const {GET,POST}=await import('../../src/app/api/request-status/admin/route');
 assert.equal((await GET(new Request('https://staff.example.com/api/request-status/admin'))).status,401);
 assert.equal((await POST(new Request('https://staff.example.com/api/request-status/admin',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'}))).status,403);
 }finally{process.env=previous;}
});
