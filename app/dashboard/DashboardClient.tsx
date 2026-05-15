"use client";

import { useEffect, useState } from 'react';
import { app, db } from '@/lib/firebaseClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, type DocumentSnapshot, type DocumentData, type FirestoreError, type QueryDocumentSnapshot, type QuerySnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { normalizeAccountType } from '@/lib/accountTypes';
import { toMillisSafe } from '@/lib/datetime';
import { getProvisionStatus, getProvisionStatusBadgeClass, getProvisionStatusLabel } from '@/lib/provisionStatus';

type ProvisionAccount = {
  id: string;
  subscriptionId: string;
  accountType: 'normal' | 'kids';
  username?: string | null;
  password?: string | null;
  expiresAt?: number | null;
  updatedAt?: number | null;
  status?: string | null;
};

export default function DashboardClient() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ProvisionAccount[]>([]);
  const auth = getAuth(app);

  useEffect(() => {
    setMounted(true);
    let unsubProv: null | (() => void) = null;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUid(null);
        setAccounts([]);
        if (unsubProv) unsubProv();
        setLoading(false);
        return;
      }

      setUid(user.uid);

      try {
        const qProv = query(collection(db, 'provisions'), where('uid', '==', user.uid));
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
                expiresAt: toMillisSafe(data.expiresAt),
                updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : null,
                status: typeof data.status === 'string' ? data.status : null,
              } as ProvisionAccount;
            });
            list.sort((a: ProvisionAccount, b: ProvisionAccount) => (b.expiresAt || 0) - (a.expiresAt || 0));
            setAccounts(list);
            setLoading(false);
          },
          (err: FirestoreError) => {
            console.warn('Provisions listener error', err);
            setAccounts([]);
            setLoading(false);
          }
        );
      } catch (e) {
        console.warn('Failed to load provisions', e);
        setAccounts([]);
        setLoading(false);
      }
    });

    return () => {
      if (unsubProv) unsubProv();
      unsub();
    };
  }, [auth]);

  if (!mounted || loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', width: '48px', height: '48px', border: '4px solid var(--ak-card2)', borderTop: '4px solid #f44335', borderRadius: '50%' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--ak-muted)' }}>Loading accounts…</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Not logged in. <Link href="/login" style={{ color: '#f44335', textDecoration: 'underline' }}>Login</Link></p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--ak-text)' }}>Accounts</h1>
        <Link href="/subscribe" style={{ fontSize: '14px', fontWeight: '500', color: '#f44335', textDecoration: 'none', cursor: 'pointer' }}>
          Add
        </Link>
      </div>

      {accounts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {accounts.map((acct) => {
            const statusInfo = getProvisionStatus(acct);
            const statusLabel = getProvisionStatusLabel(statusInfo.displayStatus);
            const statusClass = getProvisionStatusBadgeClass(statusInfo.displayStatus);
            const typeLabel = acct.accountType === 'kids' ? 'Kids' : 'Normal';

            return (
              <div key={acct.id} style={{ border: '1px solid var(--ak-border)', background: 'var(--ak-card)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--ak-muted)' }}>Account Login</p>
                  <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '12px' }} className={statusClass}>
                    {statusLabel}
                  </span>
                </div>

                <div style={{ borderBottom: '1px solid var(--ak-border)', padding: '8px 0', marginBottom: '8px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--ak-muted)' }}>Username</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ak-text)' }}>{acct.username || '—'}</p>
                </div>

                <div style={{ borderBottom: '1px solid var(--ak-border)', padding: '8px 0', marginBottom: '8px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--ak-muted)' }}>Password</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ak-text)' }}>••••••••</p>
                </div>

                <div style={{ padding: '8px 0' }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--ak-muted)' }}>{typeLabel} Account</p>
                  <p style={{ fontSize: '12px', color: 'var(--ak-text)' }}>
                    {acct.expiresAt ? new Date(acct.expiresAt).toLocaleDateString() : 'No expiry'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ border: '1px dashed var(--ak-border)', background: 'var(--ak-card2)', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--ak-muted)', marginBottom: '16px' }}>No accounts yet</p>
          <Link href="/subscribe" style={{ display: 'inline-block', background: '#f44335', color: 'white', padding: '12px 24px', borderRadius: '24px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
            Subscribe
          </Link>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
