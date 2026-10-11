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
