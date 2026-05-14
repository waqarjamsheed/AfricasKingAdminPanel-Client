"use client";

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export default function NavLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        // Allow new tab and modifier behaviors
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        try { window.dispatchEvent(new Event('ak:navigate-start')); } catch {}
        // Let the overlay paint at least one frame before navigating
        try {
          requestAnimationFrame(() => router.push(href));
        } catch {
          setTimeout(() => router.push(href), 0);
        }
      }}
    >
      {children}
    </a>
  );
}
