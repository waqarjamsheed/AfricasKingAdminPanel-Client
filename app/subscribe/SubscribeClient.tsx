"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { app, db } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { type AccountType } from '@/lib/accountTypes';
import { collection, getDocs, query, where, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { getProvisionStatus } from '@/lib/provisionStatus';

type PricePreview = {
  plan?: string | null;
  label?: string | null;
  amount?: number | null;
  unit_amount?: number | null;
  currency?: string | null;
};

const ACCOUNT_CHOICES: Array<{ id: AccountType; label: string; desc: string }> = [
  { id: 'normal', label: 'All content', desc: 'Full catalog access.' },
  { id: 'kids', label: 'Kids content', desc: 'Age-appropriate catalog only.' },
];

export default function SubscribeClient() {
  const auth = getAuth(app);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [price, setPrice] = useState<PricePreview | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeAccountCount, setActiveAccountCount] = useState<number | null>(null);
  const maxAccounts = 5;
  const maxAccountsReached = typeof activeAccountCount === 'number' && activeAccountCount >= maxAccounts;

  const selectedLabel = accountType
    ? ACCOUNT_CHOICES.find((opt) => opt.id === accountType)?.label
    : null;
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUid(null);
        setLoading(false);
        return;
      }
      setUid(user.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    (async () => {
      try {
        setPriceLoading(true);
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch(apiPath('/api/checkout/preview'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({})
        });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok) {
          setPrice({
            plan: (data?.plan as string | undefined) || null,
            label: (data?.label as string | undefined) || null,
            amount: typeof data?.amount === 'number' ? data.amount : null,
            unit_amount: typeof data?.unit_amount === 'number' ? data.unit_amount : null,
            currency: (data?.currency as string | undefined) || null,
          });
        }
      } catch (e: any) {
        if (active) setErrorMsg(e?.message || 'Failed to load price preview');
      } finally {
        if (active) setPriceLoading(false);
      }
    })();
    return () => { active = false; };
  }, [auth, uid]);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'provisions'), where('uid', '==', uid)));
        let count = 0;
        snap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = (doc.data() || {}) as any;
          const status = getProvisionStatus({
            expiresAt: data?.expiresAt ?? data?.accessExpiresAt,
            cancelAtPeriodEnd: data?.cancel_at_period_end ?? data?.cancelAtPeriodEnd,
            cancelAtPeriodEndAt: data?.cancel_at_period_end_at ?? data?.cancelAtPeriodEndAt,
            status: data?.status,
          });
          if (status.hasAccess) count += 1;
        });
        if (active) setActiveAccountCount(count);
      } catch {
        if (active) setActiveAccountCount(null);
      }
    })();
    return () => { active = false; };
  }, [uid]);

  const startCheckout = async () => {
    if (!accountType) {
      setErrorMsg('Select a content access option to continue.');
      return;
    }
    if (maxAccountsReached) {
      setErrorMsg(`Account limit reached (max ${maxAccounts} active accounts).`);
      return;
    }
    try {
      setCheckoutLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const token = await user.getIdToken();
      const res = await fetch(apiPath('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ accountType })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto my-20 p-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        <p className="mt-3 text-gray-500">Loading…</p>
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

  const renderRadioList = () => (
    <div className="space-y-3">
      {ACCOUNT_CHOICES.map((opt) => {
        const selected = accountType === opt.id;
        return (
          <label
            key={opt.id}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition ${
              selected
                ? 'border-red-500 bg-transparent'
                : 'border-white/70 dark:border-white/20 bg-transparent hover:border-white'
            }`}
          >
            <div>
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className="text-xs text-gray-500">{opt.desc}</div>
            </div>
            <input
              type="radio"
              name="contentChoice"
              className={`h-4 w-4 ${selected ? 'accent-red-500' : 'accent-gray-400'}`}
              checked={selected}
              onChange={() => setAccountType(opt.id)}
            />
          </label>
        );
      })}
    </div>
  );

  return (
    <main
      className="min-h-[70vh] bg-gradient-to-b from-white via-white to-amber-50/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900"
      style={{ fontFamily: '"Space Grotesk", "Helvetica Neue", sans-serif' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-500">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              Step 1 of 2
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold">Choose content</h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Select the content for this subscription.
            </p>
          </div>
          <Link href="/subscription" className="text-sm underline">Back to subscriptions</Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 shadow-soft p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Content</h2>
              <span className="text-xs text-gray-500">Required</span>
            </div>
            <div className="mt-4">
              {renderRadioList()}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              You can add more accounts later from your subscriptions page.
            </div>
          </section>

          <aside className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 shadow-soft p-5 md:p-6 space-y-4 lg:sticky lg:top-6 h-fit">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Summary</div>
              <div className="mt-1 text-lg font-semibold">Checkout details</div>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] p-4 space-y-2">
              <div className="text-xs text-gray-500">Selected</div>
              <div className="text-sm font-semibold">{selectedLabel || 'Choose content'}</div>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] p-4">
              <div className="text-xs text-gray-500">Plan</div>
              <div className="mt-1 text-sm font-semibold">{price?.label || 'Subscription'}</div>
              <div className="mt-3 text-xs text-gray-500">Price</div>
              {priceLoading ? (
                <div className="mt-1 text-sm text-gray-500">Loading price…</div>
              ) : price?.amount && price?.currency ? (
                <div className="mt-1 text-2xl font-semibold">
                  {price.amount.toFixed(2)} <span className="text-sm font-medium text-gray-500">{String(price.currency).toUpperCase()}</span>
                </div>
              ) : (
                <div className="mt-1 text-sm text-gray-500">Pricing follows your promo plan.</div>
              )}
            </div>
            <div className="text-xs text-gray-500 leading-relaxed">
              Renewals are automatic. Cancel anytime in your subscriptions page.
            </div>
            {errorMsg ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                {errorMsg}
              </div>
            ) : null}
            {maxAccountsReached && !errorMsg ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                Account limit reached (max {maxAccounts} active accounts).
              </div>
            ) : null}
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-5 font-semibold text-white disabled:opacity-60"
              onClick={startCheckout}
              disabled={checkoutLoading || maxAccountsReached}
            >
              {checkoutLoading ? 'Redirecting…' : 'Continue to checkout'}
            </button>
            <Link
              href="/subscription"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-black/10 dark:border-white/10 px-4 text-sm"
            >
              Cancel
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
