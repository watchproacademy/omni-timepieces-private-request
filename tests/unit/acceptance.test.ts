import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleSubmission, type AcceptanceDependencies } from '../../src/lib/server/acceptance';
import { fixture } from './fixtures';
const key = 'test-submission-key-123456';
function request(body: unknown = fixture(), headers: Record<string, string> = {}) { return new Request('https://concierge.omnitimepieces.com/api/watch-request', { method: 'POST', headers: { origin: 'https://concierge.omnitimepieces.com', 'content-type': 'application/json', 'idempotency-key': key, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }); }
function deps(accept: AcceptanceDependencies['accept'] = async () => ({ requestId: 'WR-TEST', duplicate: false })): AcceptanceDependencies { return { environment: () => ({ production: true, preview: false }), accept, publish: () => { } }; }
test('only persisted inquiries are accepted and duplicates return the same ID', async () => {
    let called = 0;
    const dependency = deps(async () => ({ requestId: 'WR-TEST', duplicate: called++ > 0 }));
    let published = 0;
    dependency.publish = () => { published++; };
    for (const expected of [202, 200]) {
        const response = await handleSubmission(request(), dependency);
        assert.equal(response.status, expected);
        assert.equal((await response.json()).requestId, 'WR-TEST');
    }
    assert.equal(published, 2);
    const failed = await handleSubmission(request(), deps(async () => { throw new Error('database offline'); }));
    assert.equal(failed.status, 503);
});
test('validates origin, content type, JSON, payload size, honeypot, and complete schemas before saving', async () => {
    let saved = 0;
    const dependency = deps(async () => { saved++; return { requestId: 'ID', duplicate: false }; });
    const scenarios: [
        Request,
        number
    ][] = [[request(fixture(), { origin: 'https://attacker.test' }), 403], [request(fixture(), { 'content-type': 'text/plain' }), 415], [request('{'), 400], [request(' '.repeat(30001)), 413], [request({ ...fixture(), website: 'bot' }), 400], [request({ ...fixture(), consent: false }), 400]];
    for (const [req, status] of scenarios)
        assert.equal((await handleSubmission(req, dependency)).status, status);
    assert.equal(saved, 0);
});
test('conflicting idempotency and throttling are explicit; previews never save', async () => {
    for (const [message, status] of [['IDEMPOTENCY_CONFLICT', 409], ['RATE_LIMITED', 429]] as const)
        assert.equal((await handleSubmission(request(), deps(async () => { throw new Error(message); }))).status, status);
    const dependency = deps(async () => { throw new Error('must not save'); });
    dependency.environment = () => ({ production: false, preview: true });
    const response = await handleSubmission(request(), dependency);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).preview, true);
    dependency.environment = () => ({ production: true, preview: true });
    assert.equal((await handleSubmission(request(), dependency)).status, 503);
});
test('queue publication failures do not turn a durably saved request into an unsuccessful response',async()=>{
 const dependency=deps();dependency.publish=()=>{throw new Error('queue offline');};
 const response=await handleSubmission(request(),dependency);assert.equal(response.status,202);assert.equal((await response.json()).status,'accepted');
});
test('same-origin check uses the addressed HTTP host when Next normalizes its internal URL',async()=>{
 const req=new Request('http://localhost:3100/api/watch-request',{method:'POST',headers:{host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100','content-type':'application/json','idempotency-key':key},body:JSON.stringify(fixture())});
 assert.equal((await handleSubmission(req,deps())).status,202);
});
