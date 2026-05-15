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
import Image from 'next/image';
import { normalizeAccountType, type AccountType } from '@/lib/accountTypes';
import { toMillisSafe } from '@/lib/datetime';
import { getProvisionStatus, getProvisionStatusBadgeClass, getProvisionStatusLabel } from '@/lib/provisionStatus';
import Modal from '../ui/Modal';

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

export default function CredentialsDetailsClient() {
  const auth = getAuth(app);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountCreds[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [firestickOpen, setFirestickOpen] = useState(false);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  };


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
      <main className="max-w-3xl mx-auto my-20 p-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        <p className="mt-3 text-gray-500">Loading login details…</p>
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

  const accountList = accounts;
  
  const firestickUrl = process.env.NEXT_PUBLIC_FIRESTICK_APP_URL
    || 'https://africasking.net/Flight713';
  const streamTemplate = (process.env.NEXT_PUBLIC_STREAM_URL_TEMPLATE as string | undefined)
    || 'https://megaott.net/get.php?username={username}&password={password}&type=m3u_plus&output=m3u8';
  const primaryAccount = accountList[0] || null;
  const primaryStreamUrl = (primaryAccount?.username && primaryAccount?.password)
    ? streamTemplate.replace('{username}', encodeURIComponent(primaryAccount.username)).replace('{password}', encodeURIComponent(primaryAccount.password))
    : '';
  const appLinks = [
    process.env.NEXT_PUBLIC_WEB_APP_URL ? { key: 'web', label: 'Web', icon: 'fa-solid fa-globe', href: process.env.NEXT_PUBLIC_WEB_APP_URL } : null,
    process.env.NEXT_PUBLIC_ANDROID_APP_URL ? { key: 'android', label: 'Android', icon: 'fa-brands fa-android', href: process.env.NEXT_PUBLIC_ANDROID_APP_URL } : null,
    process.env.NEXT_PUBLIC_IOS_APP_URL ? { key: 'ios', label: 'iOS', icon: 'fa-brands fa-apple', href: process.env.NEXT_PUBLIC_IOS_APP_URL } : null,
    process.env.NEXT_PUBLIC_WINDOWS_APP_URL ? { key: 'windows', label: 'Windows', icon: 'fa-brands fa-windows', href: process.env.NEXT_PUBLIC_WINDOWS_APP_URL } : null,
    process.env.NEXT_PUBLIC_MAC_APP_URL ? { key: 'mac', label: 'macOS', icon: 'fa-brands fa-apple', href: process.env.NEXT_PUBLIC_MAC_APP_URL } : null,
    process.env.NEXT_PUBLIC_LINUX_APP_URL ? { key: 'linux', label: 'Linux', icon: 'fa-brands fa-linux', href: process.env.NEXT_PUBLIC_LINUX_APP_URL } : null,
  ].filter(Boolean) as { key: string; label: string; icon: string; href: string }[];

  return (
    <>
    <main className="max-w-6xl mx-auto my-8 p-4" style={{ background: 'var(--ak-bg)' }}>
      <section className="relative overflow-hidden rounded-2xl border p-6 sm:p-8 shadow-soft" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)', color: 'var(--ak-text)' }}>
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--ak-card2)', color: '#f44335' }}>
                <i className="fa-solid fa-key" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--ak-muted)' }}>App login</div>
                <h2 className="mt-1 text-xl sm:text-2xl font-semibold">App Login Details</h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--ak-muted)' }}>Use these details to sign in to your AfricasKing apps.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card2)', color: 'var(--ak-muted)' }}>
                <i className="fa-solid fa-user-group" aria-hidden="true" />
                {accountList.length} {accountList.length === 1 ? 'account' : 'accounts'}
              </div>
            </div>
          </div>
          <div className="grid gap-3">
        <div className="mt-6 rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card2)', color: 'var(--ak-muted)' }}>
          <div className="text-xs uppercase tracking-wide">URL</div>
          <div className="mt-2 rounded-lg border px-3 py-2 text-[12px] sm:text-sm font-semibold shadow-sm whitespace-nowrap" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card)', color: 'var(--ak-text)' }}>
            {primaryStreamUrl || '—'}
          </div>
          <div className="mt-1 text-xs">Enter this URL in the AfricasKing app</div>
        </div>
            <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card2)', color: 'var(--ak-muted)' }}>
              Copy your details below and open the app on your device.
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border p-5 sm:p-6 shadow-soft" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card)' }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--ak-text)' }}>Accounts</h3>
            <p className="text-sm" style={{ color: 'var(--ak-muted)' }}>Your login details for each account.</p>
          </div>
          <Link href="/subscription" className="text-sm font-medium hover:underline" style={{ color: '#f44335' }}>View subscription</Link>
        </div>
        {accountsLoading ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--ak-muted)' }}>Loading accounts…</p>
        ) : accountList.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {accountList.map((acct) => {
              const keyBase = acct.id;
              const u = acct?.username || '';
              const p = acct?.password || '';
              const streamUrl = (streamTemplate && u && p)
                ? streamTemplate.replace('{username}', encodeURIComponent(u)).replace('{password}', encodeURIComponent(p))
                : '';
              const statusInfo = getProvisionStatus(acct);
              const [showPass, setShowPass] = useState(false);
              return (
                <div key={acct.id} className="rounded-xl p-4 mb-3 border shadow-sm" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: 'var(--ak-muted)' }}>Account Login</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getProvisionStatusBadgeClass(statusInfo.displayStatus)}`}>
                      {getProvisionStatusLabel(statusInfo.displayStatus)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--ak-border)' }}>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ak-muted)' }}>Username</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--ak-text)' }}>{acct.username || '—'}</p>
                    </div>
                    <button
                      aria-label="Copy Username"
                      onClick={async () => {
                        const val = acct?.username || '';
                        if (!val) return;
                        const ok = await copyToClipboard(val);
                        if (ok) { setCopiedKey(`${keyBase}:username`); showToast('Username copied'); setTimeout(() => setCopiedKey(null), 1200); }
                      }}
                      style={{ color: 'var(--ak-muted)' }}
                      className="ml-2 shrink-0"
                      title={copiedKey === `${keyBase}:username` ? 'Copied!' : 'Copy Username'}
                    >
                      {copiedKey === `${keyBase}:username` ? (
                        <span className="text-[10px] text-green-400">Copied!</span>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--ak-border)' }}>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ak-muted)' }}>Password</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--ak-text)' }}>
                        {showPass ? acct.password : '•'.repeat(acct.password?.length || 8)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <button onClick={() => setShowPass(!showPass)} style={{ color: 'var(--ak-muted)' }} title={showPass ? 'Hide' : 'Show'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showPass ? (
                            <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                          ) : (
                            <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                          )}
                        </svg>
                      </button>
                      <button
                        aria-label="Copy Password"
                        onClick={async () => {
                          const val = acct?.password || '';
                          if (!val) return;
                          const ok = await copyToClipboard(val);
                          if (ok) { setCopiedKey(`${keyBase}:password`); showToast('Password copied'); setTimeout(() => setCopiedKey(null), 1200); }
                        }}
                        style={{ color: 'var(--ak-muted)' }}
                        title={copiedKey === `${keyBase}:password` ? 'Copied!' : 'Copy Password'}
                      >
                        {copiedKey === `${keyBase}:password` ? (
                          <span className="text-[10px] text-green-400">Copied!</span>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {streamUrl ? (
                    <div className="flex items-center justify-between py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ak-muted)' }}>URL</p>
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--ak-text)' }}>{streamUrl}</p>
                      </div>
                      <button
                        aria-label="Copy URL"
                        onClick={async () => {
                          const ok = await copyToClipboard(streamUrl);
                          if (ok) { setCopiedKey(`${keyBase}:url`); showToast('URL copied'); setTimeout(() => setCopiedKey(null), 1200); }
                        }}
                        style={{ color: 'var(--ak-muted)' }}
                        className="ml-2 shrink-0"
                        title={copiedKey === `${keyBase}:url` ? 'Copied!' : 'Copy URL'}
                      >
                        {copiedKey === `${keyBase}:url` ? (
                          <span className="text-[10px] text-green-400">Copied!</span>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-sm" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card2)', color: 'var(--ak-muted)' }}>
            No active account yet. Subscribe to activate your first account.
            <div className="mt-3">
              <Link href="/subscribe" className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: '#f44335' }}>Subscribe</Link>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border p-5 sm:p-6 shadow-soft" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card)' }}>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--ak-text)' }}>Apps & downloads</h3>
          <p className="text-sm" style={{ color: 'var(--ak-muted)' }}>Choose your device to start streaming.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <button
            type="button"
            onClick={() => setFirestickOpen(true)}
            className="group rounded-xl border p-4 hover:-translate-y-0.5 hover:shadow-sm transition text-left btn-neutral"
            style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card2)' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--ak-border)', color: '#f44335' }}>
                <i className="fa-solid fa-fire" aria-hidden="true" />
              </span>
              <div>
                <div className="font-semibold" style={{ color: 'var(--ak-text)' }}>Firestick</div>
                <div className="text-xs" style={{ color: 'var(--ak-muted)' }}>View install steps</div>
              </div>
            </div>
          </button>
          {appLinks.map((link) => (
            <a key={link.key} href={link.href} target="_blank" rel="noreferrer" className="group rounded-xl border p-4 hover:-translate-y-0.5 hover:shadow-sm transition" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card2)' }}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--ak-border)', color: '#f44335' }}>
                  <i className={link.icon} aria-hidden="true" />
                </span>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--ak-text)' }}>{link.label}</div>
                  <div className="text-xs" style={{ color: 'var(--ak-muted)' }}>Open download</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
    <Modal open={firestickOpen} title="Firestick Install" onClose={() => setFirestickOpen(false)}>
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>Install and open the `Downloader` app.</li>
          <li>Enable installs: `Settings` → `My Fire TV` → `Developer Options` → allow `Downloader`.</li>
          <li>Enter the download URL below and install the app.</li>
          <li>
            Open AfricasKing and sign in with your{' '}
            <Link
              href="/credentials"
              onClick={() => setFirestickOpen(false)}
              className="font-semibold text-blue-600 dark:text-blue-400 underline underline-offset-2"
            >
              login details
            </Link>
            .
          </li>
        </ol>
        <div className="mt-3">
          <Image
            src="/images/firestick-downloader.jpg"
            alt="Downloader app showing the AfricasKing download URL"
            width={800}
            height={450}
            sizes="(max-width: 768px) 100vw, 600px"
            className="w-full max-h-56 object-contain rounded-lg border border-black/10 dark:border-white/10 shadow-sm bg-black/5 dark:bg-white/5"
          />
        </div>
        <div className="mt-3 rounded-lg border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-800 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span className="uppercase tracking-wide">Download URL</span>
            <div className="flex gap-2">
              <a
                className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10"
                href={firestickUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 btn-neutral"
                onClick={async () => {
                  const ok = await copyToClipboard(firestickUrl);
                  if (ok) showToast('Download link copied');
                }}
              >
                Copy
              </button>
            </div>
          </div>
          <div className="mt-1 break-all text-[11px] sm:text-xs font-semibold text-gray-900 dark:text-gray-100">{firestickUrl}</div>
        </div>
      </div>
    </Modal>
    {/* Toast */}
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[1001] transition-all duration-150 ${toast ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'}`}>
      {toast && (
        <div className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-sm shadow-soft">
          {toast}
        </div>
      )}
    </div>
    </>
  );
}
