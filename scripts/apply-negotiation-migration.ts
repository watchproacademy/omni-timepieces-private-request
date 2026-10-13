import {readFile,writeFile} from 'node:fs/promises';
import {parse} from 'dotenv';
import {neon} from '@neondatabase/serverless';
import {negotiationPreservationBefore,negotiationPreservationAfter} from '../src/lib/server/negotiation-migration-check';
async function main(){
 const [environmentFile,evidenceFile]=process.argv.slice(2);if(!environmentFile||!evidenceFile)throw new Error('Environment and evidence files required.');
 const env=parse(await readFile(environmentFile));if(!env.DATABASE_URL)throw new Error('Database configuration missing.');
 const url=new URL(env.DATABASE_URL);url.hostname=url.hostname.replace('-pooler.','.');const sql=neon(url.href);
 const migration=await readFile(new URL('../migrations/013_negotiation.sql',import.meta.url),'utf8'),before=negotiationPreservationBefore.split('DO $$');
 const result=await sql.transaction([sql.query("SET LOCAL lock_timeout='3s'"),sql.query("SET LOCAL statement_timeout='30s'"),sql.query(before[0]),sql.query('DO $$'+before[1]),...migration.split('-- statement').filter(s=>s.trim()).map(s=>sql.query(s)),sql.query(negotiationPreservationAfter),sql.query('SELECT table_name,row_count FROM omni_negotiation_preservation ORDER BY table_name')]);
 await writeFile(evidenceFile,JSON.stringify({migration:'013_negotiation.sql',existingRowsPreserved:true,privateFileVisibilityPreserved:true,noRetrospectiveAssent:true,tables:result.at(-1)},null,2),{mode:0o600});
 console.log(JSON.stringify({migration:'013',existingRowsPreserved:true,privateFileVisibilityPreserved:true,noRetrospectiveAssent:true,existingTablesVerified:result.at(-1)?.length}));
}
main().catch(()=>{console.error('Negotiation migration failed or unconfirmed. Inspect schema state before retrying. No record contents were logged.');process.exitCode=1;});
