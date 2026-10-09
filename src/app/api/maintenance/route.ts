import { timingSafeEqual } from 'node:crypto';
import { pendingJobIds, purgeExpired } from '@/lib/server/repository';
import { processDelivery } from '@/lib/server/worker';
import { serverEnvironment } from '@/lib/server/environment';
export const maxDuration = 300;
export async function GET(request: Request) {
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
    const actual = request.headers.get('authorization') || '';
    if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected)))
        return new Response('Unauthorized', { status: 401 });
    try {
        serverEnvironment();
        await purgeExpired();
        const ids = await pendingJobIds();
        let failures = 0;
        // Independent jobs remain recoverable even if queue publication is unavailable.
        for (let i = 0; i < ids.length; i += 5) {
            const results = await Promise.allSettled(ids.slice(i, i + 5).map(id => processDelivery(id)));
            failures += results.filter(r => r.status === 'rejected').length;
        }
        return Response.json({ processed: ids.length, failures }, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch {
        return Response.json({ message: 'Maintenance failed.' }, { status: 503 });
    }
}
