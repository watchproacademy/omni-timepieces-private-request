/* eslint-disable react-hooks/set-state-in-effect -- Browser-only draft and theme restoration must run after SSR hydration. */
'use client';
import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import { config } from '@/lib/config';
import { initialState, reducer, type Action, type RequestState } from '@/lib/state';
import { clearSession, prefill, readSession, saveSession } from '@/lib/storage';
import { initializeAnalytics } from '@/lib/analytics';
import { resolveTheme, themeStorageKey, type ThemePreference } from '@/lib/theme';
const ConfigurationContext = createContext(config);
export function ConfigurationProvider({ children }: {
    children: ReactNode;
}) { return <ConfigurationContext.Provider value={config}>{children}</ConfigurationContext.Provider>; }
export const useConfiguration = () => useContext(ConfigurationContext);
const RequestContext = createContext<{
    state: RequestState;
    dispatch: React.Dispatch<Action>;
    ready: boolean;
} | null>(null);
export function RequestProvider({ children }: {
    children: ReactNode;
}) {
    const [state, dispatch] = useReducer(reducer, undefined, initialState);
    const [ready, setReady] = useState(false);
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
        const timer = setTimeout(() => { try {
            saveSession(sessionStorage, state);
        }
        catch { } }, 180);
        return () => clearTimeout(timer);
    }, [state, ready]);
    return <RequestContext.Provider value={{ state, dispatch, ready }}>{children}</RequestContext.Provider>;
}
export function useRequest() { const context = useContext(RequestContext); if (!context)
    throw new Error('RequestProvider required'); return context; }
export function ThemeControl() {
    const [preference, setPreference] = useState<ThemePreference>('system');
    const [initialized, setInitialized] = useState(false);
    useEffect(() => { try {
        const value = localStorage.getItem(themeStorageKey);
        if (value === 'light' || value === 'dark')
            setPreference(value);
    }
    catch { } setInitialized(true); }, []);
    useEffect(() => {
        if (!initialized)
            return;
        const media = matchMedia('(prefers-color-scheme: dark)');
        const update = () => { document.documentElement.dataset.theme = resolveTheme(preference, media.matches); };
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, [preference, initialized]);
    return <label className="theme-control"><span>Appearance</span><select aria-label="Appearance" value={preference} onChange={e => { const next = e.target.value as ThemePreference; setPreference(next); try {
        localStorage.setItem(themeStorageKey, next);
    }
    catch { } }}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
