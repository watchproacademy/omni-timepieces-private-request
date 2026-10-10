'use client';
import { useRef, useState } from 'react';
import { interpretWatchBrief } from '@/lib/assistant';
import { useRequest } from './providers';
export function AssistantDialog() {
    const dialog = useRef<HTMLDialogElement>(null);
    const opener = useRef<HTMLButtonElement>(null);
    const [brief, setBrief] = useState('');
    const [result, setResult] = useState<ReturnType<typeof interpretWatchBrief> | null>(null);
    const { state, dispatch } = useRequest();
    const watch = state.watches.find(w => w.id === state.activeWatchId)!;
    function close() { dialog.current?.close(); opener.current?.focus(); }
    return <><button ref={opener} type="button" className="quiet-button" onClick={() => { setResult(null); dialog.current?.showModal(); }}>I’d like your guidance</button><dialog ref={dialog} aria-labelledby="guide-title" onClose={() => opener.current?.focus()}><div className="dialog-content"><button type="button" className="dialog-close" aria-label="Close watch guide" onClick={close}>×</button><p className="eyebrow">A little direction is plenty</p><h2 id="guide-title">Tell us what you have in mind.</h2><p>Describe the watch once, then review the suggested details. You can also leave the model open for your concierge.</p><label htmlFor="guide-brief">Your description</label><textarea id="guide-brief" value={brief} maxLength={3000} onChange={e => { setBrief(e.target.value); setResult(null); }} placeholder="A blue Rolex GMT-Master II on Jubilee, pre-owned, under $30k…"/><button type="button" className="quiet-button" onClick={() => { dispatch({ type: 'watch/update', id: watch.id, patch: { model: 'Open to guidance' } }); close(); }}>Keep model open</button><button type="button" className="primary" disabled={!brief.trim()} onClick={() => setResult(interpretWatchBrief(brief, watch.brand))}>Review suggestions</button>{result ? <><dl className="review-details">{result.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>{result.followUp}</p><button type="button" className="primary" onClick={() => {
                // Brand/model resets run before the remaining interpretation is applied.
                dispatch({ type: 'watch/update', id: watch.id, patch: { brand: result.brand } });
                dispatch({ type: 'watch/update', id: watch.id, patch: { model: result.model } });
                dispatch({ type: 'watch/update', id: watch.id, patch: { reference: result.reference, year: result.year, dial: result.dial, caseMaterial: result.material, bracelet: result.bracelet, ...(result.condition ? { condition: result.condition as typeof watch.condition } : {}), ...(result.timeline ? { timeline: result.timeline as typeof watch.timeline } : {}), ...(result.budget ? { budget: result.budget as typeof watch.budget, budgetMin: undefined, budgetMax: result.budgetMax || undefined } : {}) } });
                close();
            }}>Use these details</button></> : null}</div></dialog></>;
}
