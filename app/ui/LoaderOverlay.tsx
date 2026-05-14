"use client";

import React from 'react';
import { createPortal } from 'react-dom';

export default function LoaderOverlay({ open, text }: { open: boolean; text?: string }) {
  if (!open || typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-md bg-white dark:bg-gray-900 px-4 py-3 shadow-soft border border-black/10 dark:border-white/10">
        <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span className="text-sm">{text || 'Processing…'}</span>
      </div>
    </div>,
    document.body
  );
}
