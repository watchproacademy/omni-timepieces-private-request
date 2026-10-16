import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transactionStep,canDispatch,invoiceMatchesAgreement,type TransactionProgress} from '../../src/lib/post-agreement';
import type {CommercialSummary} from '../../src/lib/commercial-document';
import type {OfferTerms} from '../../src/lib/negotiation';
const initial:TransactionProgress={invoicePublished:false,payment:'awaiting',kyc:'pending',fulfilment:'pending'};
test('payment evidence and customer submission never grant dispatch clearance',()=>{
 for(const payment of ['awaiting','submitted','changes_requested'] as const){assert.equal(transactionStep({...initial,invoicePublished:true,payment,kyc:'approved'}),'payment');assert.equal(canDispatch({...initial,invoicePublished:true,payment,kyc:'approved'}),false);}
});
test('only a published invoice, manually cleared funds and approved KYC permit dispatch',()=>{
 const complete:TransactionProgress={...initial,invoicePublished:true,payment:'cleared',kyc:'approved'};
 assert.equal(canDispatch(complete),true);assert.equal(transactionStep(complete),'dispatch');
 assert.equal(transactionStep({...complete,invoicePublished:false}),'invoice');assert.equal(canDispatch({...complete,invoicePublished:false}),false);
 for(const kyc of ['pending','more_information','declined'] as const){assert.equal(transactionStep({...complete,kyc}),'kyc');assert.equal(canDispatch({...complete,kyc}),false);}
});
test('delivery and request closure remain distinct manual milestones',()=>{
 assert.equal(transactionStep({...initial,fulfilment:'shipped'}),'delivery');assert.equal(transactionStep({...initial,fulfilment:'delivered'}),'close');assert.equal(transactionStep({...initial,fulfilment:'closed'}),'closed');
 assert.equal(canDispatch({...initial,invoicePublished:true,payment:'cleared',kyc:'approved',fulfilment:'shipped'}),false);
});
const offer:OfferTerms={currency:'USD',lines:[{watchId:'watch-1',description:'Agreed watch',quantity:2,unitPrice:'12500'}],fees:[{label:'Stated shipping',amount:'50'}],total:'25050',paymentTerms:'Bank transfer',paymentDueDate:'',deliveryTerms:'Dispatch after manual clearance'};
const invoice:CommercialSummary={...offer,lines:[{...offer.lines[0],description:'Invoice watch description',unitPrice:'12500.00'}],fees:[{label:'Stated shipping',amount:'50.00'}],total:'25050.00',balance:'',documentNumber:'SYNTHETIC-1',documentDate:'2026-10-14',paymentDueDate:'2026-10-21',issuedAt:'2026-10-14T12:00:00Z',timeZone:'UTC'};
test('invoice financial terms match immutable agreement despite formatting, description and invoice due date',()=>{assert.equal(invoiceMatchesAgreement(invoice,offer),true);});
test('currency, quantity, watch identity, item price, fees and total must match agreed financial terms',()=>{
 for(const changed of [{...invoice,currency:'EUR' as const},{...invoice,total:'25049'},{...invoice,paymentTerms:'Changed payment conditions'},{...invoice,fees:[]},{...invoice,lines:[{...invoice.lines[0],quantity:1}]},{...invoice,lines:[{...invoice.lines[0],watchId:'different-watch'}]},{...invoice,lines:[{...invoice.lines[0],unitPrice:'12499'}]}])assert.equal(invoiceMatchesAgreement(changed,offer),false);
 assert.equal(invoiceMatchesAgreement({...invoice,total:'not-an-amount'},offer),false);
});
