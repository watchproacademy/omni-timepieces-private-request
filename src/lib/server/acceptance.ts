import { createHash } from 'node:crypto';
import { requestSchema, fieldErrors, type Inquiry } from '../validation';
import { serverEnvironment } from './environment';
import { acceptInquiry } from './repository';
import { config } from '../config';
export type AcceptanceDependencies = {
    environment: () => {
        production: boolean;
        preview: boolean;
    };
    accept: (payload: Inquiry, key: string, ip: string) => Promise<{
        requestId: string;
        duplicate: boolean;
    }>;
    publish: (id: string) => void;
};
export async function handleSubmission(request: Request, deps: AcceptanceDependencies): Promise<Response> {
    const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
    const json = (body: unknown, status: number) => Response.json(body, { status, headers });
    const origin = request.headers.get('origin');
    const requestUrl = new URL(request.url);
    // Next may normalize the internal URL host; compare with the HTTP host the browser addressed.
    const host = request.headers.get('host') || requestUrl.host;
    const protocol = process.env.VERCEL ? 'https:' : requestUrl.protocol;
    const requestOrigin = `${protocol}//${host}`;
    if (!origin || origin !== requestOrigin || request.headers.get('sec-fetch-site') === 'cross-site')
        return json({ message: 'Submit your request from this website.' }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json'))
        return json({ message: 'Use JSON for this request.' }, 415);
    const key = request.headers.get('idempotency-key') || '';
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(key))
        return json({ message: 'A submission identifier is required.' }, 400);
    let input: unknown;
    try {
        const reader = request.body?.getReader();
        if (!reader)
            return json({ message: 'Request body required.' }, 400);
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            bytes += value.length;
            if (bytes > 30000) {
                await reader.cancel();
                return json({ message: 'Shorten your request and try again.' }, 413);
            }
            chunks.push(value);
        }
        input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    catch {
        return json({ message: 'Send valid JSON.' }, 400);
    }
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success)
        return json({ message: 'Check your watch and contact details.', fields: fieldErrors(parsed.error) }, 400);
    if (parsed.data.website)
        return json({ message: 'Your request could not be accepted.' }, 400);
    // Honeypot is never part of the persisted customer inquiry.
    const { website: _website, ...payload } = parsed.data;
    void _website;
    try {
        const env = deps.environment();
        if (env.preview) {
            if (env.production)
                return json({ message: 'Demo mode is unavailable.' }, 503);
            return json({ ok: true, status: 'accepted', preview: true, requestId: `DEMO-${createHash('sha256').update(key).digest('hex').slice(0, 12).toUpperCase()}` }, 200);
        }
        // Vercel provides this header; do not trust arbitrary client-forwarded addresses.
        const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
        const result = await deps.accept(payload, key, ip);
        try { deps.publish(result.requestId); } catch { console.error('outbox_publish_failed', { requestId: result.requestId }); }
        return json({ ok: true, status: 'accepted', preview: false, requestId: result.requestId }, result.duplicate ? 200 : 202);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('IDEMPOTENCY_CONFLICT'))
            return json({ message: 'This submission changed. Refresh and submit it again.' }, 409);
        if (message.includes('RATE_LIMITED'))
            return Response.json({ message: 'Too many requests. Please try again later.' }, { status: 429, headers: { ...headers, 'Retry-After': '3600' } });
        console.error('inquiry_acceptance_failed', { code: 'storage_or_configuration' });
        return json({ message: `Your request could not be saved. Please retry or visit ${config.mainUrl} to contact the private desk.` }, 503);
    }
}
export const acceptanceDefaults = { environment: serverEnvironment, accept: acceptInquiry };
