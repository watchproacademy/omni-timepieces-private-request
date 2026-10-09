'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { config } from '@/lib/config';
import { SoundProvider } from './sound';

// Public pages share settings and sound without importing the request store,
// validation, catalog, draft storage, or submission code.
const ConfigurationContext = createContext(config);
export function ConfigurationProvider({ children }: { children: ReactNode }) {
    return <ConfigurationContext.Provider value={config}><SoundProvider>{children}</SoundProvider></ConfigurationContext.Provider>;
}
export const useConfiguration = () => useContext(ConfigurationContext);
