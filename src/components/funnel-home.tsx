'use client';
import Link from 'next/link';
import { createContext, useContext, useState, type ReactNode } from 'react';

const HomeContext = createContext<{ started: boolean; hasStarted: boolean; begin: () => void; home: () => void } | null>(null);
export function FunnelHomeProvider({children}: {children: ReactNode}) {
    const [started, setStarted] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    return <HomeContext.Provider value={{started, hasStarted, begin: () => {setHasStarted(true); setStarted(true);}, home: () => setStarted(false)}}>{children}</HomeContext.Provider>;
}
export function useFunnelHome() {
    const value = useContext(HomeContext);
    if (!value) throw new Error('FunnelHomeProvider required');
    return value;
}
export function FunnelHomeLink({children}: {children: ReactNode}) {
    const home = useContext(HomeContext);
    return <Link prefetch={false} className="wordmark" href="/" aria-label="Omni Timepieces — private request home" onClick={event => {
        if (!home || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault(); home.home();
        requestAnimationFrame(() => { document.getElementById('intro-title')?.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); });
    }}>{children}</Link>;
}
