"use client";

import { useEffect, useMemo, useState } from 'react';
import { app, db } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot as onSnap,
  type DocumentData,
  type DocumentSnapshot,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import Link from 'next/link';
import Modal from '../ui/Modal';
import CancelSubscriptionOverlay from '../components/CancelSubscriptionOverlay';
import { LocalTime } from '../components/LocalTime';
import { normalizeAccountType } from '@/lib/accountTypes';
import { toMillisSafe } from '@/lib/datetime';
import { deriveUserDisplayStatus, getUserStatusBadgeClass, getUserStatusLabel } from '@/lib/userStatus';
import { getProvisionStatus, getProvisionStatusBadgeClass, getProvisionStatusLabel } from '@/lib/provisionStatus';

type ProvisionAccount = {
  id: string;
  subscriptionId: string;
  accountType: 'normal' | 'kids';
  username?: string | null;
  password?: string | null;
  expiresAt?: number | null;
  status?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelAtPeriodEndAt?: number | null;
};

export default function SubscriptionDetailsClient() {
  const [mounted, setMounted] = useState(false);
  const auth = getAuth(app);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [serverExpiresAt, setServerExpiresAt] = useState<number | null>(null);
  const [clientExpiresAt, setClientExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ProvisionAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [payNowLoading, setPayNowLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelOverlayOpen, setCancelOverlayOpen] = useState(false);
  const filterClientTransactions = (list: any[]) => list.filter((t) => (t as any)?.type !== 'subscription_resumed');
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

  useEffect(() => {
    setMounted(true);
    let unsubUserDoc: null | (() => void) = null;
    let unsubTx: null | (() => void) = null;
    let unsubProv: null | (() => void) = null;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUid(null);
        setAllowed(null);
        setServerExpiresAt(null);
        setClientExpiresAt(null);
        setAccounts([]);
        setAccountsLoading(false);
        if (unsubUserDoc) unsubUserDoc();
        if (unsubTx) unsubTx();
        if (unsubProv) unsubProv();
        setTransactions([]);
        setLoading(false);
        return;
      }
      setUid(user.uid);
      // Read client-side expiry/credentials from Firestore
      const ref = doc(db, 'users', user.uid);
      unsubUserDoc = onSnapshot(ref, (snap: DocumentSnapshot<DocumentData>) => {
        const data = (snap.data() || {}) as any;
        setClientExpiresAt(normalizeExpires(data?.accessExpiresAt));
        setSubscriptionId(data?.subscriptionId || null);
        setStatus((data?.status as string | undefined) || null);
        setSubscriptionStatus((data?.subscriptionStatus as string | undefined) || null);
        const cancelAt = typeof data?.accessExpiresAt === 'number' ? data.accessExpiresAt : null;
      });
      // Live-listen to user's transactions (top-level collection)
      try {
        setTxLoading(true);
        const qTx = query(
          collection(db, 'transactions'),
          where('uid', '==', user.uid),
          orderBy('created', 'desc'),
          limit(200)
        );
        unsubTx = onSnap(qTx, (qs: QuerySnapshot<DocumentData>) => {
          const items = qs.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) }));
          setTransactions(filterClientTransactions(items));
          setTxLoading(false);
        }, () => { setTransactions([]); setTxLoading(false); });
      } catch {
        setTransactions([]);
        setTxLoading(false);
      }
      // Live-listen to MegaOTT provisions for multiple accounts
      try {
        setAccountsLoading(true);
        const qProv = query(
          collection(db, 'provisions'),
          where('uid', '==', user.uid)
        );
        unsubProv = onSnap(qProv, (qs: QuerySnapshot<DocumentData>) => {
          const items = qs.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
            const data = d.data() as any;
            return {
              id: d.id,
              subscriptionId: typeof data.subscriptionId === 'string' ? data.subscriptionId : d.id,
              accountType: normalizeAccountType(data.accountType),
              username: typeof data.username === 'string' ? data.username : null,
              password: typeof data.password === 'string' ? data.password : null,
              expiresAt: normalizeExpires(data.expiresAt ?? data.accessExpiresAt),
              status: typeof data.status === 'string' ? data.status : null,
              cancelAtPeriodEnd: data.cancel_at_period_end === true || data.cancelAtPeriodEnd === true,
              cancelAtPeriodEndAt: typeof data.cancel_at_period_end_at === 'number'
                ? data.cancel_at_period_end_at
                : (typeof data.cancelAtPeriodEndAt === 'number' ? data.cancelAtPeriodEndAt : null),
            } as ProvisionAccount;
          });
          items.sort((a: ProvisionAccount, b: ProvisionAccount) => (b.expiresAt || 0) - (a.expiresAt || 0));
          setAccounts(items);
          setAccountsLoading(false);
        }, (err: FirestoreError) => {
          console.warn('Provisions listener error', err);
          setAccounts([]);
          setAccountsLoading(false);
          void (async () => {
            try {
              const snap = await getDocs(qProv);
              const items = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
                const data = d.data() as any;
                return {
                  id: d.id,
                  subscriptionId: typeof data.subscriptionId === 'string' ? data.subscriptionId : d.id,
                  accountType: normalizeAccountType(data.accountType),
                  username: typeof data.username === 'string' ? data.username : null,
                  password: typeof data.password === 'string' ? data.password : null,
                  expiresAt: normalizeExpires(data.expiresAt ?? data.accessExpiresAt),
                  status: typeof data.status === 'string' ? data.status : null,
                  cancelAtPeriodEnd: data.cancel_at_period_end === true || data.cancelAtPeriodEnd === true,
                  cancelAtPeriodEndAt: typeof data.cancel_at_period_end_at === 'number'
                    ? data.cancel_at_period_end_at
                    : (typeof data.cancelAtPeriodEndAt === 'number' ? data.cancelAtPeriodEndAt : null),
                } as ProvisionAccount;
              });
              items.sort((a: ProvisionAccount, b: ProvisionAccount) => (b.expiresAt || 0) - (a.expiresAt || 0));
              setAccounts(items);
            } catch (fallbackErr) {
              console.warn('Provisions fallback load failed', fallbackErr);
            } finally {
              setAccountsLoading(false);
            }
          })();
        });
      } catch {
        setAccounts([]);
        setAccountsLoading(false);
      }
      // Ask server for authoritative eligibility/expiry
      try {
        const token = await user.getIdToken();
        const res = await fetch(apiPath('/api/subscription/eligibility'), { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (data?.reason === 'no_db') {
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
      setLoading(false);
    });
    return () => { if (unsubUserDoc) unsubUserDoc(); if (unsubTx) unsubTx(); if (unsubProv) unsubProv(); unsub(); };
  }, [auth]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (transactions || []).filter((t) => {
      const s = normalizeTxnStatus(t);
      if (filterStatus && s !== filterStatus) return false;
      if (!q) return true;
      const txn = (t as any).transactionNo ?? (t as any)['transaction no'] ?? '';
      const hay = [t.invoiceId, t.currency, t.priceId, t.username, t.subscriptionId, txn]
        .map(v => (v ? String(v).toLowerCase() : ''))
        .join(' ');
      return hay.includes(q);
    });
    return list;
  }, [transactions, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);
  const cancelOptions = useMemo(() => {
    const base = accounts
      .filter((a) => getProvisionStatus(a).displayStatus !== 'canceled')
      .map((a) => ({
        id: a.subscriptionId || a.id,
        label: `${a.accountType === 'kids' ? 'Kids' : 'Normal'} account${a.username ? ` • ${a.username}` : ''}`,
      }))
      .filter((o) => Boolean(o.id));
    if (base.length === 0 && subscriptionId) {
      base.push({ id: subscriptionId, label: 'Primary subscription' });
    }
    const seen = new Set<string>();
    return base.filter((o) => {
      if (!o.id || seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
  }, [accounts, subscriptionId]);
  const allAccountsCanceled = accounts.length > 0 && accounts.every((a) => getProvisionStatus(a).displayStatus !== 'active');
  const accountHasAccess = (a: ProvisionAccount) => getProvisionStatus(a).hasAccess;

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto my-20 p-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        <p className="mt-3 text-gray-500">Loading subscription…</p>
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

  const hasAccounts = accounts.length > 0;
  const hasActiveAccount = accounts.some(accountHasAccess);
  const maxAccounts = 5;
  const activeAccountCount = accounts.filter(accountHasAccess).length;
  const maxAccountsReached = activeAccountCount >= maxAccounts;
  const maxAccountExpiry = accounts.reduce<number | null>((acc, a) => {
    if (!accountHasAccess(a) || !a.expiresAt) return acc;
    if (acc === null) return a.expiresAt;
    return a.expiresAt > acc ? a.expiresAt : acc;
  }, null);
  const activeUntil = maxAccountExpiry || serverExpiresAt || clientExpiresAt;
  const clientExpired = (() => {
    if (!clientExpiresAt) return true;
    const ts = typeof clientExpiresAt === 'number' ? clientExpiresAt : toMillisSafe(clientExpiresAt);
    if (ts === null || !Number.isFinite(ts)) return true;
    return ts <= Date.now();
  })();
  const hasHistory = hasAccounts || Boolean(subscriptionId) || (transactions || []).some(t => (t?.paymentStatus === 1) || t?.type === 'invoice' || t?.type === 'provision');
  const singleAccount = accounts.length <= 1;
  const hasSubscription = !!subscriptionId;
  const derivedStatus = deriveUserDisplayStatus({
    status,
    subscriptionStatus,
    accessExpiresAt: activeUntil,
    provisions: accounts,
    hasHistory,
  });
  const isTrialing = derivedStatus === 'trialing' && accounts.length <= 1;
  const isPastDue = derivedStatus === 'past_due';
  const canSubscribe = !hasActiveAccount && !isPastDue && (allowed === null ? clientExpired || derivedStatus === 'canceled' : allowed || derivedStatus === 'canceled');
  const isCanceling = derivedStatus === 'canceled';
  const statusLabel = getUserStatusLabel(derivedStatus);
  const statusClass = getUserStatusBadgeClass(derivedStatus);
  

  const openBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const token = await getAuth(app).currentUser?.getIdToken();
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
      const token = await getAuth(app).currentUser?.getIdToken();
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

  const cancelSubscriptionRequest = async (subId: string) => {
    const token = await getAuth(app).currentUser?.getIdToken();
    const res = await fetch(apiPath('/api/subscription/cancel'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ subscriptionId: subId })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(j?.error || 'Failed to cancel subscription.');
    }
    return j as { current_period_end?: number | null };
  };

  const applyCancelState = () => {
    setStatus('canceled');
    setSubscriptionStatus('canceled');
  };

  const handleCancelSubscription = async (subId?: string | null) => {
    const target = subId || subscriptionId;
    if (!target) return;
    setCancelLoading(true);
    try {
      const j = await cancelSubscriptionRequest(target);
      applyCancelState();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to cancel subscription.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancelAllSubscriptions = async (ids: string[]) => {
    if (ids.length === 0) return;
    setCancelLoading(true);
    try {
      for (const id of ids) {
        await cancelSubscriptionRequest(id);
      }
      applyCancelState();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to cancel subscriptions.');
    } finally {
      setCancelLoading(false);
    }
  };

  const subscribeHref = '/subscribe';
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
    tone: keyof typeof actionStyles;
    onClick?: () => void;
    href?: string;
    disabled?: boolean;
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
      label: canSubscribe ? 'Subscribe' : maxAccountsReached ? 'Limit reached' : 'Add account',
      desc: canSubscribe
        ? 'Start your plan'
        : maxAccountsReached
          ? `Maximum ${maxAccounts} active accounts`
          : 'Add another account',
      icon: 'fa-solid fa-circle-plus',
      href: maxAccountsReached && !canSubscribe ? undefined : subscribeHref,
      disabled: maxAccountsReached && !canSubscribe,
      title: maxAccountsReached && !canSubscribe ? `You can have up to ${maxAccounts} active accounts.` : undefined,
      tone: maxAccountsReached && !canSubscribe ? 'muted' : 'primary',
    });
  }
  if (hasSubscription) {
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
  actions.push({
    key: 'credentials',
    label: 'Login details',
    desc: 'View app login info',
    icon: 'fa-solid fa-key',
    href: '/credentials',
    tone: 'neutral',
  });
  if (hasSubscription || hasAccounts) {
    const cancelDisabled = cancelLoading || allAccountsCanceled;
    actions.push({
      key: 'unsubscribe',
      label: cancelDisabled ? 'Unsubscribed' : cancelLoading ? 'Cancelling…' : 'Unsubscribe',
      desc: cancelDisabled ? 'Canceled' : 'Cancel plan immediately',
      icon: 'fa-solid fa-ban',
      onClick: () => setCancelOverlayOpen(true),
      disabled: cancelDisabled,
      tone: cancelDisabled ? 'muted' : 'danger',
    });
  }

  return (
    <main className="max-w-6xl mx-auto my-8 p-4">
      <Modal open={!!errorMsg} title="Error" onClose={() => setErrorMsg(null)}>
        <p className="text-sm text-gray-700 dark:text-gray-200">{errorMsg}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setErrorMsg(null)}>OK</button>
        </div>
      </Modal>
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
                <div className="text-xs uppercase tracking-[0.2em] text-white/60">Subscription</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-semibold">AfricasKing Plan</h2>
                  <span className={`text-xs px-2 py-1 rounded-full backdrop-blur ${statusClass}`}>{statusLabel}</span>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  {isTrialing ? (
                    'Trial active. Enjoy full access during your trial.'
                  ) : isPastDue ? (
                    'Payment failed. Update billing to keep streaming.'
                  ) : isCanceling ? (
                    'Subscription canceled.'
                  ) : canSubscribe ? (
                    'No active subscription found.'
                  ) : (
                    'Your subscription is active.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/80">
                <i className="fa-solid fa-user-group" aria-hidden="true" />
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
              </div>
              {hasAccounts ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/70">
                  <i className="fa-solid fa-circle-check" aria-hidden="true" />
                  {activeAccountCount} / {maxAccounts} active
                </div>
              ) : null}
            </div>

            {isPastDue && singleAccount ? (
              <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
                Payment failed. Please update your payment method or pay the invoice.
              </div>
            ) : null}
            {isCanceling ? (
              <div className="rounded-lg border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-100">
                Subscription canceled. Access ends immediately.
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-white/60">Accounts</div>
              <div className="mt-2 text-lg font-semibold">{accounts.length}</div>
              <div className="mt-1 text-xs text-white/60">Linked profiles</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              Manage billing, add accounts, or unsubscribe using Quick actions below.
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-soft">
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

      <CancelSubscriptionOverlay
        open={cancelOverlayOpen}
        onClose={() => setCancelOverlayOpen(false)}
        cancelOptions={cancelOptions}
        defaultSubId={subscriptionId || cancelOptions[0]?.id || null}
        cancelScheduled={isCanceling}
        cancelLoading={cancelLoading}
        allAccountsCanceled={allAccountsCanceled}
        onCancelOne={handleCancelSubscription}
        onCancelAll={handleCancelAllSubscriptions}
      />

      <section className="mt-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">My accounts</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your app login details.</p>
          </div>
          <Link href="/credentials" className="text-sm font-medium text-primary hover:underline">View login details</Link>
        </div>
        {accountsLoading ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading accounts…</p>
        ) : accounts.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {accounts.map((acct, idx) => {
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
            No accounts yet. Subscribe to activate your first account.
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">All transactions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">History of invoices and payments.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Search (txn no, invoice, currency)"
              className="h-10 rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800 px-3 text-sm"
            />
            <select value={filterStatus} onChange={(e) => { setPage(1); setFilterStatus(e.target.value); }}
              className="h-10 rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-800 px-3 text-sm">
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="trial">Trial</option>
              <option value="refunded">Refunded</option>
              <option value="canceled">Canceled</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
              <option value="processing">Processing</option>
            </select>
          </div>
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
              {txLoading ? (
                <tr><td colSpan={5} className="py-6 text-center text-gray-500">Loading…</td></tr>
              ) : pageItems.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-gray-500">No transactions found.</td></tr>
              ) : (
                pageItems.map((t, idx) => {
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
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <div className="text-gray-500">Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button className="px-3 h-8 rounded border border-black/10 dark:border-white/10 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <button className="px-3 h-8 rounded border border-black/10 dark:border-white/10 disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">Back to Dashboard</Link>
      </div>
    </main>
  );
}
