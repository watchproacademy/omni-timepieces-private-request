import { brandProfiles } from './catalog';
import { steps } from './config';
import { contactSchema, watchSchema } from './validation';
import type { RequestState } from './state';
export const autoAdvanceDelay = 280;
export function canAutoAdvance(state: RequestState) {
    const watch = state.watches.find(w => w.id === state.activeWatchId);
    if (!watch || state.status !== 'idle' || state.accepted) return false;
    switch (steps[state.step].id) {
        case 'brand': return Object.hasOwn(brandProfiles, watch.brand);
        case 'occasion': return Boolean(watch.occasion);
        case 'condition': return Boolean(watch.condition);
        case 'timeline': return Boolean(watch.timeline);
        case 'budget': return Boolean(watch.budget && watch.budget !== 'Custom');
        case 'trade': return state.tradeIn === 'No' && state.watches.every(w => watchSchema.safeParse(w).success);
        case 'contact': return contactSchema.safeParse(state.contact).success;
        default: return false;
    }
}
