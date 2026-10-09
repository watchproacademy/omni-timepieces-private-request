import type { Inquiry } from './validation';
export class SubmissionError extends Error {
    constructor(message: string, public fields: Record<string, string> = {}) { super(message); }
}
export async function submitInquiry(payload: Inquiry, key: string, website: string) {
    const response = await fetch('/api/watch-request', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ ...payload, website }), signal: AbortSignal.timeout(15000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.status !== 'accepted' || !result.requestId)
        throw new SubmissionError(result.message || 'Your request could not be saved. Please try again.', result.fields);
    return result as {
        requestId: string;
        status: 'accepted';
        preview: boolean;
    };
}
