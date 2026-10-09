import type { CSSProperties } from 'react';
export type IconName = 'sun' | 'moon' | 'system' | 'sound' | 'muted' | 'chevron' | 'check' | 'copy';
export function ControlIcon({ name, style }: { name: IconName; style?: CSSProperties }) {
    const paths: Record<IconName, React.ReactNode> = {
        sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></>,
        moon: <path d="M20.5 14A8.7 8.7 0 0 1 10 3.5 8.8 8.8 0 1 0 20.5 14Z"/>,
        system: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></>,
        sound: <><path d="m11 4-6 5H2v6h3l6 5V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
        muted: <><path d="m11 4-6 5H2v6h3l6 5V4Z"/><path d="m16 9 6 6m0-6-6 6"/></>,
        chevron: <path d="m7 10 5 5 5-5"/>,
        check: <path d="m5 12 4 4L19 6"/>,
        copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    };
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>{paths[name]}</svg>;
}
