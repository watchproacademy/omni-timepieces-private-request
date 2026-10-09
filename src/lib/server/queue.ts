import { send } from '@vercel/queue';
import { markPublished, pendingJobIds } from './repository';
export async function publishPending(requestId?: string) {
    const ids = await pendingJobIds(requestId);
    await Promise.all(ids.map(async (id) => { await send('omni-delivery', { jobId: id }, { idempotencyKey: `${id}:${Math.floor(Date.now() / 60000)}`, retentionSeconds: 86400 }); await markPublished(id); }));
}
