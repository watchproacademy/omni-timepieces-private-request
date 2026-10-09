'use client';
import { useId } from 'react';
export function Field({ label, value, onChange, options = [], type = 'text', required = false, autoComplete, placeholder, error }: {
    label: string;
    value: string | number | undefined;
    onChange: (value: string) => void;
    options?: readonly string[];
    type?: string;
    required?: boolean;
    autoComplete?: string;
    placeholder?: string;
    error?: string;
}) {
    const id = useId();
    return <div className="field"><label htmlFor={id}>{label}{!required ? <span aria-hidden="true">Optional</span> : null}</label><input id={id} value={value ?? ''} onChange={e => onChange(e.target.value)} type={type} list={options.length ? `${id}-list` : undefined} required={required} autoComplete={autoComplete || 'off'} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} maxLength={type === 'email' ? 254 : 150} inputMode={type === 'number' ? 'decimal' : type === 'tel' ? 'tel' : type === 'email' ? 'email' : undefined}/>{options.length ? <datalist id={`${id}-list`}>{options.map(option => <option key={option} value={option}/>)}</datalist> : null}{error ? <p className="error" id={`${id}-error`}>{error}</p> : null}</div>;
}
export function SelectField({ label, value, options, onChange, required = false }: {
    label: string;
    value: string;
    options: readonly string[];
    onChange: (value: string) => void;
    required?: boolean;
}) { const id = useId(); return <div className="field"><label htmlFor={id}>{label}{required ? null : <span aria-hidden="true">Optional</span>}</label><select id={id} value={value} onChange={e => onChange(e.target.value)}><option value="">{required ? 'Choose an option' : 'Keep open'}</option>{options.map(option => <option key={option}>{option}</option>)}</select></div>; }
export function Choices({ label, value, options, onChange }: {
    label: string;
    value: string;
    options: readonly string[];
    onChange: (value: string) => void;
}) { return <fieldset className="choice-field"><legend className="sr-only">{label}</legend><div className="choices">{options.map(option => <button type="button" key={option} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}</div></fieldset>; }
