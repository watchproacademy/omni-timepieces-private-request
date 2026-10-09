import Link from 'next/link';
import { config } from '@/lib/config';
import { metadataFor } from '@/lib/seo';
import { RequestEntrance } from '@/components/request-entrance';
import { Header, StructuredData } from '@/components/site-shell';
export const metadata = metadataFor('Private watch request', 'Describe your next watch, request sourcing guidance, and discuss trade-in possibilities with the Omni Timepieces private desk.', '/');
export default function Home() { return <><a className="skip-link" href="#main-content">Skip to private request</a><main className="app-shell request-shell"><Header sound compact/><div id="main-content"><RequestEntrance /></div><footer className="request-footer"><span>{config.legalName}</span><nav aria-label="Legal"><Link prefetch={false} href="/privacy">Privacy</Link><Link prefetch={false} href="/terms">Terms</Link></nav></footer></main><StructuredData value={{ '@context': 'https://schema.org', '@type': 'Organization', name: config.legalName, url: config.mainUrl }}/></>; }
