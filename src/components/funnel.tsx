'use client';
import { useEffect, useRef, useState } from 'react';
import { choices, steps } from '@/lib/config';
import { brandProfiles } from '@/lib/catalog';
import { watchSchema, tradeSchema, contactSchema, requestSchema, fieldErrors } from '@/lib/validation';
import { payloadFor, type EditableWatch } from '@/lib/state';
import { recordAccepted, track } from '@/lib/analytics';
import { submitInquiry, SubmissionError } from '@/lib/submission';
import { clearSession } from '@/lib/storage';
import { RequestProvider, useConfiguration, useRequest } from './providers';
import { Choices, Field } from './fields';
import { WatchDetails } from './watch-details';
import { TradeEditor } from './trade-editor';
import { RequestReview } from './request-review';
import { AssistantDialog } from './assistant-dialog';
function RequestFunnel() {
    const { state, dispatch, ready } = useRequest();
    const config = useConfiguration();
    const [error, setError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [started, setStarted] = useState(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const busy = useRef(false);
    const keyRef = useRef('');
    const submittedPayload = useRef('');
    const website = useRef<HTMLInputElement>(null);
    const watch = state.watches.find(w => w.id === state.activeWatchId) || state.watches[0];
    const step = steps[state.step];
    useEffect(() => { if (ready) {
        heading.current?.focus({ preventScroll: !started });
        track('private_request_step_viewed', { step: state.step + 1 });
    } }, [state.step, ready, started, state.accepted]);
    const update = (patch: Partial<EditableWatch>) => dispatch({ type: 'watch/update', id: watch.id, patch });
    function validateCurrent() {
        setError('');
        setErrors({});
        if (step.id === 'brand' && (!watch.brand.trim() || watch.brand === 'Other')) {
            setError('Choose a brand or enter its name.');
            return false;
        }
        if (step.id === 'watch') {
            if (!watch.model.trim()) {
                setError('Enter a model or choose guidance.');
                return false;
            }
            if ((/other|specific/i.test(watch.caseMaterial) && !watch.caseMaterialOther) || (/other|specific/i.test(watch.bracelet) && !watch.braceletOther)) {
                setError('Describe your specific configuration.');
                return false;
            }
            if (state.inspirationUrl && !/^https?:\/\//i.test(state.inspirationUrl)) {
                setError('Use an http or https inspiration link.');
                return false;
            }
        }
        if (['occasion', 'condition', 'timeline', 'budget'].includes(step.id)) {
            const field = step.id as 'occasion' | 'condition' | 'timeline' | 'budget';
            if (!watch[field]) {
                setError('Choose the answer that feels closest.');
                return false;
            }
            if (field === 'budget' && watch.budget === 'Custom' && (!watch.budgetMax || watch.budgetMax <= 0 || (watch.budgetMin || 0) > watch.budgetMax)) {
                setError('Enter a positive maximum and a starting amount below it.');
                return false;
            }
        }
        if (step.id === 'trade') {
            // Every requested watch is checked before moving to shared trade/contact steps.
            for (const w of state.watches) {
                const result = watchSchema.safeParse(w);
                if (!result.success) {
                    dispatch({ type: 'watch/switch', id: w.id });
                    dispatch({ type: 'navigate', step: 1 });
                    setError(`Complete ${w.brand || 'watch'} ${w.model || ''}: ${result.error.issues[0].message}`);
                    return false;
                }
            }
            if (!state.tradeIn) {
                setError('Tell us whether a trade-in is part of the request.');
                return false;
            }
            if (state.tradeIn === 'Yes') {
                if (!state.trades.length) {
                    setError('Add a watch for your trade appraisal.');
                    return false;
                }
                for (const trade of state.trades) {
                    const result = tradeSchema.safeParse(trade);
                    if (!result.success) {
                        dispatch({ type: 'trade/switch', id: trade.id });
                        setError(result.error.issues[0].message);
                        return false;
                    }
                }
            }
        }
        if (step.id === 'contact') {
            const result = contactSchema.safeParse(state.contact);
            if (!result.success) {
                setErrors(fieldErrors(result.error));
                setError('Check your contact details below.');
                return false;
            }
        }
        return true;
    }
    function next() { if (validateCurrent())
        dispatch({ type: 'navigate', step: state.step + 1 }); }
    async function submit() {
        if (busy.current)
            return;
        const parsed = requestSchema.safeParse(payloadFor(state));
        if (!parsed.success) {
            const fields = fieldErrors(parsed.error);
            setErrors(fields);
            setError(parsed.error.issues[0].message);
            return;
        }
        busy.current = true;
        setError('');
        dispatch({ type: 'submission/start' });
        const serialized = JSON.stringify(parsed.data);
        const changed = submittedPayload.current && submittedPayload.current !== serialized;
        const key = changed ? crypto.randomUUID() : state.submissionKey || keyRef.current || crypto.randomUUID();
        keyRef.current = key;
        submittedPayload.current = serialized;
        dispatch({ type: 'update', patch: { submissionKey: key } });
        try {
            const result = await submitInquiry(parsed.data, key, website.current?.value || '');
            dispatch({ type: 'submission/accepted', requestId: result.requestId, preview: result.preview });
            try {
                clearSession(sessionStorage);
            }
            catch { }
            recordAccepted(result.requestId, result.preview);
        }
        catch (e) {
            dispatch({ type: 'submission/failure' });
            setError(e instanceof Error && e.name === 'TimeoutError' ? 'Saving took longer than expected. Please retry; your request will not be duplicated.' : e instanceof Error ? e.message : 'Please try again.');
            if (e instanceof SubmissionError)
                setErrors(e.fields);
        }
        finally {
            busy.current = false;
        }
    }
    if (state.accepted)
        return <section className="request-card success" aria-labelledby="received-title"><p className="eyebrow">Private request received</p><h2 id="received-title" ref={heading} tabIndex={-1}>Your concierge will take it from here.</h2><p>{state.accepted.preview ? 'Demo complete. No request or email was sent.' : config.copy.success}</p><p className="ticket">Request <strong>{state.accepted.requestId}</strong></p>{state.tradeIn === 'Yes' ? <p>For each trade-in, your concierge will ask for photos of the dial, caseback, and everything included.</p> : null}<a className="primary" href={config.mainUrl}>Explore Omni Timepieces ↗</a><button className="quiet-button" type="button" onClick={() => { keyRef.current = ''; dispatch({ type: 'reset', key: crypto.randomUUID() }); }}>Start another request</button></section>;
    return <section className={`request-card ${started ? 'is-started' : ''}`} aria-label="Private watch request"><div className="mobile-start"><p className="eyebrow">Private request</p><h2>Your next chapter, on your wrist.</h2><button className="primary" type="button" onClick={() => { setStarted(true); heading.current?.focus(); }}>Begin your request →</button></div>
 <form id="request-form" noValidate onSubmit={e => { e.preventDefault(); if (state.step === steps.length - 1)
        void submit();
    else
        next(); }}>
 <fieldset className="submission-fields" disabled={state.status === 'submitting'}><legend className="sr-only">Watch inquiry</legend>
 <div className="progress-meta"><span>{step.label}</span><span>{String(state.step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span></div><progress max={steps.length} value={state.step + 1} aria-label="Request progress"/>
 <div className="item-tabs" aria-label="Requested watches">{state.watches.map((w, i) => <div key={w.id}><button type="button" aria-pressed={w.id === state.activeWatchId} onClick={() => { dispatch({ type: 'watch/switch', id: w.id }); dispatch({ type: 'navigate', step: 1 }); setError(''); }}>Watch {i + 1}{w.model ? `: ${w.model}` : ''}</button>{state.watches.length > 1 ? <button className="remove" aria-label={`Remove watch ${i + 1}`} type="button" onClick={() => dispatch({ type: 'watch/remove', id: w.id })}>×</button> : null}</div>)}</div>
 <p className="eyebrow">{step.label}</p><h2 ref={heading} tabIndex={-1}>{step.title}</h2>
 {step.id === 'brand' ? <><Choices label="Watch brand" options={[...Object.keys(brandProfiles), 'Other']} value={Object.hasOwn(brandProfiles, watch.brand) ? watch.brand : watch.brand ? 'Other' : ''} onChange={brand => update({ brand })}/>{watch.brand && !Object.hasOwn(brandProfiles, watch.brand) ? <Field label="Brand name" required value={watch.brand === 'Other' ? '' : watch.brand} onChange={brand => update({ brand })}/> : null}</> : null}
 {step.id === 'watch' ? <><WatchDetails watch={watch}/><AssistantDialog /><div className="field-grid"><Field label="Inspiration link" value={state.inspirationUrl} type="url" onChange={inspirationUrl => dispatch({ type: 'update', patch: { inspirationUrl } })}/></div></> : null}
 {step.id === 'occasion' || step.id === 'condition' || step.id === 'timeline' || step.id === 'budget' ? <Choices label={step.label} value={watch[step.id]} options={choices[step.id]} onChange={value => { update({ [step.id]: value }); }}/> : null}
 {step.id === 'condition' ? <div className="field"><label htmlFor="condition-notes">Condition notes <span>Optional</span></label><textarea id="condition-notes" value={state.conditionNotes} maxLength={3000} onChange={e => dispatch({ type: 'update', patch: { conditionNotes: e.target.value } })}/></div> : null}
 {step.id === 'budget' && watch.budget === 'Custom' ? <div className="field-grid"><Field label={`From (${config.currency})`} value={watch.budgetMin} type="number" onChange={v => update({ budgetMin: v === '' ? undefined : Number(v) })}/><Field label={`Up to (${config.currency})`} required value={watch.budgetMax} type="number" onChange={v => update({ budgetMax: v === '' ? undefined : Number(v) })}/></div> : null}
 {step.id === 'budget' ? <><p className="helper">All budgets are in {config.currency}. Your range remains private.</p><button className="quiet-button" type="button" disabled={state.watches.length >= config.maxWatches} onClick={() => { if (validateCurrent())
        dispatch({ type: 'watch/add', id: crypto.randomUUID() }); }}>Add another requested watch</button></> : null}
 {step.id === 'trade' ? <TradeEditor /> : null}
 {step.id === 'contact' ? <><div className="field-grid">{(['fullName', 'email', 'phone', 'location'] as const).map(field => <Field key={field} label={{ fullName: 'Full name', email: 'Email', phone: 'Phone', location: 'City / country' }[field]} value={state.contact[field]} type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} required={field !== 'phone' || Boolean(state.contact.preferredContact && state.contact.preferredContact !== 'Email')} autoComplete={{ fullName: 'name', email: 'email', phone: 'tel', location: 'address-level2' }[field]} error={errors[field]} onChange={value => dispatch({ type: 'contact/update', patch: { [field]: value } })}/>)}</div><p className="helper">We’ll send your receipt by email. How should your concierge follow up?</p><Choices label="Preferred contact method" value={state.contact.preferredContact} options={choices.preferredContact} onChange={value => dispatch({ type: 'contact/update', patch: { preferredContact: value as typeof state.contact.preferredContact } })}/></> : null}
 {step.id === 'review' ? <RequestReview /> : null}
 <div className="honeypot" aria-hidden="true"><label htmlFor="website">Leave this blank</label><input id="website" ref={website} tabIndex={-1} autoComplete="off"/></div>
 {error ? <div className="error" role="alert"><p>{error}</p>{step.id === 'review' && Object.keys(errors).length ? <ul>{Object.entries(errors).map(([field, message]) => <li key={field}>{field}: {message}</li>)}</ul> : null}</div> : null}
 <div className="form-nav"><button className="quiet-button" type="button" disabled={state.step === 0 || state.status === 'submitting'} onClick={() => { setError(''); dispatch({ type: 'navigate', step: state.step - 1 }); }}>← Back</button><span className="save-note">Saved for this session</span><button className="primary" type="submit" disabled={!ready || state.status === 'submitting'} aria-busy={state.status === 'submitting'}>{state.status === 'submitting' ? 'Saving…' : step.id === 'review' ? 'Send private request' : 'Continue →'}</button></div>
 </fieldset></form></section>;
}
export function Funnel() { return <RequestProvider><RequestFunnel /></RequestProvider>; }
