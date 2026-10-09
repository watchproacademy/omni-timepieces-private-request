'use client';
import { useEffect, useLayoutEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { ControlIcon } from './control-icons';
import { useSound } from './sound';
export function SuggestionInput({ label, options, inputProps, onSelect }: {
    label: string; options: readonly string[]; inputProps: InputHTMLAttributes<HTMLInputElement>; onSelect: (value: string) => void;
}) {
    const { tick } = useSound();
    const id = useId(); const input = useRef<HTMLInputElement>(null); const list = useRef<HTMLUListElement>(null); const menu = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ left: 0, top: 0, width: 300, maxHeight: 240 });
    const [open, setOpen] = useState(false); const [query, setQuery] = useState('');
    const [active, setActive] = useState(-1); const [manual, setManual] = useState(false);
    const matches = [...new Set(options)].filter(option => option.toLowerCase().includes(query.toLowerCase()));
    const items: (string | null)[] = [...matches, null];
    useEffect(() => { if (open && active >= 0) list.current?.children.item(active)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);
    function show() { const rect = input.current?.getBoundingClientRect(); if (rect) setPosition({ left: rect.left, top: rect.bottom + 8, width: rect.width, maxHeight: 240 }); setQuery(''); setActive(-1); setOpen(true); }
    useLayoutEffect(() => {
        if (!open) return;
        const update = () => {
            const rect = input.current?.getBoundingClientRect(); if (!rect) return;
            const viewport = window.visualViewport;
            const bottom = (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0);
            const spaceBelow = bottom - rect.bottom - 16; const spaceAbove = rect.top - (viewport?.offsetTop ?? 0) - 16;
            const above = spaceBelow < 180 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(88, Math.min(240, above ? spaceAbove : spaceBelow));
            const height = Math.min(menu.current?.offsetHeight || 240, maxHeight);
            setPosition({ left: rect.left, width: rect.width, top: above ? rect.top - height - 8 : rect.bottom + 8, maxHeight });
        };
        const closeOutside = (event: PointerEvent) => { const target = event.target as Node; if (!input.current?.parentElement?.contains(target) && !menu.current?.contains(target)) setOpen(false); };
        update(); document.addEventListener('pointerdown', closeOutside); window.addEventListener('resize', update); document.addEventListener('scroll', update, true);
        window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update);
        return () => { document.removeEventListener('pointerdown', closeOutside); window.removeEventListener('resize', update); document.removeEventListener('scroll', update, true); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
    }, [open, items.length]);
    function select(option: string | null) { tick(); onSelect(option ?? ''); setManual(option === null); setOpen(false); setActive(-1); input.current?.focus(); }
    return <div className="suggestion-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
        <div className="picker-input"><input {...inputProps} ref={input} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? id : undefined} aria-activedescendant={open && active >= 0 && active < items.length ? `${id}-${active}` : undefined} onClick={show} onChange={event => { inputProps.onChange?.(event); setQuery(event.target.value); setActive(-1); setOpen(true); }} onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) { show(); setActive(event.key === 'ArrowDown' ? 0 : new Set(options).size); } else setActive(index => index < 0 ? (event.key === 'ArrowDown' ? 0 : items.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length); }
            else if (event.key === 'Enter' && open) { event.preventDefault(); if (active >= 0 && active < items.length) select(items[active]); else setOpen(false); }
            else if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
            else if (event.key === 'Tab') setOpen(false);
        }}/><button type="button" className="picker-toggle" tabIndex={-1} aria-label={`${open ? 'Hide' : 'Show'} ${label.toLowerCase()} suggestions`} aria-expanded={open} onMouseDown={event => event.preventDefault()} onClick={() => { input.current?.focus(); if (open) setOpen(false); else show(); }}><ControlIcon name="chevron"/></button></div>
        {open ? createPortal(<div ref={menu} className="picker-menu" style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}>{matches.length === 0 ? <p className="picker-empty">No matching suggestions. You can type your own.</p> : null}<ul ref={list} style={{ maxHeight: position.maxHeight }} id={id} role="listbox" aria-label={`${label} suggestions`}>{items.map((option, index) => <li key={option ?? '__manual'} id={`${id}-${index}`} role="option" aria-selected={option !== null && inputProps.value === option} className={`${active === index ? 'is-active' : ''} ${option === null ? 'picker-manual' : ''}`} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => select(option)}><span>{option ?? 'Other / enter manually'}</span>{option !== null && inputProps.value === option ? <ControlIcon name="check"/> : null}</li>)}</ul></div>, document.body) : null}
        {manual && !inputProps.value ? <p className="picker-hint">Enter your {label.toLowerCase()} in the field above.</p> : null}
    </div>;
}
