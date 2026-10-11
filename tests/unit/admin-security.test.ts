import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('admin enrollment is one-time, sessions rotate, and email-only sessions cannot add backup keys',async()=>{
 const db=new PGlite();try{
 for(const file of ['001_inquiries.sql','002_tracking.sql','003_portal.sql','008_admin_passkeys_and_scans.sql','009_scan_replacements.sql']) await db.exec(await readFile('migrations/'+file,'utf8'));
 await db.exec(await readFile('migrations/008_admin_passkeys_and_scans.sql','utf8'));
 const session=async(id:string)=>db.query("INSERT INTO tracking_access(token_hash,role,owner_email,session,expires_at) VALUES($1,'owner','owner@example.com',true,now()+interval '1 hour')",[id]);
 await session('email-only');await session('attacker-email-only');
 await db.exec("INSERT INTO admin_enrollment VALUES('owner@example.com','setup-hash',now()+interval '1 hour')");
 const complete=(id:string,key:string,bootstrap:string|null,newSession:string,publicKey:string|null='public-key',previous=0)=>db.query('SELECT complete_admin_passkey($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)',[id,'owner@example.com','example.com',key,publicKey,1,previous,'[]',bootstrap,newSession]);
 await assert.rejects(complete('email-only','key','wrong','next'),/ACCESS_DENIED/);
 await complete('email-only','key','setup-hash','verified');
 assert.equal((await db.query("SELECT * FROM tracking_access WHERE token_hash='email-only'")).rows.length,0);
 assert.equal((await db.query<{mfa_verified:boolean}>("SELECT mfa_verified FROM tracking_access WHERE token_hash='verified'")).rows[0].mfa_verified,true);
 assert.equal((await db.query('SELECT * FROM admin_enrollment')).rows.length,0);
 await assert.rejects(complete('attacker-email-only','bad-key','setup-hash','bad-session'),/ACCESS_DENIED/);
 await complete('verified','backup',null,'verified-with-backup');
 await complete('attacker-email-only','key',null,'authenticated',null,1);
 assert.equal((await db.query('SELECT * FROM admin_passkeys')).rows.length,2);
 await assert.rejects(complete('missing','key',null,'invalid',null,1),/ACCESS_DENIED/);
 await assert.rejects(complete('authenticated','key',null,'stale',null,0),/ACCESS_DENIED/);
 }finally{await db.close();}
});

test('unscanned retained files block approval and shipping at the database boundary',async()=>{
 const db=new PGlite();try{
 for(const file of ['001_inquiries.sql','002_tracking.sql','003_portal.sql','008_admin_passkeys_and_scans.sql','009_scan_replacements.sql'])await db.exec(await readFile('migrations/'+file,'utf8'));
 await db.exec("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('i','i','h','{}')");
 await db.exec("INSERT INTO request_files(id,inquiry_id,kind,pathname,mime,size,state,expires_at) VALUES('f','i','identity','private/f','application/pdf',10,'ready',now()+interval '1 year')");
 await assert.rejects(db.exec("INSERT INTO request_reviews(inquiry_id,state) VALUES('i','approved')"),/SCAN_REQUIRED/);
 await assert.rejects(db.exec("INSERT INTO watch_progress(inquiry_id,watch_id,stage) VALUES('i','w','shipped')"),/SCAN_REQUIRED/);
 await db.exec("UPDATE request_files SET scan_status='clean' WHERE id='f'");
 await db.exec("INSERT INTO request_reviews(inquiry_id,state) VALUES('i','approved')");
 await db.exec("INSERT INTO watch_progress(inquiry_id,watch_id,stage) VALUES('i','w','shipped')");
 await db.exec("UPDATE request_files SET scan_status='blocked' WHERE id='f'");
 await assert.rejects(db.exec("UPDATE request_reviews SET state='approved' WHERE inquiry_id='i'"),/SCAN_REQUIRED/);
 await db.exec("INSERT INTO request_files(id,inquiry_id,kind,pathname,mime,size,state,expires_at,scan_status) VALUES('replacement','i','identity','private/replacement','application/pdf',10,'ready',now()+interval '1 year','clean')");
 await db.exec("UPDATE request_reviews SET state='approved' WHERE inquiry_id='i'");
 await db.exec("UPDATE watch_progress SET stage='shipped' WHERE inquiry_id='i'");
 }finally{await db.close();}
});

test('public deployment does not expose admin endpoints',async()=>{
 const {GET,POST}=await import('../../src/app/api/request-status/admin/route');
 assert.equal((await GET(new Request('https://example.com/api/request-status/admin'))).status,404);
 assert.equal((await POST(new Request('https://example.com/api/request-status/admin',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{"action":"options"}'}))).status,404);
 assert.equal((await POST(new Request('https://example.com/api/request-status/admin',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'{"action":"options"}'}))).status,404);
});
