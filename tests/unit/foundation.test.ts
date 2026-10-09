import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reducer, payloadFor } from '../../src/lib/state';
import { requestSchema } from '../../src/lib/validation';
import { restoreDraft, prefill } from '../../src/lib/storage';
import { resolveTheme } from '../../src/lib/theme';
import { referencesFor, profileForBrand, wearingOptionsFor } from '../../src/lib/catalog';
import { interpretWatchBrief } from '../../src/lib/assistant';
import { fixture } from './fixtures';
test('every requested watch is validated; phone-only, missing consent, unsafe links, and invalid budgets fail', () => {
    const valid = fixture();
    assert.ok(requestSchema.safeParse(valid).success);
    for (const invalid of [{ ...valid, watches: [...valid.watches, { ...valid.watches[0], id: 'second', model: '' }] }, { ...valid, contact: { ...valid.contact, email: '' } }, { ...valid, contact: { ...valid.contact, preferredContact: 'WhatsApp', phone: '' } }, { ...valid, consent: false }, { ...valid, inspirationUrl: 'javascript:alert(1)' }, { ...valid, watches: [{ ...valid.watches[0], budget: 'Custom', budgetMin: 200, budgetMax: 100 }] }])
        assert.equal(requestSchema.safeParse(invalid).success, false);
});
test('switching, editing, removing, and resetting watches keeps one coherent payload', () => {
    let state = initialState();
    state = reducer(state, { type: 'watch/update', id: 'initial-watch', patch: { brand: 'Rolex' } });
    state = reducer(state, { type: 'watch/update', id: 'initial-watch', patch: { model: 'Daytona' } });
    state = reducer(state, { type: 'watch/update', id: 'initial-watch', patch: { reference: '126500LN', dial: 'Blue' } });
    state = reducer(state, { type: 'watch/add', id: 'second' });
    state = reducer(state, { type: 'watch/switch', id: 'initial-watch' });
    state = reducer(state, { type: 'watch/update', id: 'initial-watch', patch: { model: 'Datejust' } });
    assert.equal(state.watches[0].reference, '');
    assert.equal(state.watches[0].dial, '');
    assert.equal(payloadFor(state).watches.length, 2);
    state = reducer(state, { type: 'watch/remove', id: 'initial-watch' });
    assert.equal(state.activeWatchId, 'second');
    state = reducer(state, { type: 'watch/remove', id: 'second' });
    assert.equal(state.watches.length, 1);
    assert.equal(reducer(state, { type: 'reset', key: 'key' }).watches[0].brand, '');
});
test('legacy drafts migrate edited watch, discard malformed input, clamp indexes and recheck consent', () => {
    assert.equal(restoreDraft('{'), null);
    assert.equal(restoreDraft('{}'), null);
    const restored = restoreDraft(JSON.stringify({ step: 99, values: { brand: 'Rolex', model: 'Daytona', email: 'client@example.com', consent: true }, watches: [{ brand: 'Rolex', model: 'Datejust' }], activeWatchIndex: 99, tradeIns: [] }));
    assert.ok(restored);
    assert.equal(restored.watches[0].model, 'Daytona');
    assert.equal(restored.step, 8);
    assert.equal(restored.consent, false);
    const next = prefill(restored, new URLSearchParams('brand=Omega&model=Speedmaster&utm_source=search'));
    assert.equal(next.watches[0].brand, 'Omega');
    assert.equal(next.watches[0].model, 'Speedmaster');
    assert.equal(next.attribution.utm_source, 'search');
});
test('catalogs remain model aware and guide remains local', () => {
    assert.ok(referencesFor('Rolex', 'Daytona').includes('126500LN'));
    assert.ok(!referencesFor('Rolex', 'Daytona').includes('124060'));
    assert.ok(wearingOptionsFor(profileForBrand('Rolex'), 'GMT-Master II').includes('Jubilee bracelet'));
    const result = interpretWatchBrief('A blue Rolex GMT-Master II on Jubilee pre-owned under $30k');
    assert.equal(result.brand, 'Rolex');
    assert.equal(result.model, 'GMT-Master II');
    assert.equal(result.budgetMax, 30000);
});
test('theme follows system unless explicitly overridden', () => { assert.equal(resolveTheme('system', true), 'dark'); assert.equal(resolveTheme('light', true), 'light'); assert.equal(resolveTheme('dark', false), 'dark'); assert.equal(resolveTheme('corrupt', false), 'light'); });
test('V4 restoration preserves provider idempotency inputs and active trade selection',()=>{
 const state=initialState();state.watches[0].id='original-watch';state.activeWatchId='original-watch';state.submissionKey='stable-submission-key';state.trades=[{id:'original-trade',brand:'Rolex',model:'Submariner',reference:'',year:'',dial:'',bracelet:'',condition:'Good',set:'Watch only',setOther:'',currency:'USD'}];state.activeTradeId='original-trade';
 const restored=restoreDraft(JSON.stringify({version:4,state}));assert.ok(restored);assert.equal(restored.watches[0].id,'original-watch');assert.equal(restored.trades[0].id,'original-trade');assert.equal(restored.submissionKey,'stable-submission-key');
});
test('storage denial is optional and malformed future drafts do not become a request',()=>{assert.equal(restoreDraft(JSON.stringify({version:999,state:{}})),null);});
test('trade configuration resets centrally and duplicate draft identifiers are discarded',()=>{
 let state=initialState();state=reducer(state,{type:'trade/add',id:'trade'});state=reducer(state,{type:'trade/update',id:'trade',patch:{brand:'Rolex'}});state=reducer(state,{type:'trade/update',id:'trade',patch:{model:'Daytona'}});state=reducer(state,{type:'trade/update',id:'trade',patch:{reference:'126500LN',dial:'White'}});state=reducer(state,{type:'trade/update',id:'trade',patch:{model:'Datejust'}});
 assert.equal(state.trades[0].reference,'');assert.equal(state.trades[0].dial,'');state.watches.push({...state.watches[0]});assert.equal(restoreDraft(JSON.stringify({version:4,state})),null);
});
test('specific trade presentation requires a description on the authoritative schema',()=>{
 const base=fixture();const trade={id:'trade',brand:'Rolex',model:'Datejust',reference:'',year:'',dial:'',bracelet:'',condition:'Good',set:'Other / not sure',setOther:'',currency:'USD'};
 assert.equal(requestSchema.safeParse({...base,tradeIn:'Yes',tradeIns:[trade]}).success,false);
 assert.equal(requestSchema.safeParse({...base,tradeIn:'Yes',tradeIns:[{...trade,setOther:'Original box, no papers'}]}).success,true);
});
