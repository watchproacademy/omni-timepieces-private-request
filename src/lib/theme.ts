export type ThemePreference = 'system' | 'light' | 'dark';
export const themeStorageKey = 'omni-theme';
export function resolveTheme(preference: unknown, darkSystem: boolean): 'light' | 'dark' { return preference === 'light' || preference === 'dark' ? preference : darkSystem ? 'dark' : 'light'; }
// Nonce-protected inline initialization avoids a blocking network request before first paint.
export const themeBootstrap = `(()=>{let p='system';try{p=localStorage.getItem('${themeStorageKey}')||p}catch{}document.documentElement.dataset.theme=p==='light'||p==='dark'?p:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})();`;
