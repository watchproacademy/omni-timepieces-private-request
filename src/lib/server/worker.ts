import { claimJob, completeJob, failJob, type DeliveryJob } from './repository';
import { deliver, DeliveryError, sendFailureAlert } from './delivery';
export type WorkerDependencies = {
    claim: typeof claimJob;
    complete: typeof completeJob;
    fail: typeof failJob;
    send: typeof deliver;
    alert: typeof sendFailureAlert;
    now: () => number;
};
const defaults: WorkerDependencies = { claim: claimJob, complete: completeJob, fail: failJob, send: deliver, alert: sendFailureAlert, now: Date.now };
export function retryDelay(attempt: number) { return Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1)); }
export async function processDelivery(id: string, deps: WorkerDependencies = defaults) {
    const job = await deps.claim(id);
    if (!job)
        return;
    // Provider-side idempotency expires after 24h; never automatically replay an uncertain send after it.
    if (job.first_attempt_at && deps.now() - new Date(job.first_attempt_at).getTime() >= 23 * 60 * 60 * 1000) {
        await deps.fail(job, 'ambiguous', 'deduplication_window_expired', 0);
        await deps.alert(job, 'deduplication_window_expired');
        return;
    }
    let providerId: string;
    try {
        providerId = await deps.send(job);
    }
    catch (error) {
        const issue = error instanceof DeliveryError ? error : new DeliveryError('delivery_unavailable', true, true);
        const terminal = !issue.retryable || job.attempts >= 6;
        await deps.fail(job, terminal ? (issue.ambiguous ? 'ambiguous' : 'failed') : 'pending', issue.code, retryDelay(job.attempts));
        if (terminal) {
            await deps.alert(job, issue.code);
            return;
        }
        throw new Error('retry_delivery');
    }
    // If this write fails, the lease expires and the same provider key is safely retried.
    await deps.complete(job, providerId);
}
export function safeJobReference(job: DeliveryJob) { return { id: job.id, inquiry_id: job.inquiry_id, kind: job.kind }; }
