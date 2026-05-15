"use client";

import { useEffect, useState } from 'react';
import { app, db } from '@/lib/firebaseClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  onSnapshot,
  getDocs,
  collection,
  query,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import Link from 'next/link';
import { normalizeAccountType, type AccountType } from '@/lib/accountTypes';
import { toMillisSafe } from '@/lib/datetime';
import { getProvisionStatus, getProvisionStatusLabel } from '@/lib/provisionStatus';

type AccountCreds = {
  id: string;
  subscriptionId: string;
  accountType: AccountType;
  username?: string | null;
  password?: string | null;
  expiresAt?: number | null;
  status?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelAtPeriodEndAt?: number | null;
};

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button onClick={copy} className="ml-2 shrink-0" style={{ color: 'var(--ak-muted)' }} title={label ? `Copy ${label}` : 'Copy'}>
      {copied ? (
        <span className="text-[10px] text-green-400">Copied!</span>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

function AccountCard({ acct, index, streamUrl }: { acct: AccountCreds; index: number; streamUrl: string }) {
  const [showPass, setShowPass] = useState(false);
  const statusInfo = getProvisionStatus(acct);

  return (
    <div className="rounded-xl p-4 mb-3 border" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold" style={{ color: 'var(--ak-muted)' }}>Account Login {index + 1}</p>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--ak-card2)', color: 'var(--ak-muted)' }}>
          {getProvisionStatusLabel(statusInfo.displayStatus)}
        </span>
      </div>

      <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--ak-border)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ak-muted)' }}>Username</p>
          <p className="text-sm font-medium" style={{ color: 'var(--ak-text)' }}>{acct.username || '—'}</p>
        </div>
        {acct.username && <CopyBtn value={acct.username} label="Username" />}
      </div>

      <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--ak-border)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ak-muted)' }}>Password</p>
          <p className="text-sm font-medium" style={{ color: 'var(--ak-text)' }}>
            {showPass ? acct.password : '•'.repeat(acct.password?.length || 8)}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <button onClick={() => setShowPass(!showPass)} style={{ color: 'var(--ak-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {showPass ? (
                <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
              ) : (
                <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
              )}
            </svg>
          </button>
          {acct.password && <CopyBtn value={acct.password} label="Password" />}
        </div>
      </div>

      {streamUrl && (
        <div className="flex items-center justify-between py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ak-muted)' }}>URL</p>
            <p className="text-xs font-medium truncate" style={{ color: 'var(--ak-text)' }}>{streamUrl}</p>
          </div>
          <CopyBtn value={streamUrl} label="URL" />
        </div>
      )}
    </div>
  );
}

export default function CredentialsDetailsClient() {
  const auth = getAuth(app);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountCreds[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const streamTemplate = (process.env.NEXT_PUBLIC_STREAM_URL_TEMPLATE as string | undefined)
    || 'https://megaott.net/get.php?username={username}&password={password}&type=m3u_plus&output=m3u8';

  useEffect(() => {
    let unsubProv: null | (() => void) = null;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUid(null);
        setAccounts([]);
        setAccountsLoading(false);
        if (unsubProv) unsubProv();
        setLoading(false);
        return;
      }
      setUid(user.uid);
      try {
        setAccountsLoading(true);
        const qProv = query(collection(db, 'provisions'), where('uid', '==', user.uid));
        unsubProv = onSnapshot(qProv, (qs: QuerySnapshot<DocumentData>) => {
          const list = qs.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
            const data = d.data() as any;
            return {
              id: d.id,
              subscriptionId: typeof data.subscriptionId === 'string' ? data.subscriptionId : d.id,
              accountType: normalizeAccountType(data.accountType),
              username: typeof data.username === 'string' ? data.username : null,
              password: typeof data.password === 'string' ? data.password : null,
              expiresAt: toMillisSafe(data.expiresAt),
              status: typeof data.status === 'string' ? data.status : null,
              cancelAtPeriodEnd: data.cancel_at_period_end === true || data.cancelAtPeriodEnd === true,
              cancelAtPeriodEndAt: typeof data.cancel_at_period_end_at === 'number'
                ? data.cancel_at_period_end_at
                : (typeof data.cancelAtPeriodEndAt === 'number' ? data.cancelAtPeriodEndAt : null),
            } as AccountCreds;
          });
          list.sort((a: AccountCreds, b: AccountCreds) => (b.expiresAt || 0) - (a.expiresAt || 0));
          setAccounts(list);
          setAccountsLoading(false);
        }, (err: FirestoreError) => {
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
                  expiresAt: toMillisSafe(data.expiresAt),
                  status: typeof data.status === 'string' ? data.status : null,
                  cancelAtPeriodEnd: data.cancel_at_period_end === true || data.cancelAtPeriodEnd === true,
                  cancelAtPeriodEndAt: typeof data.cancel_at_period_end_at === 'number'
                    ? data.cancel_at_period_end_at
                    : (typeof data.cancelAtPeriodEndAt === 'number' ? data.cancelAtPeriodEndAt : null),
                } as AccountCreds;
              });
              list.sort((a: AccountCreds, b: AccountCreds) => (b.expiresAt || 0) - (a.expiresAt || 0));
              setAccounts(list);
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
      setLoading(false);
    });
    return () => { if (unsubProv) unsubProv(); unsub(); };
  }, [auth]);

  if (loading) {
    return (
      <div className="px-4 pt-10 flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#f44335]" />
        <p className="text-sm" style={{ color: 'var(--ak-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="px-4 pt-10 text-sm" style={{ color: 'var(--ak-muted)' }}>
        Not logged in. <Link href="/login" className="text-[#f44335]">Login</Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-6" style={{ overflowY: 'auto', height: '100%' }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold" style={{ color: 'var(--ak-text)' }}>Accounts</h1>
        <Link
          href="/subscription"
          className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-full text-xs font-semibold"
          style={{ background: '#f44335' }}
        >
          + Subscribe
        </Link>
      </div>

      {accountsLoading ? (
        <p className="text-sm" style={{ color: 'var(--ak-muted)' }}>Loading accounts…</p>
      ) : accounts.length > 0 ? (
        accounts.map((acct, i) => {
          const u = acct?.username || '';
          const p = acct?.password || '';
          const streamUrl = (streamTemplate && u && p)
            ? streamTemplate.replace('{username}', encodeURIComponent(u)).replace('{password}', encodeURIComponent(p))
            : '';
          return <AccountCard key={acct.id} acct={acct} index={i} streamUrl={streamUrl} />;
        })
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <img src="/icon.png" alt="" className="w-16 h-16 opacity-20" />
          <p className="text-sm" style={{ color: 'var(--ak-muted)' }}>No accounts yet</p>
          <Link href="/subscribe" className="mt-1 px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: '#f44335' }}>
            Subscribe
          </Link>
        </div>
      )}
    </div>
  );
}
