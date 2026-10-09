import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';
import { isPreview } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots { return isPreview ? { rules: { userAgent: '*', disallow: '/' } } : { rules: [{ userAgent: 'GPTBot', disallow: '/' }, { userAgent: ['*', 'OAI-SearchBot'], allow: '/', disallow: '/api/' }], sitemap: config.siteUrl + '/sitemap.xml' }; }
