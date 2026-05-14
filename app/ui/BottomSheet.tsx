"use client";

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function BottomSheet({ open, title, children, onClose }: { open: boolean; title?: string; children: ReactNode; onClose: () => void; }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg mx-2 rounded-t-2xl bg-white dark:bg-gray-900 shadow-soft border border-black/5 dark:border-white/10">
        <div className="flex justify-center pt-2">
          <div className="h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
          <h3 className="font-semibold text-lg">{title || 'Notice'}</h3>
          <button aria-label="Close" onClick={onClose} className="btn-ghost rounded-md px-2 py-1">✕</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
