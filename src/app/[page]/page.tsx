import { EditorialHero } from '@/components/watch-movement';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { publicPages } from '@/lib/content';
import { config } from '@/lib/config';
import { breadcrumbs, metadataFor } from '@/lib/seo';
import { Header, Footer, StructuredData } from '@/components/site-shell';
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(publicPages).map(page => ({ page })); }
async function content(params: Promise<{
    page: string;
}>) { const { page } = await params; if (!Object.hasOwn(publicPages, page))
    notFound(); return { page, data: publicPages[page as keyof typeof publicPages] }; }
export async function generateMetadata({ params }: {
    params: Promise<{
        page: string;
    }>;
}) { const { page, data } = await content(params); return metadataFor(data.title, data.description, `/${page}`); }
export default async function PublicPage({ params }: {
    params: Promise<{
        page: string;
    }>;
}) { const { page, data } = await content(params); return <div className="public-shell"><Header /><main id="main-content" className="editorial"><EditorialHero eyebrow="Omni private desk" title={data.title} description={data.description} />{data.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}{page === 'privacy' ? <p><a href={config.mainUrl}>Contact Omni Timepieces</a></p> : null}<Link className="primary" href="/">Begin a private request →</Link></main><Footer /><StructuredData value={breadcrumbs([{ name: 'Private request', path: '/' }, { name: data.title, path: `/${page}` }])}/>{page === 'services' ? <StructuredData value={{ '@context': 'https://schema.org', '@type': 'Service', name: 'Private watch sourcing inquiry', provider: { '@type': 'Organization', name: config.legalName }, url: config.siteUrl + '/services', description: data.description }}/> : null}</div>; }
