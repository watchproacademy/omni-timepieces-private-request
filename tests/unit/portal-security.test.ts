import {test} from 'node:test';
import assert from 'node:assert/strict';
import {portalMutation,checkOrigin,limitedBody,portalEnabled} from '../../src/lib/server/portal';
test('portal validates mutation fields, required identity evidence and safe tracking URLs',()=>{
 const stage={action:'stage',requestId:'r',watchId:'w',stage:'shipped',version:1,carrier:'UPS',trackingNumber:'123',trackingUrl:'javascript:alert(1)'};
 assert.equal(portalMutation.safeParse(stage).success,false);
 assert.equal(portalMutation.safeParse({...stage,trackingUrl:'https://user:pass@example.com'}).success,false);
 assert.equal(portalMutation.safeParse({...stage,trackingUrl:'https://example.com/track'}).success,true);
 assert.equal(portalMutation.safeParse({action:'review',requestId:'r',state:'requested',version:0,requirements:['address']}).success,false);
});
test('portal rejects cross-origin mutations and oversized bodies',async()=>{
 const request=new Request('https://example.com/api/request-status/portal',{method:'POST',headers:{origin:'https://other.example'},body:'{}'});
 assert.throws(()=>checkOrigin(request),/ACCESS_DENIED/);
 await assert.rejects(limitedBody(new Request('https://example.com',{method:'POST',body:'x'.repeat(11)}),10),/TOO_LARGE/);
 assert.equal(typeof portalEnabled(),'boolean');
});
