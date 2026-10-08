const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync('ads-measurement.js', 'utf8');
function setup(hostname = 'concierge.omnitimepieces.com', privacy = {}) {
  const events = {}, scripts = [];
  const window = { location: {hostname}, addEventListener: (name, cb) => events[name] = cb };
  vm.runInNewContext(code, { window, navigator: privacy, document: {createElement: () => ({}), head: {appendChild: s => scripts.push(s)}}, Set, Date });
  return {scripts, send: detail => events['omni:funnel']?.({detail}), conversions: () => (window.dataLayer || []).map(x => Array.from(x)).filter(x => x[0] === 'event')};
}
test('only delivered requests count, and duplicates and previews do not', () => {
  const s = setup();
  for (const detail of [
    {event:'private_request_submit_attempted'},
    {event:'private_request_submit_failed'},
    {event:'private_request_submitted',preview:true,requestId:'demo'},
    {event:'private_request_submitted',preview:false},
    {event:'private_request_submitted',requestId:'unknown'},
  ]) s.send(detail);
  assert.equal(s.conversions().length, 0);
  const lead = {event:'private_request_submitted', preview:false, requestId:'WR-TEST-123', email:'private@example.com', fullName:'Private Client'};
  s.send(lead); s.send(lead);
  assert.equal(s.conversions().length, 1);
  const payload = s.conversions()[0][2];
  assert.deepEqual(Object.keys(payload).sort(), ['currency','send_to','transaction_id','value']);
  assert.equal(payload.transaction_id, 'WR-TEST-123');
  assert.equal(payload.value, 0);
});
test('preview hosts and privacy signals do not load the Google tag', () => {
  for (const s of [setup('localhost'),setup('preview.vercel.app'),setup(undefined,{globalPrivacyControl:true}),setup(undefined,{doNotTrack:'1'})]) assert.equal(s.scripts.length,0);
  assert.equal(setup().scripts.length,1);
});
