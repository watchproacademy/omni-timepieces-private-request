import {minorUnits,type CommercialSummary} from './commercial-document';
import type {OfferTerms} from './negotiation';

export type PaymentState='awaiting'|'submitted'|'changes_requested'|'cleared';
export type KycState='pending'|'more_information'|'approved'|'declined';
export type FulfilmentState='pending'|'shipped'|'delivered'|'closed';
export type TransactionStep='invoice'|'payment'|'kyc'|'dispatch'|'delivery'|'close'|'closed';
/** Separate evidence and manual decisions. A receipt image never means cleared funds. */
export type TransactionProgress={invoicePublished:boolean;payment:PaymentState;kyc:KycState;fulfilment:FulfilmentState};
export function transactionStep(progress:TransactionProgress):TransactionStep{
 if(progress.fulfilment==='closed')return 'closed';
 if(progress.fulfilment==='delivered')return 'close';
 if(progress.fulfilment==='shipped')return 'delivery';
 if(!progress.invoicePublished)return 'invoice';
 if(progress.payment!=='cleared')return 'payment';
 if(progress.kyc!=='approved')return 'kyc';
 return 'dispatch';
}
export const transactionStepLabels:Record<TransactionStep,string>={invoice:'Invoice & payment instructions',payment:'Payment',kyc:'Transaction review',dispatch:'Preparing dispatch',delivery:'Shipment',close:'Delivery confirmed',closed:'Request closed'};
export function canDispatch(progress:TransactionProgress){return progress.invoicePublished&&progress.payment==='cleared'&&progress.kyc==='approved'&&progress.fulfilment==='pending';}
/** Compare agreed financial terms, allowing invoice descriptions/issuance/due dates to differ. */
export function invoiceMatchesAgreement(invoice:CommercialSummary,offer:OfferTerms):boolean{
 if(invoice.currency!==offer.currency)return false;
 try{
  const financial=(terms:Pick<OfferTerms,'currency'|'lines'|'fees'|'total'|'paymentTerms'>)=>JSON.stringify({
   total:minorUnits(terms.total,terms.currency).toString(),paymentTerms:terms.paymentTerms.trim(),
   lines:terms.lines.map(line=>[line.watchId,line.quantity,minorUnits(line.unitPrice,terms.currency).toString()]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
   fees:terms.fees.map(fee=>[fee.label,minorUnits(fee.amount,terms.currency).toString()]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
  });
  return financial(invoice)===financial(offer);
 }catch{return false;}
}
/** Internal planning guidance only; no customer countdown or dispatch guarantee. */
export const internalTransactionTiming='Allow roughly 3 business days for manual KYC review and up to 7 business days overall from cleared funds to dispatch. These are flexible planning estimates; exceptions remain operator-controlled.';
