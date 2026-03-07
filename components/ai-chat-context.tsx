'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface AIChatContextValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const AIChatContext = createContext<AIChatContextValue>({
    isOpen: false,
    open: () => { },
    close: () => { },
    toggle: () => { },
});

export function AIChatProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <AIChatContext.Provider
            value={{
                isOpen,
                open: () => setIsOpen(true),
                close: () => setIsOpen(false),
                toggle: () => setIsOpen((p) => !p),
            }}
        >
            {children}
        </AIChatContext.Provider>
    );
}

export function useAIChat() {
    return useContext(AIChatContext);
}
