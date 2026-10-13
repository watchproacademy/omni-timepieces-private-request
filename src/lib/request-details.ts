import {z} from 'zod';
import {watchSchema,contactSchema} from './validation';
import {config} from './config';
export const detailContactSchema=z.object({fullName:contactSchema.shape.fullName,phone:contactSchema.shape.phone,location:contactSchema.shape.location,preferredContact:contactSchema.shape.preferredContact}).strict().superRefine((contact,ctx)=>{if(contact.preferredContact!=='Email'&&!contact.phone)ctx.addIssue({code:'custom',path:['phone'],message:'Add a phone number for the preferred contact method.'});});
export const requestDetailsSchema=z.object({watches:z.array(watchSchema.strict()).min(1).max(config.maxWatches),contact:detailContactSchema,conditionNotes:z.string().trim().max(3000),inspirationUrl:z.string().trim().max(2000).refine(value=>{if(!value)return true;try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}},'Use an http or https link.')}).strict().superRefine((details,ctx)=>{if(new Set(details.watches.map(w=>w.id)).size!==details.watches.length)ctx.addIssue({code:'custom',path:['watches'],message:'Each watch must retain its own identifier.'});});
export type RequestDetails=z.infer<typeof requestDetailsSchema>;
export type DetailChange={path:string;watchId?:string;before:unknown;after:unknown};
export function editableWatchDetails(watch:Record<string,unknown>):RequestDetails['watches'][number] {
 const fields=['id','brand','model','reference','year','dial','caseMaterial','bracelet','caseMaterialOther','braceletOther','occasion','condition','timeline','budget'];
 const selected:Record<string,unknown>=Object.fromEntries(fields.map(field=>[field,String(watch[field]??'')]));
 for(const field of ['budgetMin','budgetMax'])if(typeof watch[field]==='number')selected[field]=watch[field];
 return selected as RequestDetails['watches'][number];
}
export function editableDetails(payload:Record<string,unknown>):RequestDetails {
 const contact=payload.contact as Record<string,unknown>;
 return {watches:(payload.watches as Record<string,unknown>[]).map(editableWatchDetails),contact:{fullName:String(contact.fullName||''),phone:String(contact.phone||''),location:String(contact.location||''),preferredContact:String(contact.preferredContact||'') as RequestDetails['contact']['preferredContact']},conditionNotes:String(payload.conditionNotes||''),inspirationUrl:String(payload.inspirationUrl||'')};
}
export const detailFieldLabels:Record<string,string>={fullName:'Customer name',phone:'Phone',location:'Location',preferredContact:'Preferred contact',brand:'Brand',model:'Model',reference:'Reference',year:'Year',dial:'Dial',caseMaterial:'Case material',bracelet:'Bracelet',caseMaterialOther:'Specific case preference',braceletOther:'Specific bracelet preference',occasion:'Occasion',condition:'Condition preference',timeline:'Timeline',budget:'Sourcing budget preference',budgetMin:'Budget minimum',budgetMax:'Budget maximum',conditionNotes:'Additional preferences',inspirationUrl:'Inspiration link'};
