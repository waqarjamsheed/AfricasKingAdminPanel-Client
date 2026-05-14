"use client";

import { useEffect, useState } from 'react';
import Modal from './Modal';

export default function ThemePopup() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<'light' | 'dark'>(() => 'light');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const dismissed = localStorage.getItem('theme_prompt_dismissed');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial: 'light' | 'dark' = saved === 'dark' || (!saved && prefersDark) ? 'dark' : 'light';
      setCurrent(initial);
      if (!dismissed) {
        setOpen(true);
      }
    } catch {
      // If localStorage blocked, do nothing
    }
  }, []);

  function applyTheme(t: 'light' | 'dark') {
    setCurrent(t);
    const root = document.documentElement;
    if (t === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('theme', t); } catch {}
  }

  function closePrompt() {
    try { localStorage.setItem('theme_prompt_dismissed', '1'); } catch {}
    setOpen(false);
  }

  return (
    <Modal open={open} title="Choose Your Theme" onClose={closePrompt}>
      <p className="text-sm text-gray-600 dark:text-gray-300">Pick a theme you prefer. You can change it anytime.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => { applyTheme('light'); closePrompt(); }}
          className={"rounded-lg border px-4 py-3 text-sm " + (current === 'light' ? 'border-primary' : 'border-black/10 dark:border-white/10')}
        >
          ☀️ Light
        </button>
        <button
          onClick={() => { applyTheme('dark'); closePrompt(); }}
          className={"rounded-lg border px-4 py-3 text-sm " + (current === 'dark' ? 'border-primary' : 'border-black/10 dark:border-white/10')}
        >
          🌙 Dark
        </button>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={closePrompt}>Close</button>
      </div>
    </Modal>
  );
}

