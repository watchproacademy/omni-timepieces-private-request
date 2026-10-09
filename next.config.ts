import type { NextConfig } from 'next';
if (process.env.VERCEL_ENV === 'production') {
    const required = ['DATABASE_URL', 'RESEND_API_KEY', 'WATCH_REQUEST_FROM_EMAIL', 'CRON_SECRET', 'ABUSE_HASH_SECRET', 'WATCH_REQUEST_ALERT_EMAIL'];
    if (process.env.WATCH_REQUEST_WEBHOOK_URL && !process.env.WATCH_REQUEST_REPLY_TO_EMAIL)
        required.push('WATCH_REQUEST_REPLY_TO_EMAIL');
    if (!process.env.WATCH_REQUEST_WEBHOOK_URL)
        required.push('WATCH_REQUEST_TO_EMAIL');
    if (process.env.WATCH_REQUEST_PREVIEW_MODE === 'true' || required.some(key => !process.env[key]))
        throw new Error('Production delivery configuration is incomplete or demo mode is enabled.');
}
const preview = process.env.VERCEL_ENV === 'preview' || process.env.WATCH_REQUEST_PREVIEW_MODE === 'true';
const nextConfig: NextConfig = { poweredByHeader: false, reactStrictMode: true, async redirects() { return [{ source: '/index.html', destination: '/', permanent: true }]; }, async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, ...(preview ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : [])] }, { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }, { key: 'X-Robots-Tag', value: 'noindex' }] }]; } };
export default nextConfig;
