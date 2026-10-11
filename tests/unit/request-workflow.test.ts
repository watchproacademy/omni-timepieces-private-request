import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestStages,canReadNote,migrateRequestStage} from '../../src/lib/request-workflow';
test('independent workflow separates quotes, invoices, payment and transaction review',()=>{
 assert.ok(requestStages.indexOf('quote_sent') < requestStages.indexOf('invoice_sent'));
 assert.ok(requestStages.indexOf('paid') < requestStages.indexOf('verification'));
 assert.ok(requestStages.indexOf('verification') < requestStages.indexOf('shipped'));
 assert.equal(migrateRequestStage('quoted'),'quote_sent');
 assert.equal(migrateRequestStage('unknown'),'received');
});
test('internal notes are never customer-visible',()=>{
 assert.equal(canReadNote('customer','internal'),false);
 assert.equal(canReadNote('customer','customer'),true);
 assert.equal(canReadNote('owner','internal'),true);
});
