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
    <header className="sticky top-0 z-30 backdrop-blur border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-gray-950/60">
      <NavigationLoader />
      <LoaderOverlay open={loggingOut} text="Logging out…" />
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showMenu && (
            <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="btn-ghost inline-flex items-center justify-center h-11 w-11">
              <span className="sr-only">Open menu</span>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          )}
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <img src="/icon.png" alt="AfricasKing" className="h-6 w-6" />
            <span className="hidden sm:inline">AfricasKing</span>
          </Link>
        </div>
        <nav className="flex items-center gap-2">
          {loggedIn === null && (
            <ThemeToggle />
          )}
          {loggedIn === false && (
            <>
              {pathname === '/' && (
                <>
                  {allowRegistration ? (
                    <Link href="/register" className="hidden sm:inline-flex h-11 items-center rounded-md bg-primary px-4 font-semibold text-white">Create Account</Link>
                  ) : null}
                  <Link href="/login" className="inline-flex h-11 items-center rounded-md bg-white/70 px-4 font-semibold text-gray-900 dark:bg-gray-900/60 dark:text-gray-100 border border-black/10 dark:border-white/10">Login</Link>
                </>
              )}
              {allowRegistration && pathname?.startsWith('/login') && (
                <Link href="/register" className="inline-flex h-11 items-center rounded-md bg-primary px-4 font-semibold text-white">Create Account</Link>
              )}
              {pathname?.startsWith('/register') && (
                <Link href="/login" className="inline-flex h-11 items-center rounded-md bg-white/70 px-4 font-semibold text-gray-900 dark:bg-gray-900/60 dark:text-gray-100 border border-black/10 dark:border-white/10">Login</Link>
              )}
              <ThemeToggle />
            </>
          )}
          {loggedIn === true && (
            <ThemeToggle />
          )}
        </nav>
      </div>

      {/* Side Menu for logged-in users */}
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Link href="/dashboard" onClick={() => { window.dispatchEvent(new Event('ak:navigate-start')); setMenuOpen(false); }} className="px-2 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10">Dashboard</Link>
        <Link href="/credentials" onClick={() => { window.dispatchEvent(new Event('ak:navigate-start')); setMenuOpen(false); }} className="px-2 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10">Login Details</Link>
        <Link href="/subscription" onClick={() => { window.dispatchEvent(new Event('ak:navigate-start')); setMenuOpen(false); }} className="px-2 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10">Subscriptions</Link>
        <Link href="/account" onClick={() => { window.dispatchEvent(new Event('ak:navigate-start')); setMenuOpen(false); }} className="px-2 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10">Account Info</Link>
        {loggedIn === true && (
          <Link href="/change-password" onClick={() => { window.dispatchEvent(new Event('ak:navigate-start')); setMenuOpen(false); }} className="px-2 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10">Change Password</Link>
        )}
        <button onClick={() => { setMenuOpen(false); setConfirmOpen(true); }} className="mt-2 text-left px-2 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10">Logout</button>
      </SideMenu>

      {/* Confirm Logout */}
      <Modal open={confirmOpen} title="Confirm Logout" onClose={() => setConfirmOpen(false)}>
        <p className="text-sm">Are you sure you want to logout?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setConfirmOpen(false)}>Cancel</button>
          <button onClick={logout}>Logout</button>
        </div>
      </Modal>
    </header>
  );
}
