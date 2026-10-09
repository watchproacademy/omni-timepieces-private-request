import type { Metadata } from 'next';
import { config } from './config';
export const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.WATCH_REQUEST_PREVIEW_MODE === 'true';
export function metadataFor(title: string, description: string, path: string): Metadata { return { title, description, alternates: { canonical: path }, openGraph: { title: `${title} | ${config.name}`, description, url: path, type: 'website', siteName: config.name, images: [{ url: '/social-card.png', width: 1200, height: 630, alt: 'Omni Timepieces private request desk' }] }, twitter: { card: 'summary_large_image', title, description, images: ['/social-card.png'] }, robots: isPreview ? { index: false, follow: false } : { index: true, follow: true } }; }
export function breadcrumbs(items: {
    name: string;
    path: string;
}[]) { return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: config.siteUrl + item.path })) }; }
