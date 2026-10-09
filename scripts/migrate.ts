import { config as loadEnv } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
loadEnv({ path: '.env.local', quiet: true });
if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required.');
const sql = neon(process.env.DATABASE_URL);
const migration = await readFile(new URL('../migrations/001_inquiries.sql', import.meta.url), 'utf8');
await sql.transaction(migration.split('-- statement').map(statement => sql.query(statement)));
console.log('Inquiry schema migration applied.');
