export function serverEnvironment() {
    const production = process.env.VERCEL_ENV === 'production';
    const preview = process.env.WATCH_REQUEST_PREVIEW_MODE === 'true';
    if (production && preview)
        throw new Error('Preview delivery is forbidden in production.');
    const required = preview ? [] : ['DATABASE_URL', 'RESEND_API_KEY', 'WATCH_REQUEST_FROM_EMAIL', 'CRON_SECRET', 'ABUSE_HASH_SECRET', 'WATCH_REQUEST_ALERT_EMAIL'];
    if (!preview && process.env.WATCH_REQUEST_WEBHOOK_URL && !process.env.WATCH_REQUEST_REPLY_TO_EMAIL)
        required.push('WATCH_REQUEST_REPLY_TO_EMAIL');
    if (!preview && !process.env.WATCH_REQUEST_WEBHOOK_URL)
        required.push('WATCH_REQUEST_TO_EMAIL');
    const missing = required.filter(key => !process.env[key]);
    if (missing.length)
        throw new Error(`Missing server configuration: ${missing.join(', ')}`);
    if (!preview && (process.env.ABUSE_HASH_SECRET!.length < 32 || process.env.CRON_SECRET!.length < 32))
        throw new Error('Server signing secrets must have at least 32 characters.');
    if (process.env.WATCH_REQUEST_WEBHOOK_URL && new URL(process.env.WATCH_REQUEST_WEBHOOK_URL).protocol !== 'https:')
        throw new Error('Webhook requires HTTPS.');
    return { production, preview };
}
