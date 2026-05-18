"use client";

import { useEffect, useState } from 'react';
import { ShimmerBlock } from '../ui/Shimmer';
import { app } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function SubscribeClient() {
  const auth = getAuth(app);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [price, setPrice] = useState<{ amount?: number | null; currency?: string | null } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        const data = await res.json().catch(() => ({}));
        if (active && res.ok) {
          setPrice({
            amount: typeof data?.amount === 'number' ? data.amount : null,
            currency: (data?.currency as string | undefined) || null,
          });
        }
      } catch {
      } finally {
        if (active) setPriceLoading(false);
      }
    })();
    return () => { active = false; };
  }, [auth, uid]);

  const handleSubscribe = async () => {
    setErrorMsg(null);
    setCheckoutLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const token = await user.getIdToken();
      const res = await fetch(apiPath('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accountType: 'normal' }),
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
      <div className="px-4 pt-5 pb-6">
        <ShimmerBlock className="h-6 w-40 mb-2" />
        <ShimmerBlock className="h-3 w-56 mb-6" />
        <ShimmerBlock className="h-32 w-full rounded-2xl mb-4" />
        <ShimmerBlock className="h-12 w-full rounded-full" />
      </div>
    );
  }

  const amountText = priceLoading
    ? '…'
    : price?.amount && price?.currency
      ? `${price.amount.toFixed(2)} ${String(price.currency).toUpperCase()}`
      : null;

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--ak-text)' }}>Subscribe</h1>
      <p className="text-xs mb-5" style={{ color: 'var(--ak-muted)' }}>Complete your subscription to get full access</p>

      <div className="rounded-2xl p-5 border-2 mb-5" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
        <p className="text-xs mb-1" style={{ color: 'var(--ak-muted)' }}>Plan</p>
        <p className="text-base font-bold mb-3" style={{ color: 'var(--ak-text)' }}>Africa's King Premium</p>

        <p className="text-xs mb-1" style={{ color: 'var(--ak-muted)' }}>Amount</p>
        {priceLoading ? (
          <ShimmerBlock className="h-7 w-28 mb-3" />
        ) : amountText ? (
          <p className="text-xl font-bold mb-3" style={{ color: '#f44335' }}>{amountText}</p>
        ) : (
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--ak-text)' }}>Contact us for pricing</p>
        )}

        <p className="text-xs leading-relaxed" style={{ color: 'var(--ak-muted)' }}>
          Payment will show up on your statement from X4designs. Renewals are automatic — cancel anytime.
        </p>
      </div>

      {errorMsg && (
        <p className="text-xs mb-4 text-red-500">{errorMsg}</p>
      )}

      <button
        onClick={handleSubscribe}
        disabled={checkoutLoading}
        className="w-full py-3.5 rounded-full text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: '#f44335' }}
      >
        {checkoutLoading ? 'Opening checkout…' : 'Subscribe'}
      </button>
    </div>
  );
}
