import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {negotiationPreservationBefore,negotiationPreservationAfter} from '../../src/lib/server/negotiation-migration-check';
test('negotiation migration fingerprints every existing field and rolls back private visibility changes',async()=>{
 const db=new PGlite();try{
  for(const name of ['001_inquiries.sql','002_tracking.sql','003_portal.sql','008_admin_passkeys_and_scans.sql','010_request_amendments.sql','012_commercial_documents.sql'])await db.exec(await readFile('migrations/'+name,'utf8'));
  await db.query("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('synthetic','key','hash','{}')");
  await db.query("INSERT INTO request_files(id,inquiry_id,kind,pathname,mime,size,state,scan_status,expires_at,customer_visible) VALUES('synthetic-draft','synthetic','quote','synthetic/quote.pdf','application/pdf',100,'ready','clean',now()+interval '1 year',false)");
  const migration=await readFile('migrations/013_negotiation.sql','utf8');
  await db.transaction(async tx=>{await tx.exec(negotiationPreservationBefore);await tx.exec(migration);await tx.exec(negotiationPreservationAfter);});
  await assert.rejects(db.transaction(async tx=>{await tx.exec(negotiationPreservationBefore);await tx.exec("UPDATE request_files SET customer_visible=true WHERE id='synthetic-draft'");await tx.exec(negotiationPreservationAfter);}),/MIGRATION_PRESERVATION_FAILED/);
  assert.equal((await db.query<{customer_visible:boolean}>("SELECT customer_visible FROM request_files WHERE id='synthetic-draft'")).rows[0].customer_visible,false);
  await assert.rejects(db.transaction(async tx=>{await tx.exec(negotiationPreservationBefore);await tx.exec("UPDATE inquiries SET payload_hash='changed' WHERE id='synthetic'");await tx.exec(negotiationPreservationAfter);}),/MIGRATION_PRESERVATION_FAILED/);
  assert.equal((await db.query<{payload_hash:string}>("SELECT payload_hash FROM inquiries WHERE id='synthetic'")).rows[0].payload_hash,'hash');
 }finally{await db.close();}
});
