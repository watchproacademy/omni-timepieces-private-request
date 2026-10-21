import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tradeYearsFor, yearsFor, yearPreferences} from '../../src/lib/catalog';
import {blankTrade, initialState, payloadFor, reducer} from '../../src/lib/state';
import {legacyPhoneSchema, tradeSchema} from '../../src/lib/validation';

test('trade suggestions describe an owned watch and purchase preferences stay separate', () => {
    const years = tradeYearsFor(2026);
    assert.equal(years[0], 'Unknown');
    assert.ok(years.includes('2026'));
    assert.ok(years.includes('1950'));
    assert.ok(!years.includes('Current production'));
    assert.ok(!years.includes('Any year'));
    assert.deepEqual(yearsFor(2026).slice(0, 3), ['Current production', 'Any year', '2026']);
    assert.deepEqual(yearPreferences.map(option => option.value), ['2024 and newer', '2025 and newer', '2026 and newer']);
});

test('manual older trade years and Unknown survive validation and payload creation', () => {
    for (const year of ['1890', '1937', '2026', 'Unknown', '']) {
        const trade = {...blankTrade('trade'), brand:'Omega', model:'Pocket watch', year, condition:'Good', set:'Watch only'};
        const parsed = tradeSchema.parse(trade);
        let state = reducer(initialState(), {type:'trade/add', id:'trade'});
        state = reducer(state, {type:'trade/update', id:'trade', patch:parsed});
        assert.equal(payloadFor(state).tradeIns[0].year, year);
    }
});

test('phone starts empty and international values are retained without a country default', () => {
    assert.equal(initialState().contact.phone, '');
    for (const phone of ['+1 202 555 0100', '+971 50 123 4567', '+81 3-1234-5678', '0044 20 7946 0958']) {
        const state = reducer(initialState(), {type:'contact/update', patch:{phone}});
        assert.equal(payloadFor(state).contact.phone, phone);
        assert.equal(legacyPhoneSchema.parse(phone), phone);
    }
    const invalid = legacyPhoneSchema.safeParse('invalid');
    assert.equal(invalid.success, false);
    if (!invalid.success) assert.equal(invalid.error.issues[0].message, 'Enter a valid phone number with country code.');
});
