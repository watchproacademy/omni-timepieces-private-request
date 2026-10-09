'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { config } from '@/lib/config';
const Funnel = dynamic(() => import('./funnel').then(module => module.Funnel), { loading: () => <p role="status">Opening your private request…</p> });
export function RequestEntrance() {
    const [started, setStarted] = useState(false);
    return started ? <div className="request-workspace"><h1 className="sr-only">Private watch request</h1><Funnel/></div> : <section className="request-intro" aria-labelledby="intro-title">
        <p className="eyebrow">Your private watch desk</p>
        <h1 id="intro-title">Together, let’s find{' '}<br/>your <em>next</em> timepiece.</h1>
        <p className="intro-description">{config.copy.intro}</p>
        <dl className="intro-proof"><div><dt>{config.copy.inventoryValue}</dt><dd>{config.copy.inventoryLabel}</dd></div><div><dt>{config.copy.sourcingTime}</dt><dd>{config.copy.sourcingLabel}</dd></div></dl>
        <p className="intro-values">Authenticity <span aria-hidden="true">·</span> Transparency <span aria-hidden="true">·</span> Privacy</p>
        <button className="primary intro-start" onClick={() => setStarted(true)}>Let’s get started <span aria-hidden="true">→</span></button>
    </section>;
}
