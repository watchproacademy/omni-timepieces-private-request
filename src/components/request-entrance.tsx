'use client';
import {useEffect} from 'react';
import { useFunnelHome } from './funnel-home';
import dynamic from 'next/dynamic';
import { config } from '@/lib/config';
const Funnel = dynamic(() => import('./funnel').then(module => module.Funnel), { loading: () => <p role="status">Opening your private request…</p> });
export function RequestEntrance() {
    const {started, hasStarted, begin} = useFunnelHome();
    useEffect(()=>{document.body.dataset.conciergeActive=String(started);return()=>{delete document.body.dataset.conciergeActive;};},[started]);
    return <>{hasStarted && <div className="request-workspace" hidden={!started}><h1 className="sr-only">Private watch request</h1><Funnel active={started}/></div>}<section className="request-intro" hidden={started} aria-labelledby="intro-title">
        <p className="eyebrow">Your private watch desk</p>
        <h1 id="intro-title" tabIndex={-1}>Together, let’s find{' '}<br/>your <span className="intro-watch-phrase"><em>next</em> timepiece.</span></h1>
        <p className="intro-description">{config.copy.intro}</p>
        <dl className="intro-proof"><div><dt>{config.copy.inventoryValue}</dt><dd>{config.copy.inventoryLabel}</dd></div><div><dt>{config.copy.sourcingTime}</dt><dd>{config.copy.sourcingLabel}</dd></div></dl>
        <p className="intro-values">Authenticity <span aria-hidden="true">·</span> Transparency <span aria-hidden="true">·</span> Privacy</p>
        <button className="primary intro-start" onClick={begin}>{hasStarted ? 'Continue your request' : 'Let’s get started'} <span aria-hidden="true">→</span></button>
    </section></>;
}
