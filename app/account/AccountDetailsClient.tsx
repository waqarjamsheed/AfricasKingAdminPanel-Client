"use client";

import { useEffect, useState } from 'react';
import { app, db } from '@/lib/firebaseClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPath } from '@/lib/clientApi';
import { ShimmerBlock } from '../ui/Shimmer';

const actions = [
  {
    label: 'Change Password',
    href: '/change-password',
    icon: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
  },
  {
    label: 'My Subscription',
    href: '/subscription',
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
  },
  {
    label: 'Login Details',
    href: '/credentials',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </>
    ),
  },
];

export default function AccountDetailsClient() {
  const auth = getAuth(app);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ uid: string; email: string | null; emailVerified: boolean } | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let unsubUserDoc: null | (() => void) = null;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUserInfo(null);
        if (unsubUserDoc) unsubUserDoc();
        setLoading(false);
        return;
      }
      setUserInfo({ uid: user.uid, email: user.email, emailVerified: !!user.emailVerified });
      setDisplayName(user.displayName || null);
      const ref = doc(db, 'users', user.uid);
      unsubUserDoc = onSnapshot(ref, (snap: DocumentSnapshot<DocumentData>) => {
        const data = (snap.data() || {}) as { status?: unknown; displayName?: unknown };
        setStatus(typeof data.status === 'string' ? data.status : null);
        if (typeof data.displayName === 'string' && data.displayName.trim()) {
          setDisplayName(data.displayName);
        }
      });
      setLoading(false);
    });
    return () => { if (unsubUserDoc) unsubUserDoc(); unsub(); };
  }, [auth]);

  const logout = async () => {
    setLoggingOut(true);
    try { await fetch(apiPath('/api/auth/session'), { method: 'DELETE' }); } catch {}
    try { await auth.signOut(); } catch {}
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    window.location.href = '/login?loggedout=1';
  };

  if (loading) {
    return (
      <div className="px-4 pt-5 pb-6">
        <ShimmerBlock className="h-6 w-28 mb-4" />
        {/* Account info card skeleton */}
        <div className="rounded-xl p-4 mb-4 border" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
          <ShimmerBlock className="h-3 w-12 mb-2" />
          <ShimmerBlock className="h-4 w-40 mb-3" />
          <ShimmerBlock className="h-3 w-10 mb-2" />
          <ShimmerBlock className="h-4 w-52" />
        </div>
        {/* Action rows skeleton */}
        <div className="space-y-2 mb-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl px-4 py-4 flex items-center gap-3 border" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
              <ShimmerBlock className="w-9 h-9 rounded-full shrink-0" />
              <ShimmerBlock className="h-4 flex-1" />
              <ShimmerBlock className="h-4 w-4 shrink-0" />
            </div>
          ))}
        </div>
        {/* Logout button skeleton */}
        <ShimmerBlock className="h-12 w-full rounded-full" />
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="px-4 pt-10 text-sm" style={{ color: 'var(--ak-muted)' }}>
        Not logged in. <Link href="/login" className="text-[#f44335]">Login</Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-lg font-bold mb-4" style={{ color: 'var(--ak-text)' }}>Account</h1>

      {/* Account info card */}
      <div className="rounded-xl p-4 mb-4 border" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
        <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--ak-muted)' }}>Name</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--ak-text)' }}>{displayName || '—'}</p>
        <p className="text-xs mt-2 uppercase tracking-wide mb-0.5" style={{ color: 'var(--ak-muted)' }}>Email</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--ak-text)' }}>{userInfo.email || '—'}</p>
        {status && (
          <>
            <p className="text-xs mt-2 uppercase tracking-wide mb-0.5" style={{ color: 'var(--ak-muted)' }}>Status</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--ak-text)' }}>{status}</p>
          </>
        )}
      </div>

      {/* Action list */}
      <div className="space-y-2 mb-4">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="w-full rounded-xl px-4 py-4 flex items-center gap-3 border"
            style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)', textDecoration: 'none', display: 'flex' }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--ak-card2)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="2">
                {action.icon}
              </svg>
            </div>
            <span className="text-sm font-medium flex-1" style={{ color: 'var(--ak-text)' }}>{action.label}</span>
            <span style={{ color: 'var(--ak-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        disabled={loggingOut}
        className="w-full py-3.5 bg-[#f44335] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {loggingOut ? 'Logging out…' : 'Logout'}
      </button>
    </div>
  );
}
