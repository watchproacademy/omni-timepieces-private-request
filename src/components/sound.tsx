'use client';
import { useEffect, useRef, useState } from 'react';
import { useConfiguration } from './providers';
export function SoundControl() {
    const { audioUrl } = useConfiguration();
    const audio = useRef<HTMLAudioElement | null>(null);
    const [enabled, setEnabled] = useState(false);
    useEffect(() => () => { audio.current?.pause(); }, []);
    useEffect(() => { const stop = () => { if (document.hidden) {
        audio.current?.pause();
        setEnabled(false);
    } }; document.addEventListener('visibilitychange', stop); return () => document.removeEventListener('visibilitychange', stop); }, []);
    async function toggle() {
        if (enabled) {
            audio.current?.pause();
            setEnabled(false);
            return;
        }
        if (!audio.current) {
            audio.current = new Audio(audioUrl);
            audio.current.loop = true;
            audio.current.volume = .12;
        }
        try {
            await audio.current.play();
            setEnabled(true);
        }
        catch {
            setEnabled(false);
        }
    }
    return <button className="quiet-button" type="button" aria-pressed={enabled} onClick={toggle}>Sound {enabled ? 'on' : 'off'}</button>;
}
