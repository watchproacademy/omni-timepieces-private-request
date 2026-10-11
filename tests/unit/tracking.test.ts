import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {summarizeOrder,safeTrackingUrl,type ShopifyOrder} from '../../src/lib/tracking';
import {tokenHash} from '../../src/lib/server/tracking-auth';
const order=():ShopifyOrder=>({id:'order',name:'#1001',email:'a@example.com',cancelledAt:null,displayFinancialStatus:'PAID',lineItems:{nodes:[{id:'one',title:'Watch one',quantity:1},{id:'two',title:'Watch two',quantity:1}],pageInfo:{hasNextPage:false}},fulfillments:[]});
test('watch tracking distinguishes partial payment, label creation, shipment, delivery, refunds and cancellation',()=>{
 const o=order();assert.equal(summarizeOrder(o,'one').stage,'paid');o.displayFinancialStatus='PARTIALLY_PAID';assert.equal(summarizeOrder(o,'one').stage,'partial_payment');
 o.fulfillments=[{status:'SUCCESS',displayStatus:'LABEL_PRINTED',inTransitAt:null,deliveredAt:null,fulfillmentLineItems:{nodes:[{lineItem:{id:'one'},quantity:1}],pageInfo:{hasNextPage:false}},trackingInfo:[{company:'Carrier',number:'123',url:'javascript:alert(1)'}]}];
 assert.equal(summarizeOrder(o,'one').stage,'partial_payment');assert.equal(summarizeOrder(o,'one').tracking[0].url,null);
 o.fulfillments[0].inTransitAt='2026-10-11';assert.equal(summarizeOrder(o,'one').stage,'shipped');assert.equal(summarizeOrder(o,'two').stage,'partial_payment');
 o.fulfillments[0].deliveredAt='2026-10-12';assert.equal(summarizeOrder(o,'one').stage,'delivered');o.displayFinancialStatus='REFUNDED';assert.equal(summarizeOrder(o,'one').stage,'refunded');o.cancelledAt='2026-10-13';assert.equal(summarizeOrder(o,'one').stage,'cancelled');
});
test('unmatched, multi-quantity and truncated order items fail closed',()=>{
 const o=order();assert.throws(()=>summarizeOrder(o,'missing'));o.lineItems.nodes[0].quantity=2;assert.throws(()=>summarizeOrder(o,'one'));o.lineItems.nodes[0].quantity=1;o.lineItems.pageInfo.hasNextPage=true;assert.throws(()=>summarizeOrder(o,'one'));
 assert.equal(safeTrackingUrl('https://user:pass@example.com'),null);assert.equal(safeTrackingUrl('http://example.com'),null);
});
test('tracking migration is repeatable; private links are single-use and request deletion cascades',async()=>{
 const db=new PGlite();try{
 await db.exec(await readFile('migrations/001_inquiries.sql','utf8'));const migration=await readFile('migrations/002_tracking.sql','utf8');await db.exec(migration);await db.exec(migration);
 await db.query("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('test','key','hash','{}')");
 const hash=tokenHash('random-private-token');assert.notEqual(hash,'random-private-token');
 await db.query("INSERT INTO tracking_access VALUES($1,'customer','test',now()+interval '15 minutes',false)",[hash]);
 const consume=()=>db.query('DELETE FROM tracking_access WHERE token_hash=$1 AND NOT session AND expires_at>now() RETURNING role',[hash]);
 const results=await Promise.all([consume(),consume()]);assert.equal(results.flatMap(r=>r.rows).length,1);
 await db.exec("INSERT INTO watch_progress(inquiry_id,watch_id,order_id,line_id) VALUES('test','w','order','line'); INSERT INTO tracking_history(inquiry_id,watch_id,stage,note) VALUES('test','w','sourcing','Checking');");
 await assert.rejects(db.query("INSERT INTO watch_progress(inquiry_id,watch_id,order_id,line_id) VALUES('test','w2','order','line')"));
 await db.exec("DELETE FROM inquiries WHERE id='test'");assert.equal((await db.query('SELECT * FROM watch_progress')).rows.length,0);assert.equal((await db.query('SELECT * FROM tracking_history')).rows.length,0);
 }finally{await db.close();}
});
test('tracking endpoint rejects cross-site writes and oversized input before accessing storage',async()=>{
 const {POST,GET}=await import('../../src/app/api/request-status/route');
 const previous=process.env.REQUEST_TRACKING_ENABLED;process.env.REQUEST_TRACKING_ENABLED='false';
 try{assert.equal((await GET(new Request('https://example.com/api/request-status'))).status,503);process.env.REQUEST_TRACKING_ENABLED='true';
 assert.equal((await POST(new Request('https://example.com/api/request-status',{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json'},body:'{}'}))).status,403);
 assert.equal((await POST(new Request('https://example.com/api/request-status',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'x'.repeat(6001)}))).status,413);
 }finally{if(previous===undefined)delete process.env.REQUEST_TRACKING_ENABLED;else process.env.REQUEST_TRACKING_ENABLED=previous;}
});
test('owner progress saves and audit are atomic, and stale versions cannot overwrite newer changes',async()=>{
 const {updateProgressSql}=await import('../../src/lib/server/tracking-service');const db=new PGlite();try{
 await db.exec(await readFile('migrations/001_inquiries.sql','utf8'));await db.exec(await readFile('migrations/002_tracking.sql','utf8'));
 await db.exec("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('request','key','hash','{}')");
 const update=(version:number,note:string)=>db.query(updateProgressSql,['request','watch','sourcing',note,'','','null',version]);
 assert.equal((await update(0,'Checking availability')).rows.length,1);
 assert.equal((await update(0,'Stale write')).rows.length,0);
 const edits=await Promise.all([update(1,'First update'),update(1,'Second update')]);assert.equal(edits.flatMap(r=>r.rows).length,1);
 assert.equal((await db.query('SELECT * FROM tracking_history')).rows.length,2);
 }finally{await db.close();}
});
