"use client";

/* eslint-disable @next/next/no-img-element */
import ThemeToggle from './ThemeToggle';
import Modal from './Modal';
import LoaderOverlay from './LoaderOverlay';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { app, db } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unsubConfirmOpen, setUnsubConfirmOpen] = useState(false);
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [unsubDone, setUnsubDone] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const auth = getAuth(app);
  const pathname = usePathname();
  const hideOnPaths = ['/', '/login', '/register', '/forgot'];

  useEffect(() => {
    try {
      const hasSession = document.cookie.split(';').some(c => c.trim().startsWith('session='));
      if (hasSession) setLoggedIn(true);
    } catch {}
    let unsubDoc: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user);
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      if (user) {
        unsubDoc = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          const data = snap.data() as any;
          setSubscriptionId(data?.subscriptionId || null);
        });
      } else {
        setSubscriptionId(null);
      }
    });
    return () => { if (unsubDoc) unsubDoc(); unsubAuth(); };
  }, [auth]);

  const handleUnsubscribe = async () => {
    if (!subscriptionId) return;
    setUnsubLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(apiPath('/api/subscription/cancel'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ subscriptionId }),
      });
      if (res.ok) setUnsubDone(true);
    } catch {}
    finally { setUnsubLoading(false); setUnsubConfirmOpen(false); }
  };

  if (hideOnPaths.includes(pathname)) return null;

  return (
    <>
      <LoaderOverlay open={loggingOut} text="Logging out…" />

      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-2.5"
        style={{ background: 'var(--ak-nav)', borderBottom: '1px solid var(--ak-border)' }}
      >
        {/* Left: logo + unsubscribe */}
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="AfricasKing" className="w-6 h-6" />
          {loggedIn && (
            <button
              onClick={() => { setUnsubDone(false); setUnsubConfirmOpen(true); }}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: '#f44335' }}
            >
              Unsubscribe
            </button>
          )}
        </div>

        {/* Right: theme toggle */}
        <ThemeToggle />
      </header>

      {/* Unsubscribe confirmation modal */}
      <Modal open={unsubConfirmOpen} title="Unsubscribe" onClose={() => setUnsubConfirmOpen(false)}>
        {unsubDone ? (
          <>
            <p className="text-sm" style={{ color: 'var(--ak-text)' }}>Your subscription has been cancelled.</p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setUnsubConfirmOpen(false)}
                className="px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{ background: '#f44335' }}
              >
                OK
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm" style={{ color: 'var(--ak-text)' }}>Are you sure you want to unsubscribe? Your access will end immediately.</p>
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => setUnsubConfirmOpen(false)}
                className="px-4 py-2 rounded-full text-sm font-semibold border"
                style={{ borderColor: 'var(--ak-border)', color: 'var(--ak-text)' }}
              >
                No
              </button>
              <button
                onClick={handleUnsubscribe}
                disabled={unsubLoading || !subscriptionId}
                className="px-4 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: '#f44335' }}
              >
                {unsubLoading ? 'Cancelling…' : 'Yes'}
              </button>
            </div>
            {!subscriptionId && (
              <p className="mt-2 text-xs" style={{ color: 'var(--ak-muted)' }}>No active subscription found.</p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
