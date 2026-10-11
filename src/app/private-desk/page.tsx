import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {internalPortalOrigin} from '@/lib/server/admin-boundary';
import type {Metadata} from 'next';
import {Header,Footer} from '@/components/site-shell';
import {RequestStatus} from '@/components/request-status';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Private desk',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function PrivateDesk(){const origin=internalPortalOrigin();const host=(await headers()).get('host');if(!origin||host!==new URL(origin).host)notFound();return <div className="public-shell"><Header/><main id="main-content" className="editorial tracking-page"><p className="eyebrow">Operator workspace</p><h1>Your private desk.</h1><RequestStatus enabled={process.env.REQUEST_TRACKING_ENABLED==='true'} portal={process.env.REQUEST_PORTAL_ENABLED==='true'} initialRole="owner"/></main><Footer/></div>;}
