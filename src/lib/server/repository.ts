import { createHash, createHmac, randomUUID } from 'node:crypto';
import { database } from './db';
import { config } from '../config';
import type { Inquiry } from '../validation';
export type DeliveryJob = {
    id: string;
    inquiry_id: string;
    public_reference?: string;
    kind: 'owner' | 'receipt' | 'update' | 'operator_update';
    event?: {title: string; message: string;section?:string;transactionAction?:string};
    state: string;
    attempts: number;
    first_attempt_at: string | null;
    lease_token: string;
    payload: Inquiry;
};
export function fingerprint(value: string) { return createHmac('sha256', process.env.ABUSE_HASH_SECRET!).update(value).digest('hex'); }
export function payloadHash(payload: Inquiry) { return createHash('sha256').update(JSON.stringify(payload)).digest('hex'); }
export async function acceptInquiry(payload: Inquiry, key: string, ip: string) {
    const requestId = `WR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().toUpperCase()}`;
    const rows = await database().query('SELECT * FROM accept_inquiry($1,$2,$3,$4::jsonb,$5,$6)', [requestId, key, payloadHash(payload), JSON.stringify(payload), fingerprint(ip), fingerprint(payload.contact.email.toLowerCase())]);
    const references = await database().query('SELECT public_reference FROM inquiries WHERE id=$1', [rows[0].request_id]);
    return { requestId: rows[0].request_id as string, reference: references[0].public_reference as string, duplicate: rows[0].duplicate as boolean };
}
export async function pendingJobIds(requestId?: string) {
    const rows = await database().query(`SELECT id FROM delivery_jobs WHERE state IN ('pending','sending') AND (lease_until IS NULL OR lease_until<now()) AND next_attempt_at<=now() ${requestId ? 'AND inquiry_id=$1' : ''} ORDER BY created_at LIMIT 100`, requestId ? [requestId] : []);
    return rows.map(row => row.id as string);
}
export async function markPublished(id: string) { await database().query('UPDATE delivery_jobs SET published_at=now() WHERE id=$1', [id]); }
export async function claimJob(id: string): Promise<DeliveryJob | null> {
    const token = randomUUID();
    const rows = await database().query(`WITH claimed AS (
 UPDATE delivery_jobs SET state='sending',attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,now()),lease_until=now()+interval '2 minutes',lease_token=$2
 WHERE id=$1 AND state IN ('pending','sending') AND (lease_until IS NULL OR lease_until<now()) AND next_attempt_at<=now() RETURNING *
 ) SELECT claimed.*,inquiries.payload,inquiries.public_reference FROM claimed JOIN inquiries ON inquiries.id=claimed.inquiry_id`, [id, token]);
    if (rows[0])
        return rows[0] as DeliveryJob;
    const waiting = await database().query("SELECT state FROM delivery_jobs WHERE id=$1 AND state IN ('pending','sending')", [id]);
    if (waiting.length)
        throw new Error('delivery_not_ready');
    return null;
}
export async function completeJob(job: DeliveryJob, providerId: string) { await database().query("UPDATE delivery_jobs SET state='sent',provider_id=$3,lease_until=NULL WHERE id=$1 AND lease_token=$2", [job.id, job.lease_token, providerId]); }
export async function failJob(job: DeliveryJob, state: 'pending' | 'failed' | 'ambiguous', code: string, delay: number) { await database().query('UPDATE delivery_jobs SET state=$3,last_error=$4,lease_until=NULL,next_attempt_at=now()+($5 * interval \'1 second\') WHERE id=$1 AND lease_token=$2', [job.id, job.lease_token, state, code, delay]); }
export async function purgeExpired() {
    const sql = database();
    if (process.env.REQUEST_PORTAL_ENABLED === 'true') { const {purgePortalFiles}=await import('./portal-files'); await purgePortalFiles(); }
    await sql.transaction([
        process.env.REQUEST_PORTAL_ENABLED === 'true'
          ? sql.query("DELETE FROM inquiries WHERE COALESCE(retention_until,created_at+interval '1 year')<now()")
          : sql.query("DELETE FROM inquiries WHERE created_at<now()-($1 * interval '1 day')", [config.retentionDays]),
        sql.query('DELETE FROM abuse_windows WHERE expires_at<now()'),
        ...(process.env.REQUEST_TRACKING_ENABLED === 'true' ? [sql.query('DELETE FROM tracking_access WHERE expires_at<now()')] : []),
    ]);
}
