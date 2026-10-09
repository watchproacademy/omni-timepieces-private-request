import Link from 'next/link';
import { headers } from 'next/headers';
import { config } from '@/lib/config';
import { ThemeControl } from './theme-control';
import { SoundControl } from './sound';
export function Header({ sound = true }: {
    sound?: boolean;
}) { return <header className="topbar"><Link prefetch={false} className="wordmark" href="/"><strong>{config.name}</strong><span>Private request</span></Link><nav className="primary-navigation" aria-label="Explore Omni"><Link prefetch={false} href="/services">Our service</Link><Link prefetch={false} href="/brands">The maisons</Link><Link prefetch={false} href="/faq">Questions</Link></nav><div className="header-tools">{sound ? <SoundControl /> : null}<ThemeControl /></div></header>; }
export function Footer() { return <footer className="site-footer"><nav aria-label="Public pages"><Link prefetch={false} href="/services">Our service</Link><Link prefetch={false} href="/brands">Brands</Link><Link prefetch={false} href="/faq">Questions</Link><Link prefetch={false} href="/privacy">Privacy</Link><Link prefetch={false} href="/terms">Terms</Link></nav><span>{config.legalName}</span></footer>; }
export async function StructuredData({ value }: {
    value: unknown;
}) { const nonce = (await headers()).get('x-nonce') || undefined; return <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replaceAll('<', '\\u003c') }}/>; }
