import type {CommercialExtraction,ExtractionEvidence} from '../commercial-document';

type TextItem={str:string;transform:number[];width:number};
/** Interpret only explicit labels and priced table rows. Captions and images are never line-item evidence. */
export function extractCommercialText(pages:string[]):CommercialExtraction {
 const fields:CommercialExtraction['fields']={},evidence:ExtractionEvidence[]=[],warnings:string[]=[];
 const candidates=new Map<string,{value:string;page:number;text:string}[]>();
 const add=(field:string,value:string,page:number,text:string)=>{const list=candidates.get(field)||[];list.push({value,page,text:text.slice(0,500)});candidates.set(field,list);};
 const money='([0-9][0-9,]*(?:\\.[0-9]{1,2})?)';
 for(const [index,page] of pages.entries()){let table=false;for(const raw of page.split('\n')){
  const line=raw.trim().replace(/\s+/g,' '),number=index+1;let match:RegExpMatchArray|null;
  if(/(?:description|item|product)/i.test(line)&&/qty|quantity/i.test(line)&&/price|amount|rate|total/i.test(line))table=true;
  if(/^(?:photo|image|supporting|bank|payment instructions|terms)/i.test(line))table=false;
  if((match=line.match(/^(?:invoice|quote|quotation)\s*(?:number|no\.?|#)\s*[:#]?\s*(\S.{0,90})$/i)))add('documentNumber',match[1],number,line);
  if((match=line.match(/^(?:(?:invoice|quote|document)\s+)?date\s*:?\s*(.+)$/i)))add('documentDate',match[1],number,line);
  if((match=line.match(/^(?:payment\s+)?terms\s*:?\s*(.+)$/i)))add('paymentTerms',match[1],number,line);
  if((match=line.match(/^(?:payment\s+)?due\s+date\s*:?\s*(.+)$/i)))add('paymentDueDate',match[1],number,line);
  if((match=line.match(new RegExp('^(?:invoice |quote |grand )?total\\s*:?\\s*(USD|EUR|GBP|CHF|CAD|AUD|JPY)?\\s*[$€£¥]?\\s*'+money+'\\s*(USD|EUR|GBP|CHF|CAD|AUD|JPY)?$','i')))){add('total',match[2].replace(/,/g,''),number,line);if(match[1]||match[3])add('currency',(match[1]||match[3]).toUpperCase(),number,line);}
  if((match=line.match(new RegExp('^(?:balance(?: due)?|amount due)\\s*:?\\s*(USD|EUR|GBP|CHF|CAD|AUD|JPY)?\\s*[$€£¥]?\\s*'+money+'\\s*(USD|EUR|GBP|CHF|CAD|AUD|JPY)?$','i')))){add('balance',match[2].replace(/,/g,''),number,line);if(match[1]||match[3])add('currency',(match[1]||match[3]).toUpperCase(),number,line);}
  if((match=line.match(/^(?:currency)\s*:?\s*(USD|EUR|GBP|CHF|CAD|AUD|JPY)$/i)))add('currency',match[1].toUpperCase(),number,line);
  if((match=line.match(new RegExp('^(shipping|tax|service fee|handling fee|fees?)\\s*:?\\s*(USD|EUR|GBP|CHF|CAD|AUD|JPY)?\\s*[$€£¥]?\\s*'+money+'\\s*(USD|EUR|GBP|CHF|CAD|AUD|JPY)?$','i')))){fields.fees=[...(fields.fees||[]),{label:match[1],amount:match[3].replace(/,/g,'')}];evidence.push({field:`fees.${fields.fees.length-1}`,page:number,text:line,confidence:'candidate'});if(match[2]||match[4])add('currency',(match[2]||match[4]).toUpperCase(),number,line);}
  // Require description, explicit quantity, unit price AND line amount. No parsing of photo captions.
  if(table&&(match=line.match(new RegExp('^(.{3,400}?)\\s+(?:qty\\s*:?\\s*)?(\\d{1,3})\\s+(?:(USD|EUR|GBP|CHF|CAD|AUD|JPY)\\s*)?[$€£¥]?'+money+'\\s+(?:(USD|EUR|GBP|CHF|CAD|AUD|JPY)\\s*)?[$€£¥]?'+money+'$','i')))&&! /^(?:total|balance|amount|subtotal|tax|shipping|fees?|discount|page|photo|image)/i.test(match[1])){
   const quantity=Number(match[2]),unitPrice=match[4].replace(/,/g,''),lineTotal=match[6].replace(/,/g,'');
   if((fields.lines?.length||0)>=20){warnings.push('More than 20 priced rows. Review manually; do not approve an incomplete item list.');continue;}
   if(quantity>0&&Math.abs(Number(unitPrice)*quantity-Number(lineTotal))<0.001){fields.lines=[...(fields.lines||[]),{watchId:'',description:match[1],quantity,unitPrice}];evidence.push({field:`lines.${fields.lines.length-1}`,page:number,text:line.slice(0,500),confidence:'candidate'});if(match[3]||match[5])add('currency',(match[3]||match[5]).toUpperCase(),number,line);}else warnings.push(`Page ${number}: a priced row does not reconcile; enter it manually.`);
  }
 }}
 for(const [field,list] of candidates){const unique=[...new Set(list.map(x=>x.value))];for(const candidate of list)evidence.push({field,page:candidate.page,text:candidate.text,confidence:unique.length===1?'candidate':'ambiguous'});if(unique.length!==1){warnings.push(`Conflicting ${field} values. Review the source.`);continue;}let value=unique[0];if(field.endsWith('Date')){value=explicitDate(value);if(!value){warnings.push(`${field}: date is missing or ambiguous. Enter it manually.`);continue;}}Object.assign(fields,{[field]:value});}
 for(const field of ['documentDate','currency','lines','total','balance','paymentTerms','paymentDueDate'])if(!fields[field as keyof typeof fields])warnings.push(`${field}: not reliably extracted.`);
 warnings.push('Issue time and timezone require operator confirmation. Fees are not inferred. Every candidate needs review.');
 const hasText=pages.some(page=>page.trim().length>20);if(!hasText)warnings.unshift('No usable text layer. Scanned/image documents require manual entry; OCR is not enabled.');
 return {status:hasText?'text':'manual',fields,evidence:evidence.slice(0,150),warnings:[...new Set(warnings),...(evidence.length>150?['Evidence list is limited. Review the full original before approving.']:[])],pageCount:pages.length};
}
function explicitDate(value:string){if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value)return value;const named=value.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);if(!named)return '';const month=['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(named[1].toLowerCase());if(month<0)return '';const result=`${named[3]}-${String(month+1).padStart(2,'0')}-${named[2].padStart(2,'0')}`;return new Date(result+'T00:00:00Z').toISOString().slice(0,10)===result?result:'';}
export async function extractCommercialPdf(bytes:Buffer):Promise<CommercialExtraction>{
 // Data-only parser. No PDF URLs, actions, embedded scripts, remote fonts or OCR services are executed.
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:false,disableFontFace:true,verbosity:0});
 const timer=setTimeout(()=>{void task.destroy();},10000);
 try{const doc=await task.promise;if(doc.numPages>20)throw new Error('PDF_PAGE_LIMIT');const pages:string[]=[];let characters=0;
  for(let number=1;number<=doc.numPages;number++){const page=await doc.getPage(number),content=await page.getTextContent();const rows=new Map<number,TextItem[]>();for(const item of content.items){if(!('str' in item))continue;const key=Math.round(item.transform[5]/3)*3;rows.set(key,[...(rows.get(key)||[]),item as TextItem]);}const lines=[...rows.entries()].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.transform[4]-b.transform[4]).map(item=>item.str).join(' ').replace(/\s+/g,' '));const text=lines.join('\n');characters+=text.length;if(characters>100000)throw new Error('PDF_TEXT_LIMIT');pages.push(text);page.cleanup();}return extractCommercialText(pages);
 }catch{return {status:'manual',fields:{},evidence:[],warnings:['PDF text could not be read safely. Review the original and enter details manually.'],pageCount:0};}finally{clearTimeout(timer);await task.destroy();}
}
