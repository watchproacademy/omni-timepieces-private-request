import { z } from 'zod';
import { choices, config } from './config';
const short = z.string().trim().max(150);
const required = short.min(1, 'This detail is required.');
const positive = z.number().finite().positive().max(100000000);
const phone = z.string().trim().max(40).refine(v => !v || /^\+?[\d\s().-]{7,40}$/.test(v) && v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number.');
export const watchSchema = z.object({
    id: z.string().min(1).max(80), brand: required.refine(v => v !== 'Other', 'Enter the brand name.'), model: required,
    reference: short, year: short, dial: short, caseMaterial: short, bracelet: short,
    caseMaterialOther: short, braceletOther: short,
    occasion: z.enum(choices.occasion), condition: z.enum(choices.condition), timeline: z.enum(choices.timeline),
    budget: z.enum(choices.budget), budgetMin: z.number().finite().min(0).max(100000000).optional(), budgetMax: positive.optional(),
}).superRefine((watch, ctx) => {
    if (watch.budget === 'Custom') {
        if (!watch.budgetMax)
            ctx.addIssue({ code: 'custom', path: ['budgetMax'], message: 'Add the top of your preferred range.' });
        if (watch.budgetMax && (watch.budgetMin || 0) > watch.budgetMax)
            ctx.addIssue({ code: 'custom', path: ['budgetMin'], message: 'The starting amount must not exceed the maximum.' });
    }
    for (const [field, other] of [['caseMaterial', 'caseMaterialOther'], ['bracelet', 'braceletOther']] as const) {
        if (/other|specific/i.test(watch[field]) && !watch[other])
            ctx.addIssue({ code: 'custom', path: [other], message: 'Describe your specific preference.' });
    }
});
export const tradeSchema = z.object({
    id: required, brand: required.refine(v => v !== 'Other', 'Enter the brand name.'), model: required, reference: short, year: short, dial: short, bracelet: short,
    condition: z.enum(choices.tradeCondition), set: z.enum(choices.tradeSet), setOther: short,
    expectedValue: positive.optional(), currency: z.literal(config.currency),
}).superRefine((trade,ctx)=>{
    if(trade.set === 'Other / not sure' && !trade.setOther) ctx.addIssue({code:'custom',path:['setOther'],message:'Describe what is included with your trade.'});
});
export const contactSchema = z.object({
    fullName: required, email: z.string().trim().max(254).email('Enter a valid email address.'), phone,
    location: required, preferredContact: z.enum(choices.preferredContact),
}).superRefine((contact, ctx) => {
    if (contact.preferredContact !== 'Email' && !contact.phone)
        ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Add a phone number for your preferred contact method.' });
});
const safeUrl = z.string().trim().max(2000).refine(value => {
    if (!value)
        return true;
    try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
    }
    catch {
        return false;
    }
}, 'Use an http or https link.');
export const requestSchema = z.object({
    schemaVersion: z.literal(4), watches: z.array(watchSchema).min(1).max(config.maxWatches),
    tradeIn: z.enum(['Yes', 'No']), tradeIns: z.array(tradeSchema).max(config.maxTrades),
    contact: contactSchema, consent: z.literal(true, { error: 'Confirm that we may contact you.' }),
    currency: z.literal(config.currency), conditionNotes: z.string().trim().max(3000), inspirationUrl: safeUrl,
    attribution: z.object({ utm_source: short, utm_medium: short, utm_campaign: short, utm_content: short, utm_term: short, landingPage: z.string().max(2000) }),
    website: z.string().max(200).optional(),
}).superRefine((request, ctx) => {
    if (request.tradeIn === 'Yes' && !request.tradeIns.length)
        ctx.addIssue({ code: 'custom', path: ['tradeIns'], message: 'Add your trade details.' });
    if (request.tradeIn === 'No' && request.tradeIns.length)
        ctx.addIssue({ code: 'custom', path: ['tradeIns'], message: 'Remove trades or choose Yes.' });
    const ids = [...request.watches, ...request.tradeIns].map(item => item.id);
    if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: 'custom', path: ['watches'], message: 'Each watch needs its own identifier.' });
});
export type Watch = z.input<typeof watchSchema>;
export type Trade = z.input<typeof tradeSchema>;
export type Contact = z.input<typeof contactSchema>;
export type Inquiry = z.output<typeof requestSchema>;
export function fieldErrors(error: z.ZodError) {
    return Object.fromEntries(error.issues.map(issue => [issue.path.join('.'), issue.message]));
}
