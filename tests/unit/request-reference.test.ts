import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {fixture} from './fixtures';
test('short references backfill, stay unique and stable, and resolve alongside legacy IDs',async()=>{
 const db=new PGlite();try{
 await db.exec(await readFile('migrations/001_inquiries.sql','utf8'));
 await db.query("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('WR-OLD','old-key','hash',$1::jsonb)",[JSON.stringify(fixture())]);
 const migration=await readFile('migrations/004_request_references.sql','utf8');await db.exec(migration);
 const old=(await db.query<{public_reference:string}>("SELECT public_reference FROM inquiries WHERE id='WR-OLD'")).rows[0].public_reference;
 assert.match(old,/^OMNI-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
 await db.exec(migration);assert.equal((await db.query<{public_reference:string}>("SELECT public_reference FROM inquiries WHERE id='WR-OLD'")).rows[0].public_reference,old);
 await db.exec("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) SELECT 'new-'||n,'key-'||n,'hash','{}'::jsonb FROM generate_series(1,100) n");
 const rows=(await db.query<{public_reference:string}>('SELECT public_reference FROM inquiries')).rows;assert.equal(new Set(rows.map(r=>r.public_reference)).size,101);
 for(const input of ['WR-OLD',old,old.toLowerCase().replaceAll('-',' ')]){
 const match=await db.query("SELECT id FROM inquiries WHERE (id=$1 OR replace(public_reference,'-','')=$2) AND lower(payload->'contact'->>'email')=$3",[input.trim().toUpperCase(),input.toUpperCase().replace(/[\s-]/g,''),'test@example.com']);assert.equal(match.rows.length,1);
 }
 assert.equal((await db.query("SELECT id FROM inquiries WHERE public_reference=$1 AND lower(payload->'contact'->>'email')=$2",[old,'other@example.com'])).rows.length,0);
 const accept=(id:string)=>db.query<{request_id:string;duplicate:boolean}>('SELECT * FROM accept_inquiry($1,$2,$3,$4::jsonb,$5,$6)',[id,'same-submission-key','same-hash',JSON.stringify(fixture()),'test-ip','test-email']);
 const first=(await accept('WR-FIRST')).rows[0];const retry=(await accept('WR-RETRY')).rows[0];assert.equal(retry.request_id,first.request_id);assert.equal(retry.duplicate,true);
 assert.equal((await db.query("SELECT public_reference FROM inquiries WHERE id IN ('WR-FIRST','WR-RETRY')")).rows.length,1);
 }finally{await db.close();}
});

test('dated references use Miami days, ordered counters, aliases and stable retries',async()=>{
 const db=new PGlite();try{
 await db.exec(await readFile('migrations/001_inquiries.sql','utf8'));
 await db.exec(await readFile('migrations/004_request_references.sql','utf8'));
 for(const [id,date] of [['first','2026-10-11T03:59:59Z'],['second','2026-10-11T04:00:00Z']]){
  await db.query('INSERT INTO inquiries(id,idempotency_key,payload_hash,payload,created_at) VALUES($1,$1,\'hash\',$2::jsonb,$3)',[id,JSON.stringify(fixture()),date]);
 }
 const old=(await db.query<{public_reference:string}>("SELECT public_reference FROM inquiries WHERE id='first'")).rows[0].public_reference;
 const migration=await readFile('migrations/005_dated_request_references.sql','utf8');await db.exec(migration);
 const refs=async()=>(await db.query<{public_reference:string}>('SELECT public_reference FROM inquiries ORDER BY created_at')).rows.map(r=>r.public_reference);
 const before=await refs();assert.match(before[0],/^OMNI-WR20261010-0001-[A-HJ-NP-Z]{4}$/);assert.match(before[1],/^OMNI-WR20261011-0001-[A-HJ-NP-Z]{4}$/);
 await db.exec(migration);assert.deepEqual(await refs(),before);
 const lookup="SELECT id FROM inquiries WHERE (id=$1 OR replace(public_reference,'-','')=$2 OR EXISTS(SELECT 1 FROM request_reference_aliases a WHERE a.inquiry_id=inquiries.id AND replace(a.reference,'-','')=$2)) AND lower(payload->'contact'->>'email')=$3";
 for(const ref of ['first',old,before[0],before[0].toLowerCase().replaceAll('-',' ')]) assert.equal((await db.query(lookup,[ref,ref.toUpperCase().replace(/[\s-]/g,''),'test@example.com'])).rows.length,1);
 assert.equal((await db.query(lookup,[old,old.replaceAll('-',''),'wrong@example.com'])).rows.length,0);
 const next=async(date:string)=>(await db.query<{reference:string}>('SELECT dated_request_reference($1) AS reference',[date])).rows[0].reference;
 assert.match(await next('2026-10-11T04:00:01Z'),/^OMNI-WR20261011-0002-/);
 assert.match(await next('2026-12-01T04:59:59Z'),/^OMNI-WR20261130-0001-/);
 assert.match(await next('2026-12-01T05:00:00Z'),/^OMNI-WR20261201-0001-/);
 await db.exec("INSERT INTO request_reference_counters VALUES('2026-12-02',9999)");
 assert.match(await next('2026-12-02T12:00:00Z'),/^OMNI-WR20261202-10000-/);
 const accept=(id:string)=>db.query<{request_id:string;duplicate:boolean}>('SELECT * FROM accept_inquiry($1,$2,$3,$4::jsonb,$5,$6)',[id,'stable-key','same-hash',JSON.stringify(fixture()),'test-ip','test-email']);
 await accept('stable');const stable=(await db.query("SELECT public_reference FROM inquiries WHERE id='stable'")).rows;
 assert.equal((await accept('retry')).rows[0].request_id,'stable');
 assert.deepEqual((await db.query("SELECT public_reference FROM inquiries WHERE id='stable'")).rows,stable);
 }finally{await db.close();}
});
