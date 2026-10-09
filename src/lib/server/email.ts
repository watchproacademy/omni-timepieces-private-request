import { config } from '../config';
import type { Inquiry } from '../validation';
export const emailTheme = { background: '#eef1f0', surface: '#ffffff', text: '#172022', muted: '#53605f', border: '#dfe5e4', accent: '#675831' };
export function escapeHtml(value: unknown) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
export function emailFor(payload: Inquiry, id: string, kind: 'owner' | 'receipt') {
    const receipt = kind === 'receipt';
    const title = receipt ? 'Your private request has been received' : 'New private watch request';
    const rows: [
        string,
        string
    ][] = [['Request', id], ...payload.watches.flatMap((w, i): [
            string,
            string
        ][] => [
            [`Watch ${i + 1}`, `${w.brand} ${w.model}`], ['Reference', w.reference || 'Open'], ['Configuration', [w.year, w.dial, w.caseMaterialOther || w.caseMaterial, w.braceletOther || w.bracelet].filter(Boolean).join(' · ') || 'Open'], ['Preferences', [w.occasion, w.condition, w.timeline].join(' · ')], ['Budget', w.budget === 'Custom' ? `${w.budgetMin || 0}–${w.budgetMax} ${config.currency}` : `${w.budget} (${config.currency})`],
        ]), ...payload.tradeIns.flatMap((t, i): [
            string,
            string
        ][] => [[`Trade ${i + 1}`, `${t.brand} ${t.model}`], ['Trade details', [t.reference, t.year, t.dial, t.bracelet, t.condition, t.setOther || t.set].filter(Boolean).join(' · ')], ['Expected trade value', t.expectedValue ? `${t.expectedValue} ${config.currency}` : 'Open']]), ['Condition notes', payload.conditionNotes], ['Inspiration', payload.inspirationUrl], ['Client', payload.contact.fullName], ['Email', payload.contact.email], ['Phone', payload.contact.phone], ['Follow-up', payload.contact.preferredContact], ['Location', payload.contact.location]];
    if (!receipt)
        rows.push(['Campaign', payload.attribution.utm_campaign], ['Source', payload.attribution.utm_source], ['Medium', payload.attribution.utm_medium], ['Landing page', payload.attribution.landingPage]);
    const intro = receipt ? 'Thank you for sharing your brief. Our private desk will review it and contact you through your selected method. This receipt confirms your inquiry, not watch availability, a purchase, or a final trade appraisal.' : 'A validated inquiry has been saved. Reply directly to the client to follow up.';
    const text = `${config.name}\n${title}\n\n${intro}\n\n${rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${receipt ? 'You can reply to this email about your request.' : ''}`;
    const html = `<!doctype html><html><body style="margin:0;padding:24px;background:${emailTheme.background};font-family:Arial,sans-serif;color:${emailTheme.text}"><main style="max-width:680px;margin:auto;padding:28px;background:${emailTheme.surface};border-top:4px solid ${emailTheme.accent}"><p style="color:${emailTheme.accent}">${config.name}</p><h1 style="font-size:28px">${title}</h1><p>${intro}</p><table style="width:100%;border-collapse:collapse">${rows.filter(([, v]) => v).map(([k, v]) => `<tr><th style="text-align:left;padding:12px;border-bottom:1px solid ${emailTheme.border};color:${emailTheme.muted}">${escapeHtml(k)}</th><td style="padding:12px;border-bottom:1px solid ${emailTheme.border};overflow-wrap:anywhere">${escapeHtml(v)}</td></tr>`).join('')}</table><p>${receipt ? 'You can reply to this email about your request.' : ''}</p></main></body></html>`;
    return { subject: `${id} — ${receipt ? 'Your Omni private request' : payload.watches.length > 1 ? `${payload.watches.length} watches` : `${payload.watches[0].brand} ${payload.watches[0].model}`}`, html, text };
}
