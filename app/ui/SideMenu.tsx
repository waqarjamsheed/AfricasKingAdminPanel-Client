"use client";

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function SideMenu({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode; }) {
  if (!open || typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw] relative overflow-hidden bg-white dark:bg-gray-900 border-r border-black/5 dark:border-white/10 shadow-soft p-4 animate-[slideIn_.2s_ease]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-rose-50 to-white dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-900" aria-hidden />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-semibold">
            <img src="/icon.png" alt="AfricasKing" className="h-6 w-6" />
            <span>AfricasKing</span>
          </div>
          <button className="btn-ghost" aria-label="Close menu" onClick={onClose}>✕</button>
        </div>
        <nav className="flex flex-col gap-2">
          {children}
        </nav>
      </aside>
      <style jsx>{`
        @keyframes slideIn { from { transform: translateX(-12px); opacity: .6; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>,
    document.body
  );
}
