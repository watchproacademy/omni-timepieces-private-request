import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';
import { brandPages, publicPages } from '@/lib/content';
import { isPreview } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap { return isPreview ? [] : ['/', '/brands', ...Object.keys(publicPages).map(p => `/${p}`), ...brandPages.map(b => `/brands/${b.slug}`)].map(path => ({ url: config.siteUrl + path })); }
