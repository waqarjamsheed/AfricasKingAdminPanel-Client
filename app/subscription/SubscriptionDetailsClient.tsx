"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { app, db } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  onSnapshot as onSnap,
  type DocumentData,
  type DocumentSnapshot,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { ShimmerBlock } from '../ui/Shimmer';
import Modal from '../ui/Modal';
import CancelSubscriptionOverlay from '../components/CancelSubscriptionOverlay';
import { normalizeAccountType } from '@/lib/accountTypes';
import { toMillisSafe } from '@/lib/datetime';
import { deriveUserDisplayStatus } from '@/lib/userStatus';
import { getProvisionStatus } from '@/lib/provisionStatus';

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
  const router = useRouter();
  const auth = getAuth(app);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [serverExpiresAt, setServerExpiresAt] = useState<number | null>(null);
  const [clientExpiresAt, setClientExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ProvisionAccount[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelOverlayOpen, setCancelOverlayOpen] = useState(false);

  const normalizeExpires = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    return toMillisSafe(val);
  };

  useEffect(() => {
    let unsubUserDoc: null | (() => void) = null;
    let unsubProv: null | (() => void) = null;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUid(null);
        setAllowed(null);
        setServerExpiresAt(null);
        setClientExpiresAt(null);
        setAccounts([]);
        if (unsubUserDoc) unsubUserDoc();
        if (unsubProv) unsubProv();
        setLoading(false);
        return;
      }
      setUid(user.uid);
      const ref = doc(db, 'users', user.uid);
      unsubUserDoc = onSnapshot(ref, (snap: DocumentSnapshot<DocumentData>) => {
        const data = (snap.data() || {}) as any;
        setClientExpiresAt(normalizeExpires(data?.accessExpiresAt));
        setSubscriptionId(data?.subscriptionId || null);
        setStatus((data?.status as string | undefined) || null);
        setSubscriptionStatus((data?.subscriptionStatus as string | undefined) || null);
      });
      try {
        const qProv = query(collection(db, 'provisions'), where('uid', '==', user.uid));
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
        }, (err: FirestoreError) => {
          console.warn('Provisions listener error', err);
          setAccounts([]);
        });
      } catch {
        setAccounts([]);
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch(apiPath('/api/subscription/eligibility'), { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setAllowed(data?.reason === 'no_db' ? null : !!data.allowed);
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
    return () => { if (unsubUserDoc) unsubUserDoc(); if (unsubProv) unsubProv(); unsub(); };
  }, [auth]);

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
      <div className="px-4 pt-5 pb-6">
        <ShimmerBlock className="h-6 w-24 mb-2" />
        <ShimmerBlock className="h-3 w-40 mb-5" />
        <div className="rounded-2xl overflow-hidden border-2 mb-4" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card)' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4" style={{ borderBottom: i < 2 ? '1px solid var(--ak-border)' : 'none' }}>
              <ShimmerBlock className="w-10 h-10 rounded-full shrink-0" />
              <ShimmerBlock className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-4 border-2 space-y-2" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card)' }}>
          <ShimmerBlock className="h-3 w-20" />
          <ShimmerBlock className="h-5 w-48" />
          <ShimmerBlock className="h-3 w-64" />
        </div>
      </div>
    );
  }

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
  const hasHistory = accounts.length > 0 || Boolean(subscriptionId);
  const hasSubscription = !!subscriptionId;
  const derivedStatus = deriveUserDisplayStatus({
    status,
    subscriptionStatus,
    accessExpiresAt: activeUntil,
    provisions: accounts,
    hasHistory,
  });
  const canSubscribe = !hasActiveAccount && !maxAccountsReached &&
    (allowed === null ? clientExpired || derivedStatus === 'canceled' : allowed || derivedStatus === 'canceled');
  const isCanceling = derivedStatus === 'canceled';
  const cancelDisabled = cancelLoading || allAccountsCanceled;

  const openBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const token = await getAuth(app).currentUser?.getIdToken();
      const res = await fetch(apiPath('/api/billing/portal'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Failed to open billing portal');
      window.location.href = data.url;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to open billing portal');
    } finally {
      setBillingLoading(false);
    }
  };

  const cancelSubscriptionRequest = async (subId: string) => {
    const token = await getAuth(app).currentUser?.getIdToken();
    const res = await fetch(apiPath('/api/subscription/cancel'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ subscriptionId: subId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || 'Failed to cancel subscription.');
    return j;
  };

  const handleCancelSubscription = async (subId?: string | null) => {
    const target = subId || subscriptionId;
    if (!target) return;
    setCancelLoading(true);
    try {
      await cancelSubscriptionRequest(target);
      setStatus('canceled');
      setSubscriptionStatus('canceled');
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
      for (const id of ids) await cancelSubscriptionRequest(id);
      setStatus('canceled');
      setSubscriptionStatus('canceled');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to cancel subscriptions.');
    } finally {
      setCancelLoading(false);
    }
  };

  const rows: Array<{ key: string; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }> = [
    {
      key: 'add-card',
      label: 'Add New Card',
      icon: (
        <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: '#f44335' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      ),
      onClick: canSubscribe ? () => router.push('/subscribe') : openBillingPortal,
      disabled: billingLoading,
    },
    {
      key: 'manage-cards',
      label: billingLoading ? 'Opening…' : 'Manage Cards',
      icon: (
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--ak-card2)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </div>
      ),
      onClick: openBillingPortal,
      disabled: billingLoading,
    },
    {
      key: 'unsubscribe',
      label: cancelDisabled ? 'Unsubscribed' : 'Unsubscribe',
      icon: (
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(244,67,53,0.1)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
      ),
      onClick: () => setCancelOverlayOpen(true),
      disabled: cancelDisabled,
    },
  ];

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--ak-text)' }}>Payment</h1>
      <p className="text-xs mb-5" style={{ color: 'var(--ak-muted)' }}>Manage your subscription</p>

      <Modal open={!!errorMsg} title="Error" onClose={() => setErrorMsg(null)}>
        <p className="text-sm" style={{ color: 'var(--ak-text)' }}>{errorMsg}</p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setErrorMsg(null)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#f44335' }}
          >
            OK
          </button>
        </div>
      </Modal>

      <div className="rounded-2xl overflow-hidden border-2 mb-4" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
        {rows.map((row, idx) => (
          <button
            key={row.key}
            onClick={row.onClick}
            disabled={row.disabled}
            className="w-full flex items-center gap-4 px-4 py-4 text-left disabled:opacity-50"
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: idx < rows.length - 1 ? '1px solid var(--ak-border)' : 'none',
              cursor: row.disabled ? 'default' : 'pointer',
            }}
          >
            {row.icon}
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--ak-text)' }}>{row.label}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ak-muted)', flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-4 border-2" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
        <p className="text-xs mb-1" style={{ color: 'var(--ak-muted)' }}>Current Plan</p>
        <p className="text-base font-bold mb-1" style={{ color: 'var(--ak-text)' }}>Africa's King Premium</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ak-muted)' }}>
          {isCanceling
            ? 'Subscription canceled. Contact us to reactivate.'
            : 'Renews Monthly - Payment will display from X4design'}
        </p>
      </div>

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
    </div>
  );
}
