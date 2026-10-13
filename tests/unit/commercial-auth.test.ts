import {test} from 'node:test';
import assert from 'node:assert/strict';
test('commercial endpoints reject unauthenticated and cross-origin access before effects',async()=>{
 const previous={...process.env},fetcher=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('External requests must not occur.');};try{process.env.REQUEST_PORTAL_ENABLED='true';process.env.COMMERCIAL_DOCUMENTS_ENABLED='true';const commercial=await import('../../src/app/api/request-status/commercial/route');
 const headers={origin:'https://staff.example.invalid','content-type':'application/json'};
 assert.equal((await commercial.GET(new Request('https://staff.example.invalid/api/request-status/commercial?id=synthetic'))).status,401);
 assert.equal((await commercial.POST(new Request('https://staff.example.invalid/api/request-status/commercial',{method:'POST',headers,body:JSON.stringify({requestId:'synthetic',documentId:crypto.randomUUID(),version:0,key:crypto.randomUUID(),action:'discard'})}))).status,401);
 assert.equal((await commercial.POST(new Request('https://staff.example.invalid/api/request-status/commercial',{method:'POST',headers:{...headers,origin:'https://other.example.invalid'},body:'{}'}))).status,401);
 assert.equal(calls,0);delete process.env.COMMERCIAL_DOCUMENTS_ENABLED;assert.equal((await commercial.GET(new Request('https://staff.example.invalid/api/request-status/commercial'))).status,503);
 }finally{process.env=previous;globalThis.fetch=fetcher;}
});
test('authenticated customers cannot upload, approve, read other requests or download private draft originals',async()=>{
 const previous={...process.env},fetcher=globalThis.fetch;const queries:string[]=[];
 try{process.env.DATABASE_URL='postgresql://test:test@synthetic.invalid/test';process.env.REQUEST_PORTAL_ENABLED='true';process.env.COMMERCIAL_DOCUMENTS_ENABLED='true';process.env.ABUSE_HASH_SECRET='synthetic-test-secret';delete process.env.VERCEL;
 globalThis.fetch=async(_url,init)=>{const data=JSON.parse(String(init?.body));const query=data.query as string;queries.push(query);let names:string[]=[],rows:unknown[][]=[];
  if(query.includes('FROM tracking_access')){names=['role','inquiry_id','mfa_verified'];rows=[['customer','synthetic',false]];}
  else if(query.includes('SELECT id FROM inquiries')){names=['id'];rows=[['synthetic']];}
  else if(query.includes('abuse_windows')){names=['count'];rows=[[1]];}
  else if(query.includes('FROM commercial_documents')){assert.match(query,/AND d.state='published'/);names=['id'];rows=[];}
  else if(query.includes('FROM request_files')){assert.match(query,/customer_visible/);names=['pathname','mime','kind','scan_status'];rows=[];}
  else throw new Error('Unexpected storage or provider operation.');
  return Response.json({fields:names.map(name=>({name,dataTypeID:25})),rows,rowCount:rows.length,command:'SELECT'});
 };
 const commercial=await import('../../src/app/api/request-status/commercial/route'),files=await import('../../src/app/api/request-status/files/route');const cookie='omni_request_access='+ 'a'.repeat(43),headers={cookie,origin:'https://customer.example.invalid','content-type':'application/json'};
 assert.equal((await commercial.GET(new Request('https://customer.example.invalid/api/request-status/commercial?id=other',{headers:{cookie}}))).status,401);assert.equal(queries.length,1);
 assert.equal((await commercial.GET(new Request('https://customer.example.invalid/api/request-status/commercial?id=synthetic',{headers:{cookie}}))).status,200);
 assert.equal((await commercial.POST(new Request('https://customer.example.invalid/api/request-status/commercial',{method:'POST',headers,body:JSON.stringify({requestId:'synthetic',documentId:crypto.randomUUID(),version:0,key:crypto.randomUUID(),action:'approve',reviewed:true,data:{}})}))).status,401);
 assert.equal((await commercial.POST(new Request('https://customer.example.invalid/api/request-status/commercial?id=synthetic&kind=quote',{method:'POST',headers:{...headers,'content-type':'application/octet-stream','idempotency-key':crypto.randomUUID()},body:'%PDF synthetic'}))).status,401);
 assert.equal((await files.GET(new Request('https://customer.example.invalid/api/request-status/files?id=synthetic&file=private-draft',{headers:{cookie}}))).status,404);assert.equal(queries.some(query=>query.includes('commercial_mutate')||query.includes('commercial_reserve')),false);
 }finally{process.env=previous;globalThis.fetch=fetcher;}
});
