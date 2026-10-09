/* eslint-disable react-hooks/set-state-in-effect -- Restore the browser preference after hydration. */
'use client';
import { useEffect, useRef, useState } from 'react';
import { resolveTheme, themeStorageKey, type ThemePreference } from '@/lib/theme';
import { ControlIcon } from './control-icons';
const options = ['light', 'dark', 'system'] as const;
export function ThemeControl() {
    const [preference, setPreference] = useState<ThemePreference>('system');
    const [ready, setReady] = useState(false);
    const group = useRef<HTMLDivElement>(null);
    useEffect(() => {
        try { const saved = localStorage.getItem(themeStorageKey); if (saved === 'light' || saved === 'dark') setPreference(saved); } catch { }
        setReady(true);
    }, []);
    useEffect(() => {
        if (!ready) return;
        const media = matchMedia('(prefers-color-scheme: dark)');
        const update = () => {
            document.documentElement.dataset.theme = resolveTheme(preference, media.matches);
            document.documentElement.dataset.themePreference = preference;
            let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
            if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
            meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--surface-page').trim());
        };
        update(); media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, [preference, ready]);
    function choose(value: ThemePreference) {
        setPreference(value);
        try { localStorage.setItem(themeStorageKey, value); } catch { }
    }
    return <div ref={group} className="theme-switch" role="radiogroup" aria-label="Appearance" data-preference={preference}>
        <span className="theme-thumb" aria-hidden="true" />
        {options.map((value, index) => <button key={value} type="button" role="radio" aria-checked={preference === value} tabIndex={preference === value ? 0 : -1} aria-label={`${value[0].toUpperCase()}${value.slice(1)} appearance`} title={`${value[0].toUpperCase()}${value.slice(1)} appearance`} onClick={() => choose(value)} onKeyDown={event => {
            const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
            if (!delta && event.key !== 'Home' && event.key !== 'End') return;
            event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + delta + options.length) % options.length;
            choose(options[next]); group.current?.querySelectorAll<HTMLButtonElement>('button')[next].focus();
        }}><ControlIcon name={value === 'light' ? 'sun' : value === 'dark' ? 'moon' : 'system'}/></button>)}
    </div>;
}
