import { neon } from '@neondatabase/serverless';
export function database() { if (!process.env.DATABASE_URL)
    throw new Error('Database unavailable'); return neon(process.env.DATABASE_URL); }
