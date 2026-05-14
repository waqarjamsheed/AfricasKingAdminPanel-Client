"use client";

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    root.dataset.theme = isDark ? 'dark' : 'light';
    root.style.colorScheme = isDark ? 'dark' : 'light';
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      className="ml-1 btn-ghost inline-flex items-center gap-2 rounded-md h-11 px-4 text-sm"
    >
      {!mounted ? (
        <span className="inline-flex items-center gap-1" suppressHydrationWarning>
          •
        </span>
      ) : theme === 'dark' ? (
        <span className="inline-flex items-center gap-1" suppressHydrationWarning>
          ☀️ <span className="hidden sm:inline">Light</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1" suppressHydrationWarning>
          🌙 <span className="hidden sm:inline">Dark</span>
        </span>
      )}
    </button>
  );
}
