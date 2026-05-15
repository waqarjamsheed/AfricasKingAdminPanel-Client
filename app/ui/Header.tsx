"use client";

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import SideMenu from './SideMenu';
import Modal from './Modal';
import NavigationLoader from './NavigationLoader';
import LoaderOverlay from './LoaderOverlay';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // null = loading/unknown; true/false = resolved
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState<boolean>(false);
  const auth = getAuth(app);
  const pathname = usePathname();
  const showMenu = loggedIn === true || (!!pathname && (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/credentials') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/change-password')
  ));

  // Always show header; we reuse the same SideMenu for admin too.

  useEffect(() => {
    fetch(apiPath('/api/settings/public'), { cache: 'no-store' })
      .then((res) => res.json().catch(() => null as any).then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (ok && typeof json?.allowRegistration === 'boolean') {
          setAllowRegistration(json.allowRegistration);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Seed from cookie quickly to avoid flicker on protected pages
    try {
      const hasSession = document.cookie.split(';').some(c => c.trim().startsWith('session='));
      if (hasSession) setLoggedIn(true);
    } catch {}
    const unsub = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user);
    });
    return () => unsub();
  }, [auth]);

  async function logout() {
    setConfirmOpen(false);
    setLoggingOut(true);
    try { window.dispatchEvent(new Event('ak:navigate-start')); } catch {}
    try { await fetch(apiPath('/api/auth/session'), { method: 'DELETE' }); } catch {}
    try { await auth.signOut(); } catch {}
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    window.location.href = '/login?loggedout=1';
  }

  return (
    <>
      <NavigationLoader />
      <LoaderOverlay open={loggingOut} text="Logging out…" />
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3" style={{ background: 'var(--ak-nav)', borderBottom: '1px solid var(--ak-border)' }}>
        <span className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ak-text)' }}>
          <img src="/icon.png" alt="AfricasKing" className="w-8 h-8" />
          AfricasKing
        </span>
        <ThemeToggle />
      </header>
      <Modal open={confirmOpen} title="Confirm Logout" onClose={() => setConfirmOpen(false)}>
        <p className="text-sm">Are you sure you want to logout?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setConfirmOpen(false)}>Cancel</button>
          <button onClick={logout}>Logout</button>
        </div>
      </Modal>
    </>
  );
}
