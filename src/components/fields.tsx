'use client';
import { useId, useRef, useState } from 'react';
import { ControlIcon } from './control-icons';
import { useSound } from './sound';
export function Field({ label, value, onChange, options = [], type = 'text', required = false, autoComplete, placeholder, error }: {
    label: string; value: string | number | undefined; onChange: (value: string) => void; options?: readonly string[];
    type?: string; required?: boolean; autoComplete?: string; placeholder?: string; error?: string;
}) {
    const id = useId();
    const [blurError, setBlurError] = useState('');
    const message = error || blurError;
    return <div className="field"><label htmlFor={id}>{label}{!required ? <span aria-hidden="true">Optional</span> : null}</label><input id={id} value={value ?? ''} onChange={e => { setBlurError(''); onChange(e.target.value); }} onBlur={e => { const input = e.currentTarget; setBlurError(required && !input.value.trim() ? `Enter your ${label.toLowerCase()}.` : input.validity.typeMismatch ? `Enter a valid ${type === 'url' ? 'link' : label.toLowerCase()}.` : ''); }} type={type} list={options.length ? `${id}-list` : undefined} required={required} autoComplete={autoComplete || 'off'} placeholder={placeholder} aria-invalid={Boolean(message)} aria-describedby={message ? `${id}-error` : undefined} maxLength={type === 'email' ? 254 : 150} inputMode={type === 'number' ? 'decimal' : type === 'tel' ? 'tel' : type === 'email' ? 'email' : undefined} enterKeyHint="next"/>{options.length ? <datalist id={`${id}-list`}>{options.map(option => <option key={option} value={option}/>)}</datalist> : null}{message ? <p className="error" id={`${id}-error`}>{message}</p> : null}</div>;
}
export function SelectField({ label, value, options, onChange, required = false }: {
    label: string; value: string; options: readonly string[]; onChange: (value: string) => void; required?: boolean;
}) { const id = useId(); return <div className="field"><label htmlFor={id}>{label}{required ? null : <span aria-hidden="true">Optional</span>}</label><select id={id} value={value} onChange={e => onChange(e.target.value)}><option value="">{required ? 'Choose an option' : 'Keep open'}</option>{options.map(option => <option key={option}>{option}</option>)}</select></div>; }
export function Choices({ label, value, options, onChange, descriptions = {}, variant = '', automatic = false }: {
    label: string; value: string; options: readonly string[]; onChange: (value: string, advance: boolean) => void;
    descriptions?: Readonly<Record<string, string>>; variant?: string; automatic?: boolean;
}) {
    const id = useId(); const group = useRef<HTMLDivElement>(null); const { tick } = useSound();
    function choose(option: string, advance: boolean) { tick(); onChange(option, advance); }
    return <div ref={group} className={`choice-field choice-${variant}`} role="radiogroup" aria-label={label} aria-describedby={automatic ? id : undefined}>
        {automatic ? <p id={id} className="choice-guidance">Select to continue. You can always go back.<span className="sr-only">Use arrow keys to explore choices, then Enter to continue.</span></p> : null}
        <div className="choices">{options.map((option, index) => <button type="button" role="radio" key={option} aria-label={option} aria-describedby={descriptions[option] ? `${id}-${index}-description` : undefined} aria-checked={value === option} tabIndex={value === option || (!value && index === 0) ? 0 : -1} onClick={() => choose(option, true)} onKeyDown={event => {
            const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
            if (!delta && event.key !== 'Home' && event.key !== 'End') return;
            event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + delta + options.length) % options.length;
            choose(options[next], false); group.current?.querySelectorAll<HTMLButtonElement>('button')[next].focus();
        }}><span className="choice-copy"><strong>{option}</strong>{descriptions[option] ? <small id={`${id}-${index}-description`}>{descriptions[option]}</small> : null}</span><span className="choice-check" aria-hidden="true"><ControlIcon name="check"/></span></button>)}</div>
    </div>;
}
