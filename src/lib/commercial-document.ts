import {z} from 'zod';

export const commercialCurrencies=['USD','EUR','GBP','CHF','CAD','AUD','JPY'] as const;
const amount=z.string().trim().regex(/^\d{1,12}(?:\.\d{1,2})?$/,'Enter a non-negative amount without currency symbols or separators.');
const date=z.string().refine(value=>{if(!value)return true;const parsed=new Date(value+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;},'Enter a valid calendar date.');
export const commercialFieldsSchema=z.object({
 documentNumber:z.string().trim().max(100),documentDate:date,
 currency:z.enum(commercialCurrencies),
 lines:z.array(z.object({watchId:z.string().min(1).max(100),description:z.string().trim().min(1).max(500),quantity:z.number().int().min(1).max(100),unitPrice:amount}).strict()).min(1).max(20),
 fees:z.array(z.object({label:z.string().trim().min(1).max(100),amount}).strict()).max(20),
 total:amount,balance:amount.or(z.literal('')),paymentTerms:z.string().trim().max(1000),paymentDueDate:date,
 issuedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/).refine(v=>Number.isFinite(Date.parse(v))),
 timeZone:z.string().max(80).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Choose an IANA timezone.'),
}).strict();
export const commercialDraftSchema=commercialFieldsSchema.extend({currency:z.enum(commercialCurrencies).or(z.literal('')),total:amount.or(z.literal('')),issuedAt:z.string().max(50),timeZone:z.string().max(80),issueOffset:z.string().max(6).optional(),fees:z.array(z.object({label:z.string().trim().max(100),amount:amount.or(z.literal(''))}).strict()).max(20),lines:z.array(z.object({watchId:z.string().max(100),description:z.string().trim().max(500),quantity:z.number().int().min(1).max(100),unitPrice:amount.or(z.literal(''))}).strict()).max(20)});
export type CommercialDraft=z.infer<typeof commercialDraftSchema>;
export const commercialSummarySchema=commercialFieldsSchema.superRefine((value,context)=>{
 try{
  const total=minorUnits(value.total,value.currency);
  const computed=value.lines.reduce((sum,line)=>sum+minorUnits(line.unitPrice,value.currency)*BigInt(line.quantity),0n)+value.fees.reduce((sum,fee)=>sum+minorUnits(fee.amount,value.currency),0n);
  if(total!==computed)context.addIssue({code:'custom',path:['total'],message:'Line items plus stated fees must equal the total. Review missing charges or corrections.'});
  if(value.balance&&minorUnits(value.balance,value.currency)>total)context.addIssue({code:'custom',path:['balance'],message:'Balance cannot exceed the total.'});
 }catch{context.addIssue({code:'custom',path:['currency'],message:'Amounts must match currency precision.'});}
});
export type CommercialSummary=z.infer<typeof commercialSummarySchema>;
export type ExtractionEvidence={field:string;page:number;text:string;confidence:'candidate'|'ambiguous'};
export type CommercialExtraction={status:'text'|'manual';fields:Partial<CommercialSummary>;evidence:ExtractionEvidence[];warnings:string[];pageCount:number};
export type CommercialDocument={id:string;fileId:string;kind:'quote'|'invoice';state:'draft'|'published'|'discarded';version:number;createdAt:string;publishedAt?:string;issuedAt?:string;expiresAt?:string|null;summary:CommercialSummary|null;draft?:CommercialDraft;extraction?:CommercialExtraction;status:'Draft'|'Published'|'Expired'|'Discarded'};
export function minorUnits(value:string,currency:string){const precision=currency==='JPY'?0:2;const [whole,fraction='']=value.split('.');if(!/^\d+$/.test(whole)||fraction.length>precision||!/^\d*$/.test(fraction))throw new Error('INVALID_AMOUNT');return BigInt(whole)*10n**BigInt(precision)+BigInt(fraction.padEnd(precision,'0')||'0');}
export function quoteExpiresAt(issuedAt:string){return new Date(Date.parse(issuedAt)+48*60*60*1000).toISOString();}
export function commercialStatus(doc:Pick<CommercialDocument,'kind'|'state'|'expiresAt'>,now=Date.now()):CommercialDocument['status']{if(doc.state==='discarded')return 'Discarded';if(doc.state==='draft')return 'Draft';return doc.kind==='quote'&&!!doc.expiresAt&&Date.parse(doc.expiresAt)<=now?'Expired':'Published';}
export function zonedTimestamp(value:string,timeZone:string){return new Intl.DateTimeFormat('en-GB',{timeZone,dateStyle:'medium',timeStyle:'long'}).format(new Date(value))+` (${timeZone})`;}
export function money(value:string,currency:string){return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(Number(value));}
/** Resolve a wall-clock time only when it identifies one instant; DST overlaps need an explicit UTC offset. */
export function confirmedIssueTimestamp(local:string,timeZone:string,offsetChoice=''){
 const choices=issueTimeChoices(local,timeZone);const candidates=choices.filter(value=>!offsetChoice||value.endsWith(offsetChoice));
 if(!candidates.length)throw new Error('This time does not exist in the chosen timezone, or the UTC offset does not match.');if(candidates.length>1)throw new Error('This time occurs twice when clocks change. Enter the confirmed UTC offset.');return candidates[0];
}
export function issueTimeChoices(local:string,timeZone:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(local))throw new Error('Enter the confirmed issue date and time.');
 const normalized=local.length===16?local+':00':local,guess=Date.parse(normalized+'Z');if(!Number.isFinite(guess))throw new Error('Enter a valid issue date and time.');
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const candidates:string[]=[];for(let offset=-14*60;offset<=14*60;offset+=15){const instant=guess-offset*60000,p=Object.fromEntries(formatter.formatToParts(instant).map(x=>[x.type,x.value]));if(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`===normalized){const sign=offset>=0?'+':'-',abs=Math.abs(offset),suffix=`${sign}${String(Math.floor(abs/60)).padStart(2,'0')}:${String(abs%60).padStart(2,'0')}`;candidates.push(normalized+suffix);}}
 return candidates.sort((a,b)=>Date.parse(a)-Date.parse(b));
}
export function latestPublishedDocument(documents:CommercialDocument[],watchId?:string){return documents.filter(doc=>doc.state==='published'&&doc.summary&&(!watchId||doc.summary.lines.some(line=>line.watchId===watchId))).sort((a,b)=>documentOrderTime(b)-documentOrderTime(a)||b.id.localeCompare(a.id))[0];}
function documentOrderTime(doc:CommercialDocument){for(const value of [doc.publishedAt,doc.issuedAt,doc.createdAt]){const time=value?Date.parse(value):NaN;if(Number.isFinite(time))return time;}return 0;}
export function customerCommercialGuidance(doc:CommercialDocument,now:number){return doc.kind==='invoice'?['Your invoice is available','Review the confirmed amounts and payment terms in your invoice.','A calendar payment due date is shown only when it was explicitly stated.']:commercialStatus(doc,now)==='Expired'?['Your quote has expired','Ask your Omni Timepieces private desk for an updated quote before proceeding.','Preparing an updated-quote request does not send a message.']:['Your quote is available','Review the confirmed details and exact expiry before proceeding.','Message your private desk if you would like to discuss the quote.'];}
