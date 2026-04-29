'use client';

import { useTheme } from '@/contexts/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="terminal-btn"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? (
        <span className="flex items-center gap-1.5">
          <span className="text-sm">◑</span>
          <span>dark</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="text-sm">◑</span>
          <span>light</span>
        </span>
      )}
    </button>
  );
}
