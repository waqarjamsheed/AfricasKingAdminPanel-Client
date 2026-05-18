"use client";

import { useEffect, useState, ReactElement } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';

type NavItem = {
  href: string;
  label: string;
  exact: boolean;
  icon: () => ReactElement;
};

const navItems: NavItem[] = [
  {
    href: '/credentials',
    label: 'Accounts',
    exact: false,
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Applications',
    exact: false,
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/subscription',
    label: 'Payment',
    exact: false,
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    href: '/sports',
    label: 'Sports',
    exact: false,
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24" />
      </svg>
    ),
  },
  {
    href: '/faq',
    label: 'FAQ',
    exact: false,
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/account',
    label: 'Setting',
    exact: false,
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const hideOnPaths = ['/', '/login', '/register', '/forgot'];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth(app);
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, [auth]);

  if (hideOnPaths.includes(pathname)) return null;
  if (user === undefined) return null;
  if (!user) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center py-2 z-50 border-t"
      style={{ background: 'var(--ak-nav)', borderColor: 'var(--ak-border)' }}
    >
      {navItems.map((item, i) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const color = isActive ? '#f44335' : 'var(--ak-muted)';
        return (
          <button
            key={`${item.href}-${i}`}
            className="flex-1 flex flex-col items-center gap-0.5 py-1"
            style={{ color, background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => router.push(item.href)}
          >
            {item.icon()}
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
