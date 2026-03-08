import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export type ViewMode = 'consumer' | 'creator';

interface ViewModeContextValue {
    mode: ViewMode;
    isCreator: boolean;
}

const ViewModeContext = createContext<ViewModeContextValue>({
    mode: 'consumer',
    isCreator: false,
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { profile } = useAuth();
    const [mode, setMode] = useState<ViewMode>('consumer');

    const isCreator = profile?.is_creator === true || profile?.role === 'creator';

    useEffect(() => {
        const isCreatorPath =
            pathname.startsWith('/creator') ||
            pathname === '/builder' ||
            pathname.startsWith('/workflows') ||
            pathname.startsWith('/runs') ||
            pathname.startsWith('/agent-wizard');

        if (isCreatorPath && isCreator) {
            setMode('creator');
        } else {
            setMode('consumer');
        }
    }, [pathname, isCreator]);

    return (
        <ViewModeContext.Provider value={{ mode, isCreator }}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode() {
    return useContext(ViewModeContext);
}
