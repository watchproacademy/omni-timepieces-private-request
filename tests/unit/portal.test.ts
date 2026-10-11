import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {documentType} from '../../src/lib/server/portal-files';
test('document types use byte signatures, not client-provided filenames',()=>{
 assert.equal(documentType(Buffer.from('%PDF-1.7')).mime,'application/pdf');
 assert.equal(documentType(Buffer.from([137,80,78,71,13,10,26,10])).mime,'image/png');
 assert.throws(()=>documentType(Buffer.from('<script>bad</script>')));
});
test('manual stages, review gate, audit, durable notices and one-year file retention',async()=>{
 const db=new PGlite();try{
 for(const f of ['001_inquiries.sql','002_tracking.sql','003_portal.sql'])await db.exec(await readFile('migrations/'+f,'utf8'));
 await db.exec(await readFile('migrations/003_portal.sql','utf8'));
 await db.query("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('test','key','hash',$1::jsonb)",[JSON.stringify({watches:[{id:'w'},{id:'unpaid'}]})]);
 const stage=(value:string,version:number,key:string)=>db.query('SELECT portal_stage($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',['test','w',value,version,'UPS','TEST123','https://example.com/track',key,'owner','Stage update']);
 await stage('sourcing',0,'one');
 await assert.rejects(stage('paid',0,'stale'),/STALE_UPDATE/);
 await assert.rejects(stage('shipped',1,'early'),/REVIEW_APPROVAL_REQUIRED/);
 await stage('paid',1,'two');
 const review=(state:string,version:number,key:string,customer=false)=>db.query('SELECT portal_review($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)',['test',state,version,'["identity"]','{"legalName":"Test"}',key,customer?'customer':'owner',customer]);
 await review('requested',0,'review1');
 await assert.rejects(review('approved',1,'bad'),/DOCUMENTS_REQUIRED|SUBMITTED_REVIEW_REQUIRED/);
 await db.query('SELECT portal_reserve_file($1,$2,$3,$4,$5,$6,$7)',['test','file','identity','private/file.pdf','application/pdf',100,false]);
 await assert.rejects(review('submitted',1,'pending',true),/DOCUMENTS_REQUIRED|UPLOAD_PENDING/);
 await db.exec("UPDATE request_files SET state='ready' WHERE id='file'");
 await review('submitted',1,'review2',true);await review('approved',2,'review3');
 await stage('shipped',2,'three');
 await db.query('SELECT portal_stage($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',['test','unpaid','verification',0,'','','','unpaid-review','owner','Review']);
 await assert.rejects(db.query('SELECT portal_stage($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',['test','unpaid','shipped',1,'UPS','TEST','','unpaid-ship','owner','Ship']),/PAYMENT_REQUIRED/);
 const jobs=await db.query('SELECT * FROM delivery_jobs');assert.equal(jobs.rows.length,7);
 assert.equal((await db.query('SELECT * FROM request_events')).rows.length,7);
 await db.exec("DELETE FROM inquiries WHERE id='test'");assert.equal((await db.query('SELECT * FROM inquiries')).rows.length,1,'retention protects against old cleanup code');
 const expiry=await db.query<{days:number}>('SELECT extract(epoch FROM expires_at-created_at)/86400 AS days FROM request_files');assert.ok(Number(expiry.rows[0].days)>=364.99);
 await assert.rejects(db.query('SELECT portal_reserve_file($1,$2,$3,$4,$5,$6,$7)',['test','bad','invoice','private/bad.pdf','application/pdf',100,false]),/ACCESS_DENIED/);
 }finally{await db.close();}
});
