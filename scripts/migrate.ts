import { config as loadEnv } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
async function main() {
loadEnv({ path: '.env.local', quiet: true });
if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required.');
const sql = neon(process.env.DATABASE_URL);
for (const filename of ['001_inquiries.sql', '002_tracking.sql', '003_portal.sql', '004_request_references.sql']) {
 const migration = await readFile(new URL('../migrations/' + filename, import.meta.url), 'utf8');
 await sql.transaction(migration.split('-- statement').map(statement => sql.query(statement)));
}
console.log('Inquiry schema migration applied.');

}
main().catch(() => { console.error("Schema migration failed; verify database configuration."); process.exitCode = 1; });
