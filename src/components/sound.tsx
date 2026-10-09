'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ConciergeAudio } from '@/lib/audio';
import { ControlIcon } from './control-icons';
const SoundContext = createContext<{ enabled: boolean; loading: boolean; error: string; toggle: () => void; tick: () => void } | null>(null);
export function SoundProvider({ children }: { children: ReactNode }) {
    const engine = useRef<ConciergeAudio | null>(null);
    const intent = useRef({ version: 0 });
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const lifetime = intent.current;
        const stop = () => { if (document.hidden) { intent.current.version++; engine.current?.disable(); setEnabled(false); setLoading(false); } };
        document.addEventListener('visibilitychange', stop);
        return () => { lifetime.version++; document.removeEventListener('visibilitychange', stop); engine.current?.dispose(); engine.current = null; };
    }, []);
    const tick = useCallback(() => engine.current?.tick(), []);
    async function toggle() {
        const current = ++intent.current.version;
        if (enabled || loading) { engine.current?.disable(); setEnabled(false); setLoading(false); return; }
        engine.current ||= new ConciergeAudio();
        const audio = engine.current;
        setError(''); setLoading(true);
        try { await audio.enable(); if (current === intent.current.version && !document.hidden) setEnabled(true); else audio.disable(); }
        catch { if (current === intent.current.version) { setEnabled(false); setError('Sound could not start. Please try again.'); } }
        finally { if (current === intent.current.version) setLoading(false); }
    }
    return <SoundContext.Provider value={{ enabled, loading, error, toggle: () => void toggle(), tick }}>{children}</SoundContext.Provider>;
}
export function useSound() { const sound = useContext(SoundContext); if (!sound) throw new Error('SoundProvider required.'); return sound; }
export function SoundControl() {
    const { enabled, loading, error, toggle } = useSound();
    return <div className="sound-control" data-enabled={enabled}>
        <button className="sound-toggle" type="button" role="switch" aria-checked={enabled} aria-label="Sound" aria-busy={loading} title={enabled ? 'Turn sound off' : 'Turn sound on'} onClick={toggle}>
            <span className="sound-icon"><ControlIcon name={enabled ? 'sound' : 'muted'} /></span>
            <span className="sound-wave" aria-hidden="true"><i/><i/><i/><i/></span>
            <span className="sr-only">{loading ? 'Starting sound' : enabled ? 'Sound on' : 'Sound off'}</span>
        </button>
        <span className="sound-error" role="status">{error}</span>
    </div>;
}
