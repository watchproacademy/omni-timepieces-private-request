import { NextRequest, NextResponse } from 'next/server';
export function proxy(request: NextRequest) {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    const csp = ["default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'` + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''), "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com", "connect-src 'self' https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com https://ad.doubleclick.net", "img-src 'self' data: https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com", "media-src 'self'", "frame-src https://www.googletagmanager.com", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join('; ');
    const headers = new Headers(request.headers);
    headers.set('x-nonce', nonce);
    headers.set('Content-Security-Policy', csp);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set('Content-Security-Policy', csp);
    return response;
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|assets|favicon.svg|social-card|robots.txt|sitemap.xml|llms.txt).*)'] };
