import { emailFor, escapeHtml, emailTheme } from './email';
import type { DeliveryJob } from './repository';
export class DeliveryError extends Error {
    constructor(public code: string, public retryable: boolean, public ambiguous = false) { super(code); }
}
async function providerFetch(url: string, init: RequestInit) {
    try {
        return await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
    }
    catch {
        throw new DeliveryError('provider_timeout', true, true);
    }
}
export async function deliver(job: DeliveryJob) {
    if (job.kind === 'owner' && process.env.WATCH_REQUEST_WEBHOOK_URL) {
        const response = await providerFetch(process.env.WATCH_REQUEST_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': job.id, ...(process.env.WATCH_REQUEST_WEBHOOK_BEARER ? { Authorization: `Bearer ${process.env.WATCH_REQUEST_WEBHOOK_BEARER}` } : {}) }, body: JSON.stringify({ requestId: job.inquiry_id, reference: job.public_reference, type: 'watch_request', ...job.payload }) });
        if (!response.ok)
            throw new DeliveryError(`webhook_${response.status}`, response.status === 429 || response.status >= 500, response.status >= 500);
        return `webhook:${job.inquiry_id}`;
    }
    const reference = job.public_reference || job.inquiry_id;
    const receipt = job.kind === 'receipt' || job.kind === 'update';
    const update = job.kind === 'update' || job.kind === 'operator_update';
    const portalUrl = `${process.env.TRACKING_SITE_URL || 'https://concierge.omnitimepieces.com'}/${job.kind === 'operator_update' ? 'private-desk' : 'request-status'}`;
    const message = update ? {
        subject: `${reference} — ${job.event?.title || 'Request update'}`,
        text: `${job.event?.message || 'Your request has an update.'}\n\nOpen your private dashboard: ${portalUrl}\nReference: ${reference}\nSign in with your request email. Documents are never attached to these notifications.`,
        html: `<!doctype html><html><body style="margin:0;padding:24px;background:${emailTheme.background};color:${emailTheme.text};font-family:Arial,sans-serif"><main style="max-width:680px;margin:auto;padding:28px;background:${emailTheme.surface};border-top:4px solid ${emailTheme.accent}"><h1 style="font-size:24px">${escapeHtml(job.event?.title || 'Request update')}</h1><p>${escapeHtml(job.event?.message || 'Your request has an update.')}</p><p><a href="${escapeHtml(portalUrl)}">Open your private dashboard</a></p><p>Reference: ${escapeHtml(reference)}</p><p>Documents are never attached to these notifications.</p></main></body></html>`,
    } : emailFor(job.payload, reference, job.kind as 'owner' | 'receipt');
    const response = await providerFetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.id }, body: JSON.stringify({ from: process.env.WATCH_REQUEST_FROM_EMAIL, to: receipt ? [job.payload.contact.email] : process.env.WATCH_REQUEST_TO_EMAIL!.split(',').map(v => v.trim()), reply_to: receipt ? (process.env.WATCH_REQUEST_REPLY_TO_EMAIL || process.env.WATCH_REQUEST_TO_EMAIL?.split(',')[0]) : job.payload.contact.email, ...message }) });
    if (!response.ok)
        throw new DeliveryError(`resend_${response.status}`, response.status === 429 || response.status >= 500, response.status >= 500);
    const result = await response.json().catch(() => null);
    if (!result?.id)
        throw new DeliveryError('provider_invalid_response', true, true);
    return result.id as string;
}
export async function sendFailureAlert(job: Pick<DeliveryJob, 'id' | 'inquiry_id' | 'kind'>, code: string) {
    try {
        const response = await providerFetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `alert:${job.id}` }, body: JSON.stringify({ from: process.env.WATCH_REQUEST_FROM_EMAIL, to: [process.env.WATCH_REQUEST_ALERT_EMAIL], subject: `Omni delivery needs attention: ${job.inquiry_id}`, text: `Delivery job ${job.id} stopped (${code}). Inspect the delivery dashboard and database. No customer details are included in this alert.` }) });
        if (!response.ok)
            console.error('delivery_alert_failed', { requestId: job.inquiry_id });
    }
    catch {
        console.error('delivery_alert_failed', { requestId: job.inquiry_id });
    }
}
