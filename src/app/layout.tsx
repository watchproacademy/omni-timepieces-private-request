import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { config } from '@/lib/config';
import { themeBootstrap } from '@/lib/theme';
import { ConfigurationProvider } from '@/components/providers';
import '@/styles/fonts.css';
import '@/styles/theme.css';
import '@/styles/app.css';
export const metadata: Metadata = { metadataBase: new URL(config.siteUrl), title: { default: `${config.name} — Private request`, template: `%s | ${config.name}` }, icons: { icon: '/favicon.svg' } };
export default async function RootLayout({ children }: {
    children: React.ReactNode;
}) { const nonce = (await headers()).get('x-nonce') || undefined; return <html lang="en" suppressHydrationWarning><head>{/* Parser-blocking bootstrap intentionally precedes painted content. */}<script nonce={nonce} dangerouslySetInnerHTML={{__html:themeBootstrap}}/><link rel="preload" href="/fonts/newsreader-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body><ConfigurationProvider>{children}</ConfigurationProvider></body></html>; }
