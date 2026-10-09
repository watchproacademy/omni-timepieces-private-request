/* eslint-disable react-hooks/set-state-in-effect -- Browser-only draft and theme restoration must run after SSR hydration. */
'use client';
import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import { initialState, reducer, type Action, type RequestState } from '@/lib/state';
import { clearSession, prefill, readSession, saveSession } from '@/lib/storage';
import { initializeAnalytics } from '@/lib/analytics';
const RequestContext = createContext<{
    state: RequestState;
    dispatch: React.Dispatch<Action>;
    ready: boolean;
    draftStatus: 'saving' | 'saved' | 'unavailable';
} | null>(null);
export function RequestProvider({ children }: {
    children: ReactNode;
}) {
    const [state, dispatch] = useReducer(reducer, undefined, initialState);
    const [ready, setReady] = useState(false);
    const [draftStatus, setDraftStatus] = useState<'saving' | 'saved' | 'unavailable'>('saving');
    useEffect(() => {
        let restored = initialState();
        try {
            restored = readSession(sessionStorage) || restored;
        }
        catch { /* Saving is optional. */ }
        restored = prefill(restored, new URLSearchParams(location.search));
        // Store a clean landing URL. Campaign fields are captured separately.
        restored.attribution.landingPage = location.origin + location.pathname;
        dispatch({ type: 'restore', state: restored });
        setReady(true);
        initializeAnalytics();
    }, []);
    useEffect(() => {
        if (!ready)
            return;
        if (state.accepted) {
            try {
                clearSession(sessionStorage);
            }
            catch { }
            return;
        }
        setDraftStatus('saving');
        const timer = setTimeout(() => { try {
            saveSession(sessionStorage, state); setDraftStatus('saved');
        }
        catch { setDraftStatus('unavailable'); } }, 180);
        return () => clearTimeout(timer);
    }, [state, ready]);
    return <RequestContext.Provider value={{ state, dispatch, ready, draftStatus }}>{children}</RequestContext.Provider>;
}
export function useRequest() { const context = useContext(RequestContext); if (!context)
    throw new Error('RequestProvider required'); return context; }
