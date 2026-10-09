import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { fixture } from './fixtures';
test('actual PostgreSQL migration atomically saves jobs, deduplicates requests, throttles, and cascades retention', async () => {
    const db = new PGlite();
    try {
        await db.exec(await readFile('migrations/001_inquiries.sql', 'utf8'));
        const accept = (id: string, key: string, hash = 'same', ip = 'ip', email = 'email') => db.query('SELECT * FROM accept_inquiry($1,$2,$3,$4::jsonb,$5,$6)', [id, key, hash, JSON.stringify(fixture()), ip, email]);
        await accept('one', 'key-one');
        await accept('two', 'key-one');
        assert.equal((await db.query('SELECT * FROM inquiries')).rows.length, 1);
        assert.equal((await db.query('SELECT * FROM delivery_jobs')).rows.length, 2);
        await assert.rejects(accept('three', 'key-one', 'different'), /IDEMPOTENCY_CONFLICT/);
        await accept('four', 'key-four');
        await accept('five', 'key-five');
        await assert.rejects(accept('six', 'key-six'), /RATE_LIMITED/);
        assert.equal((await db.query('SELECT * FROM inquiries')).rows.length, 3);
        await db.exec("UPDATE inquiries SET created_at=now()-interval '91 days' WHERE id='one'; DELETE FROM inquiries WHERE created_at<now()-interval '90 days'; DELETE FROM abuse_windows WHERE expires_at<now();");
        assert.equal((await db.query("SELECT * FROM delivery_jobs WHERE inquiry_id='one'")).rows.length, 0);
        const claims = await Promise.all([db.query("UPDATE delivery_jobs SET state='sending',lease_until=now()+interval '2 minutes' WHERE id='four:owner' AND (lease_until IS NULL OR lease_until<now()) RETURNING id"), db.query("UPDATE delivery_jobs SET state='sending',lease_until=now()+interval '2 minutes' WHERE id='four:owner' AND (lease_until IS NULL OR lease_until<now()) RETURNING id")]);
        assert.equal(claims.flatMap(c => c.rows).length, 1);
    }
    finally {
        await db.close();
    }
});
test('concurrent repeated keys produce exactly one inquiry with two delivery jobs',async()=>{
 const db=new PGlite();try{await db.exec(await readFile('migrations/001_inquiries.sql','utf8'));
 const responses=await Promise.all(Array.from({length:5},(_,i)=>db.query<{request_id:string}>('SELECT * FROM accept_inquiry($1,$2,$3,$4::jsonb,$5,$6)',[`concurrent-${i}`,'same-key','same-hash',JSON.stringify(fixture()),'same-ip','same-email'])));
 assert.equal(new Set(responses.map(r=>r.rows[0].request_id)).size,1);assert.equal((await db.query('SELECT * FROM delivery_jobs')).rows.length,2);
 }finally{await db.close();}
});
