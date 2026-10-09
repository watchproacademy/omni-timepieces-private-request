import { config } from './config';
declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}
const recorded = new Set<string>();
export function measurementAllowed(host: string, privacy: {
    globalPrivacyControl?: boolean;
    doNotTrack?: string | null;
}) {
    return host === config.analytics.host && !privacy.globalPrivacyControl && privacy.doNotTrack !== '1';
}
export function conversionPayload(requestId: string) { return { send_to: config.analytics.destination, transaction_id: requestId, value: 0, currency: config.currency }; }
export function initializeAnalytics() {
    if (!measurementAllowed(location.hostname, navigator) || document.getElementById('omni-google-tag'))
        return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args) => { window.dataLayer!.push(args); };
    window.gtag('js', new Date());
    window.gtag('set', 'allow_ad_personalization_signals', false);
    window.gtag('config', config.analytics.id, { allow_ad_personalization_signals: false, allow_enhanced_conversions: false });
    const script = document.createElement('script');
    script.id = 'omni-google-tag';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.analytics.id}`;
    document.head.append(script);
}
export function track(event: string, details: Record<string, string | number | boolean> = {}) {
    const safe: Record<string, string | number | boolean> = {};
    for (const key of ['step', 'count', 'preview', 'requestId'] as const)
        if (details[key] !== undefined)
            safe[key] = details[key];
    window.dispatchEvent(new CustomEvent('omni:funnel', { detail: { event, ...safe } }));
    if (measurementAllowed(location.hostname, navigator))
        window.dataLayer?.push({ event, ...safe });
}
export function recordAccepted(requestId: string, preview: boolean) {
    if (preview || !requestId || recorded.has(requestId) || !measurementAllowed(location.hostname, navigator))
        return;
    try {
        if (sessionStorage.getItem(`omni-conversion:${requestId}`))
            return;
        sessionStorage.setItem(`omni-conversion:${requestId}`, '1');
    }
    catch { /* Tracking remains optional. */ }
    recorded.add(requestId);
    window.gtag?.('event', 'conversion', conversionPayload(requestId));
    track('private_request_accepted', { requestId, preview: false });
}
