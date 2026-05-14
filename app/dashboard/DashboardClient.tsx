"use client";

import { useCallback, useEffect, useState } from 'react';
import { app, db } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  serverTimestamp,
  addDoc,
  type DocumentData,
  type DocumentSnapshot,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import Link from 'next/link';
import { normalizeAccountType } from '@/lib/accountTypes';
import { toMillisSafe } from '@/lib/datetime';
import { deriveUserDisplayStatus, getUserStatusBadgeClass, getUserStatusLabel } from '@/lib/userStatus';
import { getProvisionStatus, getProvisionStatusBadgeClass, getProvisionStatusLabel } from '@/lib/provisionStatus';
import { useRouter, useSearchParams } from 'next/navigation';
import Modal from '../ui/Modal';
import CancelSubscriptionOverlay from '../components/CancelSubscriptionOverlay';
import { LocalTime } from '../components/LocalTime';

type MegaCreds = {
  expiresAt?: string | number | null;
  status?: string;
  subscriptionStatus?: string | null;
  trialEndsAt?: number | null;
};
type ProvisionAccount = {
  id: string;
  subscriptionId: string;
  accountType: 'normal' | 'kids';
  username?: string | null;
  password?: string | null;
  expiresAt?: number | null;
  updatedAt?: number | null;
  status?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelAtPeriodEndAt?: number | null;
};

export default function DashboardClient() {
  const [mounted, setMounted] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [creds, setCreds] = useState<MegaCreds | null>(null);
  const [accounts, setAccounts] = useState<ProvisionAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testDetail, setTestDetail] = useState<string | null>(null);
  const [renewResult, setRenewResult] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [serverExpiresAt, setServerExpiresAt] = useState<number | null>(null);
  const [discountPlan, setDiscountPlan] = useState<string>('nocode');
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [payNowLoading, setPayNowLoading] = useState(false);
  const [cancelScheduled, setCancelScheduled] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelOverlayOpen, setCancelOverlayOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };
  const auth = getAuth(app);
  const search = useSearchParams();
  const router = useRouter();
  const successParam = search?.get('success') || '';
  const sessionIdParam = search?.get('session_id') || '';
  let hasSyncedSession = false;
  if (typeof window !== 'undefined' && sessionIdParam) {
    try { hasSyncedSession = !!localStorage.getItem(`synced_session:${sessionIdParam}`); } catch {}
  }
  const returningFromCheckout = successParam === 'true' && !!sessionIdParam && !hasSyncedSession;
  const generateTransactionNo = () => {
    let s = '';
    for (let i = 0; i < 12; i++) s += Math.floor(Math.random() * 10);
    return s;
  };
  const normalizeExpires = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    return toMillisSafe(val);
  };
  const normalizeTxnStatus = (t: any): string => {
    const raw = typeof t?.status === 'string' ? t.status.toLowerCase().trim() : '';
    const paymentStatus = t?.paymentStatus;
    const fallback = paymentStatus === 1 ? 'paid' : paymentStatus === 0 ? 'processing' : '';
    const source = raw || fallback;
    const type = typeof t?.type === 'string' ? t.type.toLowerCase().trim() : '';
    if (type.includes('subscription_cancel')) return 'canceled';
    if (!source) return 'processing';
    if (['paid', 'succeeded', 'success', 'active'].includes(source)) return 'paid';
    if (['trial', 'trialing'].includes(source)) return 'trial';
    if (['refunded', 'refund', 'credit_note', 'credit-note'].includes(source)) return 'refunded';
    if (['canceled', 'cancelled', 'cancel'].includes(source)) return 'canceled';
    if (['expired'].includes(source)) return 'expired';
    if (['failed', 'fail', 'error'].includes(source)) return 'failed';
    if (['unpaid', 'pending', 'processing', 'open', 'incomplete', 'requires_payment_method', 'requires_action'].includes(source)) return 'processing';
    return source;
  };
  const statusLabelMap: Record<string, string> = {
    paid: 'Paid',
    trial: 'Trial',
    refunded: 'Refunded',
    canceled: 'Canceled',
    failed: 'Failed',
    expired: 'Expired',
    processing: 'Processing',
  };
  const statusBadgeMap: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100',
    trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100',
    refunded: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-100',
    canceled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    failed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-100',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    processing: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  };
  const filterClientTransactions = (list: any[]) => list.filter((t) => (t as any)?.type !== 'subscription_resumed');


  const cancelSubscriptionRequest = async (subId: string) => {
    const res = await fetch(apiPath('/api/subscription/cancel'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: subId })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(j?.error || 'Failed to cancel subscription.');
    }
    return j as { current_period_end?: number | null };
  };

  const handleCancelSubscription = async (subId?: string | null) => {
    const target = subId || subscriptionId;
    if (!target) return;
    setCancelLoading(true);
    try {
      await cancelSubscriptionRequest(target);
      showToast('Subscription canceled.');
      setCancelScheduled(true);
      setCreds((prev) => prev ? { ...prev, subscriptionStatus: 'canceled' } : prev);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to cancel subscription.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancelAllSubscriptions = async (ids: string[]) => {
    if (ids.length === 0) return;
    setCancelLoading(true);
    let successCount = 0;
    try {
      for (const id of ids) {
        await cancelSubscriptionRequest(id);
        successCount += 1;
      }
      showToast(`Canceled ${successCount} account${successCount > 1 ? 's' : ''}.`);
      setCancelScheduled(true);
      setCreds((prev) => prev ? { ...prev, subscriptionStatus: 'canceled' } : prev);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to cancel subscriptions.');
    } finally {
      setCancelLoading(false);
    }
  };


  const openBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(apiPath('/api/billing/portal'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to open billing portal');
      }
      window.location.href = data.url;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to open billing portal');
    } finally {
      setBillingLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!subscriptionId) {
      setErrorMsg('No subscription found to pay.');
      return;
    }
    setPayNowLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(apiPath('/api/renew/now'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ subscriptionId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to open invoice');
      }
      window.location.href = data.url;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to open invoice');
    } finally {
      setPayNowLoading(false);
    }
  };

  useEffect(() => {
    const displayStatus = deriveUserDisplayStatus({
      status: (creds as any)?.status,
      subscriptionStatus: creds?.subscriptionStatus,
      accessExpiresAt: creds?.expiresAt,
      trialEndsAt: creds?.trialEndsAt,
    });
    if (subscriptionId && displayStatus === 'canceled') {
      setCancelScheduled(true);
    }
  }, [subscriptionId, creds]);
  // Global cleanup for logout/session expiry
  const fullClientCleanup = useCallback(async () => {
    try { await fetch(apiPath('/api/auth/session'), { method: 'DELETE' }); } catch {}
    try { await auth.signOut(); } catch {}
    if (typeof window !== 'undefined') {
      try { Object.keys(localStorage).filter(k => k.startsWith('synced_session:')).forEach(k => localStorage.removeItem(k)); } catch {}
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      try {
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(n => caches.delete(n)));
        }
      } catch {}
      try {
        const anyIndexedDB: any = indexedDB as any;
        if (anyIndexedDB && anyIndexedDB.databases) {
          const dbs = await anyIndexedDB.databases();
          await Promise.all(
            (dbs || []).map((d: any) => d?.name ? new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(d.name);
              req.onsuccess = req.onerror = req.onblocked = () => resolve();
            }) : Promise.resolve())
          );
        }
      } catch {}
    }
  }, [auth]);

  useEffect(() => {
    setMounted(true);
    let unsubUser: null | (() => void) = null;
    let unsubTx: null | (() => void) = null;
    let unsubProv: null | (() => void) = null;
    const startFallbackTxListener = (userId: string) => {
      try {
        const qTxFallback = query(
          collection(db, 'transactions'),
          where('uid', '==', userId),
          limit(50)
        );
        unsubTx = onSnapshot(
          qTxFallback,
          (qs: QuerySnapshot<DocumentData>) => {
            const list = qs.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) }));
            list.sort((a: any, b: any) => {
              const aCreated = typeof a.created === 'number' ? a.created : 0;
              const bCreated = typeof b.created === 'number' ? b.created : 0;
              return bCreated - aCreated;
            });
            setTransactions(filterClientTransactions(list) as any[]);
          },
          (err: FirestoreError) => {
            console.warn('Transactions fallback listener error', err);
            setTransactions([]);
          }
        );
      } catch (err) {
        console.warn('Failed to load transactions (fallback)', err);
        setTransactions([]);
      }
    };
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUid(null);
        setCreds(null);
        setAccounts([]);
        setAccountsLoading(false);
        if (unsubUser) unsubUser();
        if (unsubTx) unsubTx();
        if (unsubProv) unsubProv();
        setAuthLoading(false);
        return;
      }
      setUid(user.uid);
      setEmailVerified(!!user.emailVerified);
      // Ask server if subscription is eligible (expiry empty or expired)
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(apiPath('/api/subscription/eligibility'), { headers: { 'Authorization': `Bearer ${idToken}` } });
        if (res.status === 401) {
          await fullClientCleanup();
          router.push('/login?session=expired');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (data?.reason === 'no_db') {
            // Fall back to client expiry if server can't read DB
            setAllowed(null);
          } else {
            setAllowed(!!data.allowed);
          }
          setServerExpiresAt(normalizeExpires(data.expiresAt));
        } else {
          setAllowed(null);
          setServerExpiresAt(null);
        }
      } catch {
        setAllowed(null);
        setServerExpiresAt(null);
      }
      // Live-listen to user doc so credentials appear once webhook writes them
      const userDocRef = doc(db, 'users', user.uid);
      unsubUser = onSnapshot(userDocRef, (snap: DocumentSnapshot<DocumentData>) => {
        const data = snap.data() || {} as any;
        const accessExpires = normalizeExpires(data?.accessExpiresAt);
        setCreds({
          expiresAt: accessExpires,
          status: data?.status,
          subscriptionStatus: data?.subscriptionStatus || null,
          trialEndsAt: data?.trialEndsAt || null,
        });
        setSubscriptionId((data as any)?.subscriptionId || null);
        try {
          const dp = String((data as any)?.discountPlan || 'nocode').toLowerCase();
          setDiscountPlan(dp || 'nocode');
        } catch { setDiscountPlan('nocode'); }
      });

      // Load and live-listen to recent transactions
      try {
        const qTx = query(
          collection(db, 'transactions'),
          where('uid', '==', user.uid),
          orderBy('created', 'desc'),
          limit(50)
        );
        unsubTx = onSnapshot(
          qTx,
          (qs: QuerySnapshot<DocumentData>) => {
            const list = qs.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) }));
            setTransactions(filterClientTransactions(list) as any[]);
          },
          (err: FirestoreError) => {
            console.warn('Transactions listener error', err);
            setTransactions([]);
            if ((err as any)?.code === 'failed-precondition') {
              try { unsubTx?.(); } catch {}
              startFallbackTxListener(user.uid);
            }
          }
        );
      } catch (e) {
        console.warn('Failed to load transactions', e);
        setTransactions([]);
        startFallbackTxListener(user.uid);
      }
      // Load and live-listen to MegaOTT provisions (multiple accounts)
      try {
        setAccountsLoading(true);
        const qProv = query(
          collection(db, 'provisions'),
          where('uid', '==', user.uid)
        );
        unsubProv = onSnapshot(
          qProv,
          (qs: QuerySnapshot<DocumentData>) => {
            const list = qs.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
              const data = d.data() as any;
                return {
                  id: d.id,
                  subscriptionId: typeof data.subscriptionId === 'string' ? data.subscriptionId : d.id,
                  accountType: normalizeAccountType(data.accountType),
                  username: typeof data.username === 'string' ? data.username : null,
                  password: typeof data.password === 'string' ? data.password : null,
                  expiresAt: normalizeExpires(data.expiresAt ?? data.accessExpiresAt),
                  updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : null,
                  status: typeof data.status === 'string' ? data.status : null,
                  cancelAtPeriodEnd: data.cancel_at_period_end === true || data.cancelAtPeriodEnd === true,
                  cancelAtPeriodEndAt: typeof data.cancel_at_period_end_at === 'number'
                    ? data.cancel_at_period_end_at
                    : (typeof data.cancelAtPeriodEndAt === 'number' ? data.cancelAtPeriodEndAt : null),
                } as ProvisionAccount;
              });
            list.sort((a: ProvisionAccount, b: ProvisionAccount) => (b.expiresAt || 0) - (a.expiresAt || 0));
            setAccounts(list);
            setAccountsLoading(false);
          },
          (err: FirestoreError) => {
            console.warn('Provisions listener error', err);
            setAccounts([]);
            setAccountsLoading(false);
            void (async () => {
              try {
                const snap = await getDocs(qProv);
                const list = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
                  const data = d.data() as any;
                  return {
                    id: d.id,
                    subscriptionId: typeof data.subscriptionId === 'string' ? data.subscriptionId : d.id,
                    accountType: normalizeAccountType(data.accountType),
                    username: typeof data.username === 'string' ? data.username : null,
                    password: typeof data.password === 'string' ? data.password : null,
                    expiresAt: normalizeExpires(data.expiresAt ?? data.accessExpiresAt),
                    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : null,
                    status: typeof data.status === 'string' ? data.status : null,
                    cancelAtPeriodEnd: data.cancel_at_period_end === true || data.cancelAtPeriodEnd === true,
                    cancelAtPeriodEndAt: typeof data.cancel_at_period_end_at === 'number'
                      ? data.cancel_at_period_end_at
                      : (typeof data.cancelAtPeriodEndAt === 'number' ? data.cancelAtPeriodEndAt : null),
                  } as ProvisionAccount;
                });
                list.sort((a: ProvisionAccount, b: ProvisionAccount) => (b.expiresAt || 0) - (a.expiresAt || 0));
                setAccounts(list);
              } catch (fallbackErr) {
                console.warn('Provisions fallback load failed', fallbackErr);
              } finally {
                setAccountsLoading(false);
              }
            })();
          }
        );
      } catch (e) {
        console.warn('Failed to load provisions', e);
        setAccounts([]);
        setAccountsLoading(false);
      }
      setAuthLoading(false);
    });
    return () => { if (unsubTx) unsubTx(); if (unsubUser) unsubUser(); if (unsubProv) unsubProv(); unsub(); };
  }, [auth, router, fullClientCleanup]);

  // If returning from Checkout, trigger server-side sync to provision account
  useEffect(() => {
    const success = search?.get('success');
    const sessionId = search?.get('session_id');
    const canceled = search?.get('canceled');
    if (canceled === 'true' && uid) {
      (async () => {
        try {
          const user = auth.currentUser;
          if (!user) throw new Error('Not logged in');
          const token = await user.getIdToken();
          // Try to preview amount for current plan to include in log
          let amount: number | null = null;
          let unit_amount: number | null = null;
          let currency: string | null = null;
          try {
            const pvRes = await fetch(apiPath('/api/checkout/preview'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ plan: discountPlan })
            });
            const pv = await pvRes.json().catch(() => ({}));
            if (pvRes.ok) {
              amount = typeof pv?.amount === 'number' ? pv.amount : null;
              unit_amount = typeof pv?.unit_amount === 'number' ? pv.unit_amount : null;
              currency = (pv?.currency || null) as any;
            }
          } catch {}
          // Write top-level transaction
          try {
            await addDoc(collection(db, 'transactions'), {
              uid,
              type: 'checkout_canceled',
              status: 'canceled',
              discountCode: discountPlan || null,
              amount,
              unit_amount,
              currency,
              paymentStatus: 0,
              created: Date.now(),
              transactionNo: generateTransactionNo(),
            });
          } catch {}
        } finally {
          // Remove the canceled param to avoid duplicate logs on refresh
          try { router.replace('/dashboard'); } catch {}
        }
      })();
    }
    if (success === 'true' && sessionId && uid) {
      // Prevent duplicate sync on refresh using localStorage flag
      if (typeof window !== 'undefined') {
        const key = `synced_session:${sessionId}`;
        if (localStorage.getItem(key)) return;
      }
      (async () => {
        try {
          setProvisioning('Provisioning your account…');
          const user = auth.currentUser;
          if (!user) throw new Error('Not logged in');
          const token = await user.getIdToken();
          if (!token) throw new Error('Failed to get auth token');
          const res = await fetch(apiPath('/api/stripe/sync'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ session_id: sessionId })
          });
          if (res.status === 401) {
            await fullClientCleanup();
            router.push('/login?session=expired');
            return;
          }
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error || 'Sync failed');
          }
          if (data?.result) {
            setCreds((prev) => ({
              ...(prev || {}),
              expiresAt: normalizeExpires((data.result as any)?.accessExpiresAt ?? data.result.expiresAt ?? (prev || {}).expiresAt),
              status: 'active',
              subscriptionStatus: prev?.subscriptionStatus ?? null,
              trialEndsAt: prev?.trialEndsAt ?? null,
            }));
            setSubscriptionId((prev) => (data.subscriptionId as string | undefined) || prev || null);
          }
          // If server couldn't write (local dev), write via client SDK
          if (data?.write === 'client' && data?.result) {
            const uref = doc(db, 'users', uid);
            if (data.result.action === 'created') {
              await setDoc(uref, {
                status: 'active',
                ...(data.subscriptionId ? { subscriptionId: data.subscriptionId } : {}),
                accessExpiresAt: normalizeExpires((data.result as any)?.accessExpiresAt ?? data.result.expiresAt)
              }, { merge: true });
              // Also write top-level provision transaction when server couldn't
              try {
                await addDoc(collection(db, 'transactions'), {
                  uid,
                  type: 'provision',
                  subscriptionId: data.subscriptionId || null,
                  username: data.result.username,
                  password: data.result.password,
                  plan: (data.plan || null),
                  amount: 0,
                  unit_amount: 0,
                  actualAmount: 0,
                  currency: (data.currency || null),
                  priceId: (data.priceId || null),
                  discountCode: (data.plan || null),
                  paymentStatus: 0,
                  created: Date.now(),
                  transactionNo: generateTransactionNo(),
                });
              } catch {}
              // Client fallback: create/update provisions doc so scheduled renewals can resolve priceId later
              try {
                if (data.subscriptionId) {
                  await setDoc(doc(db, 'provisions', data.subscriptionId), {
                    uid,
                    subscriptionId: data.subscriptionId,
                    plan: data.plan || null,
                    accountType: data.accountType || 'normal',
                    priceId: data.priceId || null,
                    username: data.result.username,
                    expiresAt: data.result.expiresAt,
                    updatedAt: Date.now()
                  }, { merge: true });
                }
              } catch {}
              // Client fallback: enqueue welcome email via Trigger Email extension
              try {
                const to = auth.currentUser?.email || undefined;
                if (to) {
                  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
                  const credentialsUrl = baseUrl ? `${baseUrl}/credentials` : '';
                  await addDoc(collection(db, 'mail'), {
                    to,
                    message: {
                      subject: 'Account Subscription Activated',
                      text: [
                        'Welcome! Your account subscription is active.',
                        'For security, your credentials are available on your credentials page.',
                        credentialsUrl ? `Credentials: ${credentialsUrl}` : ''
                      ].filter(Boolean).join('\n'),
                      html: `<p>Welcome! Your account subscription is active.</p>
                        <p>For security, your credentials are available on your credentials page.</p>
                        ${credentialsUrl ? `<p style="margin-top:16px;"><a href="${credentialsUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">View Credentials</a></p>` : ''}`
                    }
                  });
                }
              } catch {}
            } else if (data.result.action === 'extended') {
              await setDoc(uref, {
                status: 'active',
                ...(data.subscriptionId ? { subscriptionId: data.subscriptionId } : {}),
                accessExpiresAt: normalizeExpires((data.result as any)?.accessExpiresAt ?? data.result.expiresAt)
              }, { merge: true });
            }
          }
          // Mark active immediately after successful sync to avoid expired flicker
          if (data?.result?.expiresAt || (data?.result as any)?.accessExpiresAt) {
            setServerExpiresAt(normalizeExpires((data.result as any)?.accessExpiresAt ?? data.result.expiresAt));
          }
          setAllowed(false);
          setProvisioning('Provisioned. It may take a few seconds to appear.');
          if (typeof window !== 'undefined') {
            try { localStorage.setItem(`synced_session:${sessionId}`, '1'); } catch {}
          }
          try { router.replace('/dashboard'); } catch {}
          try { setTimeout(() => setProvisioning(null), 2000); } catch {}
        } catch (e: any) {
          setProvisioning(`Provisioning failed: ${e?.message || e}`);
        }
      })();
    }
    // Manual renew via Checkout success
    if (success === 'renew' && sessionId && uid) {
      if (typeof window !== 'undefined') {
        const key = `synced_manual_session:${sessionId}`;
        if (localStorage.getItem(key)) return;
      }
      (async () => {
        try {
          setProvisioning('Finalizing renewal…');
          const user = auth.currentUser;
          if (!user) throw new Error('Not logged in');
          const token = await user.getIdToken();
          const res = await fetch(apiPath('/api/renew/sync'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ session_id: sessionId }) });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data?.error || 'Renew sync failed');
          }
          if (data?.result) {
            setCreds((prev) => ({
              ...(prev || {}),
              expiresAt: normalizeExpires((data.result as any)?.accessExpiresAt ?? data.result.expiresAt ?? (prev || {}).expiresAt),
              status: 'active',
              subscriptionStatus: prev?.subscriptionStatus ?? null,
              trialEndsAt: prev?.trialEndsAt ?? null,
            }));
            setSubscriptionId((prev) => (data.subscriptionId as string | undefined) || prev || null);
            setServerExpiresAt(normalizeExpires((data.result as any)?.accessExpiresAt ?? (data.result as any)?.expiresAt));
            setAllowed(false);
          }
          if (data?.write === 'client' && data?.result) {
            const uidNow = auth.currentUser?.uid;
            if (uidNow) {
              try {
                await setDoc(doc(db, 'users', uidNow), {
                  status: 'active',
                  accessExpiresAt: normalizeExpires((data.result as any)?.accessExpiresAt ?? data.result.expiresAt)
                }, { merge: true });
              } catch {}
              // Write provisions via client as fallback
              try {
                const provSubId = data.subscriptionId || subscriptionId || null;
                if (provSubId) {
                  await setDoc(doc(db, 'provisions', provSubId), {
                    uid: uidNow,
                    subscriptionId: provSubId,
                    accountType: data.accountType || 'normal',
                    priceId: data.priceId || null,
                    username: data.result.username,
                    expiresAt: data.result.expiresAt,
                    updatedAt: Date.now()
                  }, { merge: true });
                }
              } catch {}
              try {
                const gen = () => Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
                await addDoc(collection(db, 'transactions'), {
                  type: 'manual_renew_checkout', uid: uidNow,
                  subscriptionId: data.subscriptionId || null,
                  priceId: data.priceId || null,
                  plan: data.plan || null,
                  amount: (typeof data.unit_amount === 'number' ? Number(((data.unit_amount/100)).toFixed(2)) : null),
                  unit_amount: (typeof data.unit_amount === 'number' ? data.unit_amount : null),
                  currency: data.currency || null,
                  paymentStatus: 1,
                  created: Date.now(),
                  transactionNo: gen()
                });
              } catch {}
            }
          }
          setProvisioning('Renewal completed. It may take a few seconds to reflect.');
          if (typeof window !== 'undefined') {
            try { localStorage.setItem(`synced_manual_session:${sessionId}`, '1'); } catch {}
          }
          try { router.replace('/dashboard'); } catch {}
          try { setTimeout(() => setProvisioning(null), 2000); } catch {}
        } catch (e: any) {
          setProvisioning(`Renewal finalize failed: ${e?.message || e}`);
        }
      })();
    }
  }, [search, uid, auth, router, fullClientCleanup, discountPlan, subscriptionId, creds]);

  const goToSubscribe = () => {
    if (returningFromCheckout || provisioning) return;
    setSubscribeLoading(true);
    try {
      router.push('/subscribe');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to open subscribe page');
      setSubscribeLoading(false);
    }
  };

  const onTestFirestore = async () => {
    setTestStatus('running');
    setTestDetail(null);
    try {
      const currentUid = getAuth(app).currentUser?.uid || uid;
      if (!currentUid) throw new Error('Not logged in');
      // Write/merge a test timestamp on the user doc
      await setDoc(doc(db, 'users', currentUid), { testWrite: serverTimestamp() }, { merge: true });
      // Create a test transaction entry in top-level collection
      const txRef = await addDoc(collection(db, 'transactions'), {
        uid: currentUid,
        created: Date.now(),
        status: 'healthcheck',
        note: 'manual test from dashboard',
        transactionNo: generateTransactionNo(),
      });
      // Read back user doc to confirm
      const userSnap = await getDoc(doc(db, 'users', currentUid));
      const ok = userSnap.exists() && !!(userSnap.data() as any)?.testWrite;
      setTestStatus(ok ? 'success' : 'partial');
      setTestDetail(`User doc ok: ${ok}. Transaction created: ${txRef.id}`);
    } catch (e: any) {
      setTestStatus('error');
      setTestDetail(e?.message || String(e));
    }
  };

  if (authLoading) {
    return (
      <main className="max-w-3xl mx-auto my-20 p-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary"></div>
        <p className="mt-3 text-gray-500">Loading your dashboard…</p>
      </main>
    );
  }
  if (!uid) {
    return (
      <main className="max-w-3xl mx-auto my-10 p-4">
        <p>You are not logged in. <Link className="underline" href="/login">Login</Link></p>
      </main>
    );
  }
  const cancelOptions = (() => {
    const base = accounts
      .filter((a) => getProvisionStatus(a).displayStatus !== 'canceled')
      .map((a) => ({
        id: a.subscriptionId || a.id,
        label: `${a.accountType === 'kids' ? 'Kids' : 'Normal'} account${a.username ? ` • ${a.username}` : ''}`,
      }))
      .filter((o, idx, arr) => Boolean(o.id) && arr.findIndex((x) => x.id === o.id) === idx) as { id: string; label: string }[];
    if (base.length === 0 && subscriptionId) {
      base.push({ id: subscriptionId, label: 'Primary subscription' });
    }
    return base;
  })();
  const accountHasAccess = (a: ProvisionAccount) => getProvisionStatus(a).hasAccess;
  const hasMultipleCancelOptions = cancelOptions.length > 1;
  const allAccountsCanceled = accounts.length > 0 && accounts.every((a) => getProvisionStatus(a).displayStatus !== 'active');
  const openCancelOverlay = () => {
    setCancelOverlayOpen(true);
  };

  return (
    <main className="max-w-6xl mx-auto mt-2 mb-6 p-4">
      <Modal open={!!errorMsg} title="Error" onClose={() => setErrorMsg(null)}>
        <p className="text-sm text-gray-700 dark:text-gray-200">{errorMsg}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setErrorMsg(null)}>OK</button>
        </div>
      </Modal>
      {(() => {
        const clientExpires = creds?.expiresAt || null;
        const trialEnds = creds?.trialEndsAt ? Number(creds.trialEndsAt) : null;
        const accountList = accounts;
        const hasAccounts = accountList.length > 0;
        const hasActiveAccount = accountList.some(accountHasAccess);
        const maxAccountExpiry = accountList.reduce<number | null>((acc, a) => {
          if (!accountHasAccess(a) || !a.expiresAt) return acc;
          if (acc === null) return a.expiresAt;
          return a.expiresAt > acc ? a.expiresAt : acc;
        }, null);
        const activeUntil = maxAccountExpiry || serverExpiresAt || (typeof clientExpires === 'number' ? clientExpires : toMillisSafe(clientExpires)) || null;
        const hasHistory = hasAccounts || Boolean(subscriptionId) || (transactions || []).some(t => (t?.paymentStatus === 1) || t?.type === 'invoice' || t?.type === 'provision');
        const singleAccount = accountList.length <= 1;
        const derivedStatus = deriveUserDisplayStatus({
          status: creds?.status,
          subscriptionStatus: creds?.subscriptionStatus,
          trialEndsAt: trialEnds,
          accessExpiresAt: activeUntil || clientExpires,
          provisions: accountList,
          hasHistory,
        });
        const isTrialing = derivedStatus === 'trialing';
        const isPastDue = derivedStatus === 'past_due';
        const clientExpired = (() => {
          if (isTrialing) return false;
          if (!clientExpires) return true;
          const ts = typeof clientExpires === 'number' ? clientExpires : toMillisSafe(clientExpires);
          if (ts === null || !Number.isFinite(ts)) return true;
          return ts <= Date.now();
        })();
        const canSubscribe = !hasActiveAccount && !isPastDue && (allowed === null ? clientExpired || derivedStatus === 'canceled' : allowed || derivedStatus === 'canceled');
        const isCanceling = derivedStatus === 'canceled';
        const statusLabel = getUserStatusLabel(derivedStatus);
        const statusClass = getUserStatusBadgeClass(derivedStatus);

        const actionCardBase = 'group flex w-full items-start gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60';
        const actionIconBase = 'flex h-10 w-10 items-center justify-center rounded-lg';
        const actionStyles: Record<string, { card: string; icon: string; desc: string }> = {
          primary: {
            card: 'border-primary/20 bg-primary/5 text-gray-900 dark:text-gray-100',
            icon: 'bg-primary/15 text-primary',
            desc: 'text-gray-600 dark:text-gray-300',
          },
          neutral: {
            card: 'border-black/10 bg-white/80 text-gray-900 dark:border-white/10 dark:bg-gray-900 dark:text-gray-100',
            icon: 'bg-black/5 text-gray-700 dark:bg-white/10 dark:text-gray-100',
            desc: 'text-gray-500 dark:text-gray-400',
          },
          amber: {
            card: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100',
            icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100',
            desc: 'text-amber-800/80 dark:text-amber-100/80',
          },
          danger: {
            card: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100',
            icon: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-100',
            desc: 'text-rose-700/80 dark:text-rose-100/80',
          },
          muted: {
            card: 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-800 dark:bg-gray-900',
            icon: 'bg-gray-100 text-gray-400 dark:bg-gray-800',
            desc: 'text-gray-400',
          },
        };

        const actions: Array<{
          key: string;
          label: string;
          desc: string;
          icon: string;
          onClick?: () => void;
          href?: string;
          disabled?: boolean;
          tone: keyof typeof actionStyles;
          title?: string;
        }> = [];

        if (isPastDue && singleAccount) {
          actions.push({
            key: 'update-billing',
            label: billingLoading ? 'Opening…' : 'Update billing',
            desc: 'Fix your payment method',
            icon: 'fa-regular fa-credit-card',
            onClick: openBillingPortal,
            disabled: billingLoading,
            tone: 'primary',
          });
          actions.push({
            key: 'pay-now',
            label: payNowLoading ? 'Opening…' : 'Pay now',
            desc: 'Pay the latest invoice',
            icon: 'fa-solid fa-bolt',
            onClick: handlePayNow,
            disabled: payNowLoading,
            tone: 'amber',
          });
        } else {
          actions.push({
            key: 'subscribe',
            label: subscribeLoading ? 'Redirecting…' : (returningFromCheckout || provisioning ? 'Finalizing…' : (canSubscribe ? 'Subscribe' : 'Add account')),
            desc: canSubscribe ? 'Start your plan' : 'Add another account',
            icon: 'fa-solid fa-circle-plus',
            onClick: goToSubscribe,
            disabled: subscribeLoading || returningFromCheckout || !!provisioning,
            tone: 'primary',
          });
        }

        if (subscriptionId) {
          actions.push({
            key: 'billing',
            label: billingLoading ? 'Opening…' : 'Billing',
            desc: 'Manage plan and invoices',
            icon: 'fa-regular fa-credit-card',
            onClick: openBillingPortal,
            disabled: billingLoading,
            tone: 'neutral',
          });
        }

        if (hasAccounts) {
          actions.push({
            key: 'credentials',
            label: 'Login details',
            desc: 'View app login info',
            icon: 'fa-solid fa-key',
            href: '/credentials',
            tone: 'neutral',
          });
        }

        if (subscriptionId || hasAccounts) {
          const cancelDisabled = cancelLoading || allAccountsCanceled || (cancelScheduled && !hasMultipleCancelOptions);
          actions.push({
            key: 'unsubscribe',
            label: cancelDisabled ? 'Unsubscribed' : cancelLoading ? 'Cancelling…' : 'Unsubscribe',
            desc: cancelDisabled ? 'Canceled' : 'Cancel plan immediately',
            icon: 'fa-solid fa-ban',
            onClick: openCancelOverlay,
            disabled: cancelDisabled,
            tone: cancelDisabled ? 'muted' : 'danger',
          });
        }

        return (
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-soft">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,.25),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,.25),transparent_45%)]" />
              <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="h-full w-full bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.08)_25%,rgba(255,255,255,.08)_26%,transparent_27%),linear-gradient(90deg,transparent_24%,rgba(255,255,255,.08)_25%,rgba(255,255,255,.08)_26%,transparent_27%)] bg-[size:44px_44px] opacity-10" />
              </div>
              <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <i className="fa-solid fa-satellite-dish" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-white/60">Subscription overview</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-semibold">AfricasKing Access</h2>
                        <span className={`text-xs px-2 py-1 rounded-full backdrop-blur ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white/70">
                        {isTrialing ? (
                          trialEnds ? <>Trial until <LocalTime value={trialEnds} /></> : 'Trial active'
                        ) : isPastDue ? (
                          'Payment failed. Please update your payment method or pay the invoice to keep access.'
                        ) : isCanceling ? (
                          'Subscription canceled.'
                        ) : canSubscribe ? (
                          'No active subscription found.'
                        ) : (
                          'Active'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/80">
                      <i className="fa-solid fa-user-group" aria-hidden="true" />
                      {accountList.length} {accountList.length === 1 ? 'account' : 'accounts'}
                    </div>
                  </div>

                  {isPastDue && singleAccount ? (
                    <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
                      Payment failed. Please update your payment method or pay the invoice to keep access.
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-white/60">Accounts</div>
                    <div className="mt-2 text-lg font-semibold">{accountList.length}</div>
                    <div className="mt-1 text-xs text-white/60">Linked profiles</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                    Use Quick actions below to manage billing, login details, or unsubscribe.
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-soft">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Quick actions</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Everything you need in one place.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {actions.map((action) => {
                  const styles = actionStyles[action.tone] || actionStyles.neutral;
                  const content = (
                    <>
                      <span className={`${actionIconBase} ${styles.icon}`}>
                        <i className={action.icon} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{action.label}</span>
                        <span className={`mt-1 block text-xs ${styles.desc}`}>{action.desc}</span>
                      </span>
                    </>
                  );
                  if (action.href) {
                    return (
                      <Link key={action.key} href={action.href} className={`${actionCardBase} ${styles.card}`}>
                        {content}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={action.key}
                      className={`${actionCardBase} ${styles.card}`}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      title={action.title}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-soft">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Accounts</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your app login details.</p>
                </div>
                {accountList.length > 3 ? (
                  <Link href="/credentials" className="text-sm font-medium text-primary hover:underline">View all</Link>
                ) : (
                  <Link href="/credentials" className="text-sm font-medium text-primary hover:underline">View login details</Link>
                )}
              </div>
              {accountsLoading ? (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading accounts…</p>
              ) : accountList.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {accountList.slice(0, 3).map((acct, idx) => {
                    const statusInfo = getProvisionStatus(acct);
                    const typeLabel = acct.accountType === 'kids' ? 'Kids' : 'Normal';
                    const statusLabel = getProvisionStatusLabel(statusInfo.displayStatus);
                    const statusClass = getProvisionStatusBadgeClass(statusInfo.displayStatus);
                    return (
                      <div key={acct.id || idx} className="rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">{typeLabel} account</div>
                            <div className="mt-1 text-sm font-semibold">{acct.username || '—'}</div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <div>Password</div>
                          <div className="text-right text-gray-700 dark:text-gray-200">••••••••</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 p-6 text-sm text-gray-600 dark:text-gray-400">
                  <p>No accounts yet. Subscribe to activate your first account.</p>
                  {canSubscribe ? (
                    <button
                      className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                      onClick={goToSubscribe}
                    >
                      Subscribe
                    </button>
                  ) : null}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-soft">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Recent transactions</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Latest payments and invoices.</p>
                </div>
                <Link href="/subscription" className="text-sm font-medium text-primary hover:underline">View all</Link>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500 dark:text-gray-400">
                    <tr className="border-b border-black/5 dark:border-white/10">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Transaction</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2 pr-3">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(transactions || []).slice(0, 5).map((t, idx) => {
                      const ts = typeof t.created === 'number' ? t.created : Date.now();
                      const txn = (t as any).transactionNo ?? (t as any)['transaction no'] ?? '—';
                      const amount = typeof t.amount === 'number' && t.currency ? `${t.amount.toFixed(2)} ${String(t.currency).toUpperCase()}` : (typeof t.amount === 'number' ? t.amount.toFixed(2) : '—');
                      const status = normalizeTxnStatus(t);
                      const statusLabel = statusLabelMap[status] || status;
                      const statusBadge = statusBadgeMap[status] || statusBadgeMap.processing;
                      return (
                        <tr key={(t as any).id || idx} className="border-b border-black/5 dark:border-white/5">
                          <td className="py-3 pr-3 whitespace-nowrap"><LocalTime value={ts} /></td>
                          <td className="py-3 pr-3 font-mono">{txn}</td>
                          <td className="py-3 pr-3"><span className={`text-xs px-2 py-1 rounded-full ${statusBadge}`}>{statusLabel}</span></td>
                          <td className="py-3 pr-3">{amount}</td>
                          <td className="py-3 pr-3">
                            {(t as any).hosted_invoice_url ? (
                              <a href={(t as any).hosted_invoice_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">View</a>
                            ) : (t as any).invoiceId ? (
                              <span className="text-gray-500">{(t as any).invoiceId}</span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-500">No transactions yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-soft">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Shortcuts</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Go directly to key pages.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <Link href="/subscription" className="group rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-900 p-4 hover:-translate-y-0.5 hover:shadow-sm transition">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-gray-700 dark:bg-white/10 dark:text-gray-100">
                      <i className="fa-regular fa-credit-card" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Subscriptions</div>
                      <div className="text-xs text-gray-500">Billing history</div>
                    </div>
                  </div>
                </Link>
                <Link href="/credentials" className="group rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-900 p-4 hover:-translate-y-0.5 hover:shadow-sm transition">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-gray-700 dark:bg-white/10 dark:text-gray-100">
                      <i className="fa-solid fa-key" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Login details</div>
                      <div className="text-xs text-gray-500">Usernames &amp; access</div>
                    </div>
                  </div>
                </Link>
                <Link href="/account" className="group rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-900 p-4 hover:-translate-y-0.5 hover:shadow-sm transition">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-gray-700 dark:bg-white/10 dark:text-gray-100">
                      <i className="fa-regular fa-user" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Account</div>
                      <div className="text-xs text-gray-500">Profile &amp; info</div>
                    </div>
                  </div>
                </Link>
                <Link href="/change-password" className="group rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-900 p-4 hover:-translate-y-0.5 hover:shadow-sm transition">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-gray-700 dark:bg-white/10 dark:text-gray-100">
                      <i className="fa-solid fa-lock" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Security</div>
                      <div className="text-xs text-gray-500">Change password</div>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          </div>
        );
      })()}

      {/* Confirm + Provisioning Modals */}
      <Modal open={!!provisioning} title="Provisioning" onClose={() => setProvisioning(null)}>
        <p className={
          provisioning?.startsWith('Provisioned') ? 'text-green-600' : provisioning?.startsWith('Provisioning failed') ? 'text-red-600' : 'text-amber-600'
        }>{provisioning}</p>
        <div className="mt-4 text-right">
          <button onClick={() => setProvisioning(null)}>Close</button>
        </div>
      </Modal>

      <CancelSubscriptionOverlay
        open={cancelOverlayOpen}
        onClose={() => setCancelOverlayOpen(false)}
        cancelOptions={cancelOptions}
        defaultSubId={subscriptionId || cancelOptions[0]?.id || null}
        cancelScheduled={cancelScheduled}
        cancelLoading={cancelLoading}
        allAccountsCanceled={allAccountsCanceled}
        onCancelOne={handleCancelSubscription}
        onCancelAll={handleCancelAllSubscriptions}
      />
      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[1001] transition-all duration-150 ${toast ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'}`}>
        {toast && (
          <div className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-sm shadow-soft">
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}
