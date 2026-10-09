import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processDelivery, type WorkerDependencies } from '../../src/lib/server/worker';
import { DeliveryError } from '../../src/lib/server/delivery';
import { emailFor } from '../../src/lib/server/email';
import { conversionPayload, measurementAllowed } from '../../src/lib/analytics';
import { fixture } from './fixtures';
import type { DeliveryJob } from '../../src/lib/server/repository';
function worker(overrides: Partial<DeliveryJob> = {}) {
    const job: DeliveryJob = { id: 'WR-TEST:owner', inquiry_id: 'WR-TEST', kind: 'owner', state: 'sending', attempts: 1, first_attempt_at: new Date().toISOString(), lease_token: 'token', payload: fixture(), ...overrides };
    const events: string[] = [];
    const deps: WorkerDependencies = { claim: async () => job, send: async () => { events.push('send'); return 'provider-id'; }, complete: async () => { events.push('sent'); }, fail: async (_job, state) => { events.push(state); }, alert: async () => { events.push('alert'); }, now: Date.now };
    return { deps, events, job };
}
test('jobs complete independently; duplicate callbacks do not send again', async () => {
    const a = worker();
    await processDelivery(a.job.id, a.deps);
    assert.deepEqual(a.events, ['send', 'sent']);
    a.deps.claim = async () => null;
    await processDelivery(a.job.id, a.deps);
    assert.equal(a.events.length, 2);
    const receipt = worker({ kind: 'receipt' });
    await processDelivery(receipt.job.id, receipt.deps);
    assert.deepEqual(receipt.events, ['send', 'sent']);
});
test('temporary failures retry, permanent failures alert, and uncertain expired sends stop', async () => {
    const temporary = worker();
    temporary.deps.send = async () => { throw new DeliveryError('timeout', true, true); };
    await assert.rejects(processDelivery(temporary.job.id, temporary.deps));
    assert.deepEqual(temporary.events, ['pending']);
    const terminal = worker({ attempts: 6 });
    terminal.deps.send = temporary.deps.send;
    await processDelivery(terminal.job.id, terminal.deps);
    assert.deepEqual(terminal.events, ['ambiguous', 'alert']);
    const permanent = worker();
    permanent.deps.send = async () => { throw new DeliveryError('resend_403', false); };
    await processDelivery(permanent.job.id, permanent.deps);
    assert.deepEqual(permanent.events, ['failed', 'alert']);
    const stale = worker({ first_attempt_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() });
    await processDelivery(stale.job.id, stale.deps);
    assert.deepEqual(stale.events, ['ambiguous', 'alert']);
});
test('crash after sending leaves a retriable job with the same provider key', async () => { const w = worker(); w.deps.complete = async () => { throw new Error('write interrupted'); }; await assert.rejects(processDelivery(w.job.id, w.deps)); assert.deepEqual(w.events, ['send']); assert.equal(w.job.id, 'WR-TEST:owner'); });
test('emails escape customer content and include both text and HTML without purchase promises', () => { const payload = fixture(); payload.contact.fullName = '<img src=x onerror=alert(1)>'; const receipt = emailFor(payload, 'WR-TEST', 'receipt'); assert.ok(receipt.html.includes('&lt;img')); assert.ok(!receipt.html.includes('<img src=x')); assert.ok(receipt.text.includes('WR-TEST')); assert.ok(receipt.text.includes('not watch availability')); });
test('conversion carries no personal data and honors host and privacy signals', () => { assert.deepEqual(Object.keys(conversionPayload('WR-TEST')).sort(), ['currency', 'send_to', 'transaction_id', 'value']); assert.equal(measurementAllowed('preview.vercel.app', {}), false); assert.equal(measurementAllowed('concierge.omnitimepieces.com', { globalPrivacyControl: true }), false); assert.equal(measurementAllowed('concierge.omnitimepieces.com', { doNotTrack: '1' }), false); assert.equal(measurementAllowed('concierge.omnitimepieces.com', {}), true); });
test('provider adapters use independent recipient and deduplication keys; failures are categorized',async()=>{
 const {deliver}=await import('../../src/lib/server/delivery');const original=globalThis.fetch;const previous=process.env.WATCH_REQUEST_TO_EMAIL;const previousWebhook=process.env.WATCH_REQUEST_WEBHOOK_URL;delete process.env.WATCH_REQUEST_WEBHOOK_URL;process.env.WATCH_REQUEST_TO_EMAIL='owner@example.com';
 const sent:{headers:Headers;body:Record<string,unknown>}[]=[];
 try{
 globalThis.fetch=async(_input,init)=>{sent.push({headers:new Headers(init?.headers),body:JSON.parse(String(init?.body))});return Response.json({id:'provider-test'});};
 const owner=worker();const receipt=worker({kind:'receipt',id:'WR-TEST:receipt'});await deliver(owner.job);await deliver(receipt.job);
 assert.deepEqual(sent[0].body.to,['owner@example.com']);assert.deepEqual(sent[1].body.to,['test@example.com']);assert.equal(sent[0].headers.get('idempotency-key'),'WR-TEST:owner');assert.equal(sent[1].headers.get('idempotency-key'),'WR-TEST:receipt');
 globalThis.fetch=async()=>{throw new DOMException('Timed out','TimeoutError');};await assert.rejects(deliver(owner.job),e=>e instanceof DeliveryError&&e.ambiguous&&e.retryable);
 globalThis.fetch=async()=>new Response('',{status:429});await assert.rejects(deliver(owner.job),e=>e instanceof DeliveryError&&e.retryable);
 globalThis.fetch=async()=>new Response('',{status:403});await assert.rejects(deliver(owner.job),e=>e instanceof DeliveryError&&!e.retryable);
 }finally{globalThis.fetch=original;if(previous===undefined)delete process.env.WATCH_REQUEST_TO_EMAIL;else process.env.WATCH_REQUEST_TO_EMAIL=previous;if(previousWebhook!==undefined)process.env.WATCH_REQUEST_WEBHOOK_URL=previousWebhook;}
});
