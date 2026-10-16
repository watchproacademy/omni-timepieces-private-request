import Link from 'next/link';
import {BrandMark} from './brand-mark';
import {LocalClock} from './local-clock';
import { headers } from 'next/headers';
import { config } from '@/lib/config';
import { ThemeControl } from './theme-control';
import { SoundControl } from './sound';
import { FunnelHomeLink } from './funnel-home';
export function Header({ sound = true, compact = false, operator = false }: {
    sound?: boolean; compact?: boolean; operator?: boolean;
}) { if (operator) return <header className="topbar operator-topbar"><Link className="wordmark" prefetch={false} href="/private-desk"><BrandMark context="Operator workspace"/></Link><div className="header-tools"><LocalClock/>{sound?<SoundControl/>:null}<ThemeControl/></div></header>; if (compact) return <header className="topbar request-topbar"><FunnelHomeLink><BrandMark context="Private request"/></FunnelHomeLink><div className="header-tools">{sound ? <SoundControl/> : null}<ThemeControl compact/><details className="request-menu"><summary aria-label="Open menu" title="Menu"><span aria-hidden="true">☰</span></summary><nav className="header-popover" aria-label="Explore Omni Timepieces"><Link prefetch={false} href="/services">Our service</Link><Link prefetch={false} href="/brands">The maisons</Link><Link prefetch={false} href="/faq">Questions</Link>{process.env.REQUEST_TRACKING_ENABLED === 'true' ? <Link prefetch={false} href="/request-status">Check my request</Link> : null}</nav></details></div></header>;
 return <header className="topbar"><FunnelHomeLink><BrandMark context="Private request"/></FunnelHomeLink><nav className="primary-navigation" aria-label="Explore Omni Timepieces"><Link prefetch={false} href="/services">Our service</Link><Link prefetch={false} href="/brands">The maisons</Link><Link prefetch={false} href="/faq">Questions</Link>{process.env.REQUEST_TRACKING_ENABLED === 'true' ? <Link prefetch={false} href="/request-status">Check my request</Link> : null}</nav><div className="header-tools">{sound ? <SoundControl /> : null}<ThemeControl /></div></header>; }
export function Footer() { return <footer className="site-footer"><nav aria-label="Public pages"><Link prefetch={false} href="/services">Our service</Link><Link prefetch={false} href="/brands">Brands</Link><Link prefetch={false} href="/faq">Questions</Link>{process.env.REQUEST_TRACKING_ENABLED === 'true' ? <Link prefetch={false} href="/request-status">Check my request</Link> : null}<Link prefetch={false} href="/privacy">Privacy</Link><Link prefetch={false} href="/terms">Terms</Link></nav><a href={config.mainUrl}>{config.legalName} <span aria-hidden="true">↗</span></a></footer>; }
export async function StructuredData({ value }: {
    value: unknown;
}) { const nonce = (await headers()).get('x-nonce') || undefined; return <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replaceAll('<', '\\u003c') }}/>; }
