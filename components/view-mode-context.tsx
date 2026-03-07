import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export type ViewMode = 'consumer' | 'creator';

interface ViewModeContextValue {
    mode: ViewMode;
}

const ViewModeContext = createContext<ViewModeContextValue>({
    mode: 'consumer',
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [mode, setMode] = useState<ViewMode>('consumer');

    useEffect(() => {
        if (
            pathname.startsWith('/creator') ||
            pathname === '/builder' ||
            pathname.startsWith('/workflows') ||
            pathname.startsWith('/runs') ||
            pathname.startsWith('/agent-wizard')
        ) {
            setMode('creator');
        } else {
            setMode('consumer');
        }
    }, [pathname]);

    return (
        <ViewModeContext.Provider value={{ mode }}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode() {
    return useContext(ViewModeContext);
}
