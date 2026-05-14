"use client";

import { useEffect, useState } from 'react';
import { app, db } from '@/lib/firebaseClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import Link from 'next/link';

export default function AccountDetailsClient() {
  const auth = getAuth(app);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ uid: string; email: string | null; emailVerified: boolean } | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isReseller, setIsReseller] = useState(false);

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
      user.getIdTokenResult().then(res => {
        const claims = res.claims as Record<string, unknown>;
        const role = typeof claims.role === 'string' ? claims.role : undefined;
        setIsReseller(claims.reseller === true || role === 'reseller');
      }).catch(() => setIsReseller(false));
      // Listen to user doc for status/subscriptionId
      const ref = doc(db, 'users', user.uid);
      unsubUserDoc = onSnapshot(ref, (snap: DocumentSnapshot<DocumentData>) => {
        const data = (snap.data() || {}) as { status?: unknown; subscriptionId?: unknown; displayName?: unknown };
        const statusVal = typeof data.status === 'string' ? data.status : null;
        setStatus(statusVal);
        // Prefer Firestore profile name when available; fallback to auth profile
        if (typeof data.displayName === 'string' && data.displayName.trim()) {
          setDisplayName(data.displayName);
        }
      });
      setLoading(false);
    });
    return () => { if (unsubUserDoc) unsubUserDoc(); unsub(); };
  }, [auth]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto my-20 p-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        <p className="mt-3 text-gray-500">Loading account…</p>
      </main>
    );
  }

  if (!userInfo) {
    return (
      <main className="max-w-3xl mx-auto my-10 p-4">
        <p>You are not logged in. <Link href="/login" className="underline">Login</Link></p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto my-8 p-4">
      <h2 className="text-2xl font-semibold mb-2">Account Info</h2>
      <div className="mt-2 rounded-lg border border-black/5 dark:border-white/10 p-4 bg-white dark:bg-gray-900 shadow-soft">
        <p><strong>Name:</strong> {displayName || '—'}</p>
        <p><strong>Email:</strong> {userInfo.email || '—'}</p>
        <p><strong>Email Verified:</strong> {userInfo.emailVerified ? 'Yes' : 'No'}</p>
        <p><strong>Status:</strong> {status || '—'}</p>
      </div>
      <div className="mt-4 flex gap-2 flex-wrap">
        {!isReseller && (
          <>
            <Link href="/subscription" className="underline">View Subscription</Link>
            <Link href="/credentials" className="underline">View Login Details</Link>
          </>
        )}
        <Link href="/change-password" className="underline">Change Password</Link>
      </div>
    </main>
  );
}
