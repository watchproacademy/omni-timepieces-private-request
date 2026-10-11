import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GET as view,POST as mutate} from '../../src/app/api/request-status/portal/route';
import {GET as download,POST as upload} from '../../src/app/api/request-status/files/route';
import {GET as legacy} from '../../src/app/api/request-status/route';
test('portal and legacy routes deny unauthenticated reads, downloads, uploads and edits',async()=>{
 const previous=process.env.REQUEST_PORTAL_ENABLED;process.env.REQUEST_PORTAL_ENABLED='true';
 try{
 for(const handler of [view,download,legacy])assert.equal((await handler(new Request('http://localhost/api/request-status?id=test&file=test'))).status,401);
 const headers={origin:'http://localhost',host:'localhost','content-type':'application/json'};
 assert.equal((await mutate(new Request('http://localhost/api/request-status/portal',{method:'POST',headers,body:JSON.stringify({action:'note',requestId:'test',body:'Test',visibility:'customer',key:'63a6c9d8-395c-4b94-9691-cac166711ae0'})}))).status,401);
 assert.equal((await upload(new Request('http://localhost/api/request-status/files?id=test&kind=identity',{method:'POST',headers,body:'%PDF-1.7'}))).status,401);
 }finally{if(previous===undefined)delete process.env.REQUEST_PORTAL_ENABLED;else process.env.REQUEST_PORTAL_ENABLED=previous;}
});
