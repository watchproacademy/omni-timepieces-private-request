import {z} from 'zod';
import {commercialCurrencies,minorUnits,type CommercialSummary} from './commercial-document';

export type OfferTerms=Pick<CommercialSummary,'currency'|'lines'|'fees'|'total'|'paymentTerms'|'paymentDueDate'> & {deliveryTerms:string};
export type Offer={id:string;documentId:string;sourceDocumentVersion:number;sourceContentHash:string;parentId:string|null;revision:number;version:number;kind:'quote'|'counter';state:'pending'|'accepted'|'rejected'|'countered'|'superseded';terms:OfferTerms;sourceSummary:CommercialSummary;termsHash:string;expiresAt:string;createdAt:string;operatorAssentedAt:string|null;customerAssentedAt:string|null;decidedAt:string|null;actor:string;reason:string;};
export type OfferEvent={offerId:string;action:string;actor:string;identity:string;reason:string;createdAt:string;revision:number;termsHash:string};
const amount=z.string().trim().regex(/^\d{1,12}(?:\.\d{1,2})?$/);
export const negotiationInput=z.object({requestId:z.string().min(1).max(100),offerId:z.string().uuid(),version:z.number().int().nonnegative(),key:z.string().uuid(),action:z.enum(['publish','accept','reject','counter']),confirmed:z.boolean(),reason:z.string().trim().max(500),documentId:z.string().uuid().optional(),deliveryTerms:z.string().trim().max(1000).optional(),prices:z.array(amount).min(1).max(20).optional()}).strict().superRefine((value,ctx)=>{
 if(!value.confirmed)ctx.addIssue({code:'custom',message:'Confirm the exact terms before continuing.'});
 if(value.action==='publish'&&(!value.documentId||!value.deliveryTerms))ctx.addIssue({code:'custom',message:'Choose the source quote and state delivery terms, including any uncertainties.'});
 if(value.action==='counter'&&!value.prices)ctx.addIssue({code:'custom',message:'Enter a unit price for every item.'});
 if(value.action==='reject'&&!value.reason)ctx.addIssue({code:'custom',message:'Enter a reason for declining this revision.'});
});
export function counterTerms(source:OfferTerms,prices:string[]):OfferTerms{
 if(prices.length!==source.lines.length||!commercialCurrencies.includes(source.currency))throw new Error('INVALID_INPUT');
 const lines=source.lines.map((line,index)=>({...line,unitPrice:prices[index]}));
 const total=lines.reduce((sum,line)=>sum+minorUnits(line.unitPrice,source.currency)*BigInt(line.quantity),0n)+source.fees.reduce((sum,fee)=>sum+minorUnits(fee.amount,source.currency),0n);
 if(total>minorUnits(source.currency==='JPY'?'999999999999':'999999999999.99',source.currency))throw new Error('INVALID_INPUT');
 if(lines.every((line,index)=>minorUnits(line.unitPrice,source.currency)===minorUnits(source.lines[index].unitPrice,source.currency)))throw new Error('UNCHANGED_COUNTER');
 const precision=source.currency==='JPY'?0:2,scale=10n**BigInt(precision);
 const formatted=precision?`${total/scale}.${String(total%scale).padStart(precision,'0')}`:String(total);
 return {...source,lines,total:formatted};
}
export function offerState(offer:Pick<Offer,'state'|'expiresAt'>,now=Date.now()){return offer.state==='pending'&&Date.parse(offer.expiresAt)<=now?'expired':offer.state;}
export const offerLabels={pending:'Awaiting decision',accepted:'Offer accepted',rejected:'Declined',countered:'Counter submitted',expired:'Expired',superseded:'Superseded'};
