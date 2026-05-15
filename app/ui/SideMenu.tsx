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
      <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw] relative overflow-hidden shadow-soft p-4 animate-[slideIn_.2s_ease]" style={{ background: 'var(--ak-nav)', borderRight: '1px solid var(--ak-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--ak-text)' }}>
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
        nav :global(a),
        nav :global(button) {
          color: var(--ak-text);
          padding: 8px;
          border-radius: 6px;
          transition: background-color 0.15s;
        }
        nav :global(a:hover),
        nav :global(button:hover) {
          background-color: var(--ak-card2);
        }
      `}</style>
    </div>,
    document.body
  );
}
