import { after } from 'next/server';
import { handleSubmission, acceptanceDefaults } from '@/lib/server/acceptance';
import { publishPending } from '@/lib/server/queue';
export const runtime = 'nodejs';
export async function POST(request: Request) { return handleSubmission(request, { ...acceptanceDefaults, publish: id => after(async () => { try {
        await publishPending(id);
    }
    catch {
        console.error('outbox_publish_failed', { requestId: id });
    } }) }); }
