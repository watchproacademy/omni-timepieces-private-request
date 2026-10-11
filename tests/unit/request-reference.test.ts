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

test('reference tiers sum watch budgets, mark unknown ranges, preserve aliases and stay frozen',async()=>{
 const db=new PGlite();try{
 for(const file of ['001_inquiries.sql','004_request_references.sql','005_dated_request_references.sql']) await db.exec(await readFile('migrations/'+file,'utf8'));
 const payload=fixture();payload.watches[0].budget='$15,000–$30,000';payload.watches.push({...payload.watches[0],id:'second'});
 await db.query("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('tier','tier','hash',$1::jsonb)",[JSON.stringify(payload)]);
 const old=(await db.query<{public_reference:string}>("SELECT public_reference FROM inquiries WHERE id='tier'")).rows[0].public_reference;
 const migration=await readFile('migrations/006_request_reference_tiers.sql','utf8');await db.exec(migration);
 const reference=async()=>(await db.query<{public_reference:string}>("SELECT public_reference FROM inquiries WHERE id='tier'")).rows[0].public_reference;
 assert.equal(await reference(),old.replace(/-(\d{4,})-/,'-BX$1-'));
 assert.equal((await db.query('SELECT reference FROM request_reference_aliases WHERE reference=$1',[old])).rows.length,1);
 const classify=async(watches:unknown[])=>(await db.query<{tier:string}>('SELECT request_reference_classification($1::jsonb) AS tier',[JSON.stringify({watches})])).rows[0].tier;
 const exact=(amount:number)=>({budget:'Custom',budgetMin:amount,budgetMax:amount});
 for(const [amount,tier] of [[14999.99,'A'],[15000,'B'],[99999.99,'B'],[100000,'C'],[499999.99,'C'],[500000,'D'],[1000000,'D'],[1000000.01,'E']] as const) assert.equal(await classify([exact(amount)]),tier);
 assert.equal(await classify([{budget:'Under $15,000'}]),'A');
 assert.equal(await classify([{budget:'$60,000–$100,000'}]),'U');
 assert.equal(await classify([{budget:'$250,000+'}]),'U');
 assert.equal(await classify([{budget:'Flexible'},exact(20000)]),'UX');
 assert.equal(await classify([exact(10000),exact(10000)]),'BX');
 assert.equal(await classify([{budget:'Custom',budgetMin:14000,budgetMax:16000}]),'U');
 assert.equal(await classify([{budget:'Custom',budgetMax:'bad'}]),'U');
 assert.equal(await classify([]),'U');
 const saved=await reference();
 await db.exec("UPDATE inquiries SET payload='{}'::jsonb WHERE id='tier'");
 await db.exec(await readFile('migrations/005_dated_request_references.sql','utf8'));await db.exec(migration);
 assert.equal(await reference(),saved);
 await db.query("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('new-tier','new-tier','hash',$1::jsonb)",[JSON.stringify({watches:[exact(20000)]})]);
 assert.match((await db.query<{public_reference:string}>("SELECT public_reference FROM inquiries WHERE id='new-tier'")).rows[0].public_reference,/^OMNI-WR\d{8}-B\d{4,}-[A-Z]{4}$/);
 }finally{await db.close();}
});

test('brand references preserve the sequence and aliases, with same-brand and mixed baskets',async()=>{
 const db=new PGlite();try{
 for(const file of ['001_inquiries.sql','004_request_references.sql','005_dated_request_references.sql','006_request_reference_tiers.sql']) await db.exec(await readFile('migrations/'+file,'utf8'));
 await db.query("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('brand','brand','hash',$1::jsonb)",[JSON.stringify(fixture())]);
 const ref=async()=>(await db.query<{public_reference:string}>("SELECT public_reference FROM inquiries WHERE id='brand'")).rows[0].public_reference;
 const old=await ref();const migration=await readFile('migrations/007_request_reference_brands.sql','utf8');await db.exec(migration);
 assert.equal(await ref(),old.replace(/-([A-Z]{4})$/,'-RLX$1'));
 assert.equal((await db.query('SELECT reference FROM request_reference_aliases WHERE reference=$1',[old])).rows.length,1);
 const code=async(brands:string[])=>(await db.query<{code:string}>('SELECT request_brand_code($1::jsonb) AS code',[JSON.stringify({watches:brands.map(brand=>({brand}))})])).rows[0].code;
 for(const [brand,expected] of [['Rolex','RLX'],['Patek Philippe','PP'],['Richard Mille','RM'],['Audemars Piguet','AP'],['F.P. Journe','FPJ'],['Vacheron Constantin','VC'],['Cartier','CAR'],['Open to guidance','UNK'],['','UNK'],['Independent maker','OTH']]) assert.equal(await code([brand]),expected);
 assert.equal(await code(['Rolex','ROLEX']),'RLX');assert.equal(await code(['Rolex','Patek Philippe']),'MIX');assert.equal(await code(['Omega','Zenith']),'MIX');assert.equal(await code([]),'UNK');
 const saved=await ref();await db.exec("UPDATE inquiries SET payload='{}'::jsonb WHERE id='brand'");
 for(const file of ['004_request_references.sql','005_dated_request_references.sql','006_request_reference_tiers.sql','007_request_reference_brands.sql']) await db.exec(await readFile('migrations/'+file,'utf8'));
 assert.equal(await ref(),saved);
 await db.query("INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES('brand-new','brand-new','hash',$1::jsonb)",[JSON.stringify({watches:[{brand:'Rolex',budget:'$15,000–$30,000'},{brand:'Patek Philippe',budget:'$15,000–$30,000'}]})]);
 assert.match((await db.query<{public_reference:string}>("SELECT public_reference FROM inquiries WHERE id='brand-new'")).rows[0].public_reference,/^OMNI-WR\d{8}-BX\d{4,}-MIX[A-Z]{4}$/);
 }finally{await db.close();}
});
