'use client';
import { useEffect, useRef } from 'react';
import { useRequest } from './providers';
import { watchSchema } from '@/lib/validation';
export function WatchRequests({ onNavigate }: { onNavigate: () => void }) {
    const { state, dispatch } = useRequest();
    const rail = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const selected = rail.current?.querySelector<HTMLElement>('[data-active="true"]');
        if (selected && rail.current) {
            const left = selected.offsetLeft;
            const right = left + selected.offsetWidth;
            if (left < rail.current.scrollLeft) rail.current.scrollLeft = left;
            else if (right > rail.current.scrollLeft + rail.current.clientWidth) rail.current.scrollLeft = right - rail.current.clientWidth;
        }
    }, [state.activeWatchId]);
    if (!state.watches.some(watch => watch.brand) && state.watches.length === 1) return null;
    return <nav className="watch-requests" aria-label="Requested watches">
        <p className="helper">Your watch requests · Select a watch to edit</p>
        <div className="watch-request-rail" ref={rail}>{state.watches.map((watch, index) => {
            const label = `Watch ${index + 1}${watch.brand ? ` · ${watch.brand}` : ''}${watch.model && watch.model !== 'Open to guidance' ? ` ${watch.model}` : watch.model ? ' · Guidance' : ''}`;
            return <div className="watch-request-item" data-active={state.activeWatchId === watch.id} key={watch.id}>
                <button className="watch-request-select" type="button" aria-label={label} aria-pressed={state.activeWatchId === watch.id} onClick={() => {
                    onNavigate();
                    dispatch({ type: 'watch/switch', id: watch.id });
                    dispatch({ type: 'navigation/start' });
                    if (watch.brand) dispatch({ type: 'navigate', step: 1 });
                }}><span className="watch-request-number">Watch {index + 1}</span><strong>{watch.brand || 'Choose a brand'}{watch.model ? ` · ${watch.model === 'Open to guidance' ? 'Guidance' : watch.model}` : ''}</strong><small>{watchSchema.safeParse(watch).success ? 'Details complete' : 'In progress'}</small></button>
                {state.watches.length > 1 ? <button className="watch-request-remove" type="button" aria-label={`Remove watch ${index + 1}`} onClick={() => { onNavigate(); dispatch({ type: 'watch/remove', id: watch.id }); }}>×</button> : null}
            </div>;
        })}</div>
    </nav>;
}
