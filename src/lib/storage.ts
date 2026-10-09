import { z } from 'zod';
import { config, choices, steps } from './config';
import { initialState, blankWatch, blankTrade, type RequestState } from './state';
const text = (v: unknown, max = 150) => typeof v === 'string' ? v.slice(0, max) : '';
const enumValue = <T extends string>(v: unknown, options: readonly T[]): T | '' => options.includes(v as T) ? v as T : '';
const amount = (v: unknown) => (typeof v === 'number' || typeof v === 'string') && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined;
const entrySchema = z.record(z.string(), z.unknown());
export function restoreDraft(raw: string | null): RequestState | null {
    if (!raw || raw.length > 100000)
        return null;
    try {
        const parsed = entrySchema.parse(JSON.parse(raw));
        if(parsed.version !== undefined && parsed.version !== 3 && parsed.version !== 4) return null;
        const legacy = parsed.version !== 4;
        if (!legacy && !parsed.state)
            return null;
        const data = entrySchema.parse(legacy ? parsed : parsed.state);
        const values = entrySchema.parse(legacy ? data.values : data.contact);
        const state = initialState();
        const watches = Array.isArray(data.watches) ? data.watches : [];
        const current = legacy ? values : null;
        // Legacy fields may contain the currently edited watch, not yet committed into the array.
        const activeIndex = Math.max(0, Math.min(watches.length - 1, Number(data.activeWatchIndex) || 0));
        const candidates = watches.length ? [...watches] : current ? [current] : [];
        if (legacy && current && candidates.length)
            candidates[activeIndex] = { ...entrySchema.parse(candidates[activeIndex]), ...current };
        state.watches = candidates.slice(0, config.maxWatches).map((value, i) => {
            const w = entrySchema.parse(value);
            const result = blankWatch(!legacy && typeof w.id === 'string' && w.id.length <= 80 ? w.id : `restored-watch-${i}`);
            for (const field of ['brand', 'model', 'reference', 'year', 'dial', 'caseMaterial', 'bracelet', 'caseMaterialOther', 'braceletOther'] as const)
                result[field] = text(w[field]);
            if (result.brand === 'Other')
                result.brand = text(w.otherBrand) || 'Other';
            result.occasion = enumValue(w.occasion, choices.occasion);
            result.condition = enumValue(w.condition, choices.condition);
            result.timeline = enumValue(w.timeline, choices.timeline);
            result.budget = enumValue(w.budget, choices.budget);
            result.budgetMin = amount(w.budgetMin);
            result.budgetMax = amount(w.budgetMax);
            // Older drafts stored a formatted custom range alongside numeric fields.
            if (!result.budget && result.budgetMax)
                result.budget = 'Custom';
            return result;
        });
        if(new Set(state.watches.map(w=>w.id)).size !== state.watches.length || state.watches.some(w=>!w.id)) return null;
        if (!state.watches.length)
            state.watches = initialState().watches;
        const index = legacy ? activeIndex : Math.max(0, (Array.isArray(data.watches) ? data.watches : []).findIndex(w => entrySchema.parse(w).id === data.activeWatchId));
        state.activeWatchId = state.watches[Math.min(index, state.watches.length - 1)].id;
        const trades = legacy ? data.tradeIns : data.trades;
        state.trades = (Array.isArray(trades) ? trades : []).slice(0, config.maxTrades).map((value, i) => {
            const t = entrySchema.parse(value);
            const result = blankTrade(!legacy && typeof t.id === 'string' && t.id.length <= 80 ? t.id : `restored-trade-${i}`);
            for (const field of ['brand', 'model', 'reference', 'year', 'dial', 'bracelet', 'setOther'] as const)
                result[field] = text(t[field]);
            result.condition = enumValue(t.condition, choices.tradeCondition);
            result.set = enumValue(t.set, choices.tradeSet);
            result.expectedValue = amount(t.expectedValue);
            return result;
        });
        if(new Set(state.trades.map(t=>t.id)).size !== state.trades.length || state.trades.some(t=>!t.id)) return null;
        state.activeTradeId = legacy ? state.trades[Math.max(0, Math.min(state.trades.length - 1, Number(data.activeTradeIndex) || 0))]?.id || '' : state.trades.find(t => t.id === data.activeTradeId)?.id || state.trades[0]?.id || '';
        state.tradeIn = enumValue(legacy ? values.tradeIn : data.tradeIn, ['Yes', 'No']);
        for (const field of ['fullName', 'email', 'phone', 'location'] as const)
            state.contact[field] = text(values[field], field === 'email' ? 254 : 150);
        state.contact.preferredContact = enumValue(values.preferredContact, choices.preferredContact);
        state.consent = false; // Contact consent must be reconfirmed after restoration.
        state.conditionNotes = text(legacy ? values.conditionNotes : data.conditionNotes, 3000);
        state.inspirationUrl = text(legacy ? values.inspirationUrl : data.inspirationUrl, 2000);
        state.step = Math.max(0, Math.min(steps.length - 1, (Number(data.step) || 0) - (legacy ? 1 : 0)));
        state.submissionKey = text(data.submissionKey, 100);
        if (data.attribution && typeof data.attribution === 'object') {
            const attr = entrySchema.parse(data.attribution);
            for (const key of Object.keys(state.attribution) as (keyof RequestState['attribution'])[])
                state.attribution[key] = text(attr[key], key === 'landingPage' ? 2000 : 150);
        }
        return state;
    }
    catch {
        return null;
    }
}
export function prefill(state: RequestState, query: URLSearchParams): RequestState {
    const next = structuredClone(state);
    const watch = next.watches.find(w => w.id === next.activeWatchId) || next.watches[0];
    for (const key of ['brand', 'model', 'reference'] as const)
        if (query.has(key))
            watch[key] = text(query.get(key));
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const)
        if (query.has(key))
            next.attribution[key] = text(query.get(key));
    return next;
}
export function readSession(storage: Storage) { return restoreDraft(storage.getItem(config.draftKey)) || restoreDraft(storage.getItem(config.legacyDraftKey)); }
export function saveSession(storage: Storage, state: RequestState) { storage.setItem(config.draftKey, JSON.stringify({ version: 4, state: { ...state, status: 'idle', accepted: undefined } })); }
export function clearSession(storage: Storage) { storage.removeItem(config.draftKey); storage.removeItem(config.legacyDraftKey); }
