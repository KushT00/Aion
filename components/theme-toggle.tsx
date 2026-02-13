'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import type { Theme } from '@/types';

const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
];

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const cycle = () => {
        const idx = themes.findIndex((t) => t.value === theme);
        const next = themes[(idx + 1) % themes.length];
        setTheme(next.value);
    };

    const currentTheme = themes.find((t) => t.value === theme) ?? themes[0];
    const Icon = currentTheme.icon;

    return (
        <button
            onClick={cycle}
            className={cn(
                'relative inline-flex items-center justify-center',
                'w-9 h-9 rounded-lg',
                'text-[var(--muted-fg)] hover:text-[var(--fg)]',
                'hover:bg-[var(--muted)]',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
            )}
            title={`Theme: ${currentTheme.label}`}
        >
            <Icon className="w-[18px] h-[18px]" />
        </button>
    );
}
