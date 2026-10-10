import { config, steps } from './config';
import { canAutoAdvance } from './flow';
import type { Watch, Trade, Contact, Inquiry } from './validation';
export type EditableWatch = Omit<Watch, 'occasion' | 'condition' | 'timeline' | 'budget'> & {
    occasion: Watch['occasion'] | '';
    condition: Watch['condition'] | '';
    timeline: Watch['timeline'] | '';
    budget: Watch['budget'] | '';
};
export type EditableTrade = Omit<Trade, 'condition' | 'set'> & {
    condition: Trade['condition'] | '';
    set: Trade['set'] | '';
};
export type RequestState = {
    watches: EditableWatch[];
    trades: EditableTrade[];
    activeWatchId: string;
    activeTradeId: string;
    step: number;
    reviewReturn: boolean;
    tradeIn: 'Yes' | 'No' | '';
    contact: Omit<Contact, 'preferredContact'> & {
        preferredContact: Contact['preferredContact'] | '';
    };
    consent: boolean;
    conditionNotes: string;
    inspirationUrl: string;
    attribution: Inquiry['attribution'];
    submissionKey: string;
    accepted?: {
        requestId: string;
        preview: boolean;
    };
    status: 'idle' | 'submitting';
};
export const blankWatch = (id: string): EditableWatch => ({ id, brand: '', model: '', reference: '', year: '', dial: '', caseMaterial: '', bracelet: '', caseMaterialOther: '', braceletOther: '', occasion: '', condition: '', timeline: '', budget: '' });
export const blankTrade = (id: string): EditableTrade => ({ id, brand: '', model: '', reference: '', year: '', dial: '', bracelet: '', condition: '', set: '', setOther: '', currency: config.currency });
export function initialState(): RequestState {
    return { watches: [blankWatch('initial-watch')], trades: [], activeWatchId: 'initial-watch', activeTradeId: '', step: 0, reviewReturn: false, tradeIn: '', contact: { fullName: '', email: '', phone: '', location: '', preferredContact: '' }, consent: false, conditionNotes: '', inspirationUrl: '', attribution: { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '', landingPage: config.siteUrl + '/' }, submissionKey: '', status: 'idle' };
}
export type Action = { type: 'navigation/start' } | { type: 'advance'; fromStep: number; watchId: string } | { type: 'review/edit'; step: number; watchId?: string } | { type: 'review/return' } | {
    type: 'restore';
    state: RequestState;
} | {
    type: 'watch/add';
    id: string;
} | {
    type: 'watch/switch';
    id: string;
} | {
    type: 'watch/update';
    id: string;
    patch: Partial<EditableWatch>;
} | {
    type: 'watch/remove';
    id: string;
} | {
    type: 'trade/add';
    id: string;
} | {
    type: 'trade/switch';
    id: string;
} | {
    type: 'trade/update';
    id: string;
    patch: Partial<EditableTrade>;
} | {
    type: 'trade/remove';
    id: string;
} | {
    type: 'contact/update';
    patch: Partial<RequestState['contact']>;
} | {
    type: 'navigate';
    step: number;
} | {
    type: 'update';
    patch: Partial<Pick<RequestState, 'tradeIn' | 'consent' | 'conditionNotes' | 'inspirationUrl' | 'attribution' | 'submissionKey'>>;
} | {
    type: 'submission/start';
} | {
    type: 'submission/failure';
} | {
    type: 'submission/accepted';
    requestId: string;
    preview: boolean;
} | {
    type: 'reset';
    key: string;
};
export function reducer(state: RequestState, action: Action): RequestState {
    switch (action.type) {
        case 'navigation/start': return { ...state, step: 0, reviewReturn: false };
        case 'advance': return state.step === action.fromStep && state.activeWatchId === action.watchId && canAutoAdvance(state) ? { ...state, step: state.reviewReturn && state.step !== 0 ? steps.length - 1 : Math.min(steps.length - 1, state.step + 1), reviewReturn: state.reviewReturn && state.step === 0 } : state;
        case 'review/edit': return { ...state, step: Math.max(0, Math.min(steps.length - 2, action.step)), activeWatchId: action.watchId && state.watches.some(w => w.id === action.watchId) ? action.watchId : state.activeWatchId, reviewReturn: true };
        case 'review/return': return { ...state, step: steps.length - 1, reviewReturn: false };
        case 'restore': return action.state;
        case 'watch/add': return state.watches.length >= config.maxWatches ? state : { ...state, watches: [...state.watches, blankWatch(action.id)], activeWatchId: action.id, submissionKey: '', step: 0, reviewReturn: false };
        case 'watch/switch': return state.watches.some(w => w.id === action.id) ? { ...state, activeWatchId: action.id } : state;
        case 'watch/update': return { ...state, submissionKey: '', watches: state.watches.map(w => {
                if (w.id !== action.id)
                    return w;
                let next = { ...w, ...action.patch, id: w.id };
                if (action.patch.brand !== undefined && action.patch.brand !== w.brand)
                    next = { ...next, model: '', reference: '', dial: '', caseMaterial: '', bracelet: '', caseMaterialOther: '', braceletOther: '' };
                else if (action.patch.model !== undefined && action.patch.model !== w.model)
                    next = { ...next, reference: '', dial: '', caseMaterial: '', bracelet: '', caseMaterialOther: '', braceletOther: '' };
                return next;
            }) };
        case 'watch/remove': {
            if (state.watches.length === 1)
                return state;
            const watches = state.watches.filter(w => w.id !== action.id);
            return { ...state, watches, activeWatchId: watches.some(w => w.id === state.activeWatchId) ? state.activeWatchId : watches[0].id, submissionKey: '' };
        }
        case 'trade/add': return state.trades.length >= config.maxTrades ? state : { ...state, trades: [...state.trades, blankTrade(action.id)], activeTradeId: action.id, tradeIn: 'Yes', submissionKey: '' };
        case 'trade/switch': return state.trades.some(t => t.id === action.id) ? { ...state, activeTradeId: action.id } : state;
        case 'trade/update': return { ...state, submissionKey: '', trades: state.trades.map(t => {
            if(t.id !== action.id) return t;
            const next = { ...t, ...action.patch, id:t.id };
            if(action.patch.brand !== undefined && action.patch.brand !== t.brand) return { ...next, model:'', reference:'', dial:'', bracelet:'' };
            if(action.patch.model !== undefined && action.patch.model !== t.model) return { ...next, reference:'', dial:'', bracelet:'' };
            return next;
        }) };
        case 'trade/remove': {
            const trades = state.trades.filter(t => t.id !== action.id);
            return { ...state, trades, activeTradeId: trades.some(t => t.id === state.activeTradeId) ? state.activeTradeId : trades[0]?.id || '', submissionKey: '' };
        }
        case 'contact/update': return { ...state, contact: { ...state.contact, ...action.patch }, submissionKey: '' };
        case 'navigate': return { ...state, step: Math.max(0, Math.min(steps.length - 1, action.step)) };
        case 'update': return { ...state, ...action.patch, submissionKey: action.patch.submissionKey ?? '' };
        case 'submission/start': return { ...state, status: 'submitting' };
        case 'submission/failure': return { ...state, status: 'idle' };
        case 'submission/accepted': return { ...state, status: 'idle', accepted: { requestId: action.requestId, preview: action.preview } };
        case 'reset': return { ...initialState(), submissionKey: action.key };
    }
}
export function payloadFor(state: RequestState) {
    return { schemaVersion: 4, watches: state.watches, tradeIn: state.tradeIn, tradeIns: state.tradeIn === 'Yes' ? state.trades : [], contact: state.contact, consent: state.consent, currency: config.currency, conditionNotes: state.conditionNotes, inspirationUrl: state.inspirationUrl, attribution: state.attribution };
}
