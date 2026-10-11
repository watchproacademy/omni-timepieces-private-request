import type { Metadata } from 'next';
import { Header,Footer } from '@/components/site-shell';
import { RequestStatus } from '@/components/request-status';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Check my request',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function StatusPage(){return <div className="public-shell"><Header/><main id="main-content" className="editorial tracking-page"><p className="eyebrow">Your private watch desk</p><h1>Your request, at a glance.</h1><RequestStatus enabled={process.env.REQUEST_TRACKING_ENABLED==='true'}/></main><Footer/></div>;}
