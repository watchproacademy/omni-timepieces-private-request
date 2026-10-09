export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.VERCEL_ENV === 'production') {
        const { serverEnvironment } = await import('./lib/server/environment');
        serverEnvironment();
    }
}
