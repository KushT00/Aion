'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type ViewMode = 'consumer' | 'creator';

interface ViewModeContextValue {
    mode: ViewMode;
    setMode: (mode: ViewMode) => void;
    toggleMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextValue>({
    mode: 'consumer',
    setMode: () => { },
    toggleMode: () => { },
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ViewMode>('consumer');

    const toggleMode = () => setMode((prev) => (prev === 'consumer' ? 'creator' : 'consumer'));

    return (
        <ViewModeContext.Provider value={{ mode, setMode, toggleMode }}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode() {
    return useContext(ViewModeContext);
}
