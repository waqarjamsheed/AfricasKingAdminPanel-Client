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
    <main className="max-w-6xl mx-auto my-8 p-4">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-soft">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,.25),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,.25),transparent_45%)]" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="h-full w-full bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.08)_25%,rgba(255,255,255,.08)_26%,transparent_27%),linear-gradient(90deg,transparent_24%,rgba(255,255,255,.08)_25%,rgba(255,255,255,.08)_26%,transparent_27%)] bg-[size:44px_44px] opacity-10" />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                <i className="fa-solid fa-key" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/60">App login</div>
                <h2 className="mt-1 text-xl sm:text-2xl font-semibold">App Login Details</h2>
                <p className="mt-2 text-sm text-white/70">Use these details to sign in to your AfricasKing apps.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/80">
                <i className="fa-solid fa-user-group" aria-hidden="true" />
                {accountList.length} {accountList.length === 1 ? 'account' : 'accounts'}
              </div>
            </div>
          </div>
          <div className="grid gap-3">
        <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/70">
          <div className="text-xs uppercase tracking-wide text-white/60">URL</div>
          <div className="mt-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-[12px] sm:text-sm font-semibold text-white shadow-sm whitespace-nowrap">
            {primaryStreamUrl || '—'}
          </div>
          <div className="mt-1 text-xs text-white/60">Enter this URL in the AfricasKing app</div>
        </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              Copy your details below and open the app on your device.
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Accounts</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your login details for each account.</p>
          </div>
          <Link href="/subscription" className="text-sm font-medium text-primary hover:underline">View subscription</Link>
        </div>
        {accountsLoading ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading accounts…</p>
        ) : accountList.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {accountList.map((acct) => {
              const keyBase = acct.id;
              const u = acct?.username || '';
              const p = acct?.password || '';
              const streamUrl = (streamTemplate && u && p)
                ? streamTemplate.replace('{username}', encodeURIComponent(u)).replace('{password}', encodeURIComponent(p))
                : '';
              const statusInfo = getProvisionStatus(acct);
              return (
                <div key={acct.id} className="rounded-xl border border-black/5 dark:border-white/10 p-4 bg-white/80 dark:bg-gray-900 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">{acct.accountType} account</div>
                      <div className="mt-1 text-sm font-semibold">{acct.username || '—'}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getProvisionStatusBadgeClass(statusInfo.displayStatus)}`}>
                      {getProvisionStatusLabel(statusInfo.displayStatus)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Username</div>
                      <div className="mt-1 relative rounded border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-800 p-2 pr-9 font-medium">
                        {acct?.username || '—'}
                        <button
                          aria-label="Copy Username"
                          title={copiedKey === `${keyBase}:username` ? 'Copied!' : 'Copy Username'}
                          className="absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-0"
                          onClick={async () => {
                            const val = acct?.username || '';
                            if (!val) return;
                            const ok = await copyToClipboard(val);
                            if (ok) { setCopiedKey(`${keyBase}:username`); showToast('Username copied'); setTimeout(() => setCopiedKey(null), 1200); }
                          }}
                        >
                          <i className={copiedKey === `${keyBase}:username` ? 'fa-solid fa-check text-green-600' : 'fa-regular fa-copy'} aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Password</div>
                      <div className="mt-1 relative rounded border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-800 p-2 pr-9 font-medium">
                        {acct?.password || '—'}
                        <button
                          aria-label="Copy Password"
                          title={copiedKey === `${keyBase}:password` ? 'Copied!' : 'Copy Password'}
                          className="absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-0"
                          onClick={async () => {
                            const val = acct?.password || '';
                            if (!val) return;
                            const ok = await copyToClipboard(val);
                            if (ok) { setCopiedKey(`${keyBase}:password`); showToast('Password copied'); setTimeout(() => setCopiedKey(null), 1200); }
                          }}
                        >
                          <i className={copiedKey === `${keyBase}:password` ? 'fa-solid fa-check text-green-600' : 'fa-regular fa-copy'} aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  {streamUrl ? (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500">URL</div>
                      <div className="mt-1 relative select-all break-all rounded border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-800 p-2 pr-9 text-[13px]">
                        {streamUrl}
                        <button
                          aria-label="Copy URL"
                          title={copiedKey === `${keyBase}:url` ? 'Copied!' : 'Copy URL'}
                          className="absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-0"
                          onClick={async () => {
                            const ok = await copyToClipboard(streamUrl);
                            if (ok) { setCopiedKey(`${keyBase}:url`); showToast('URL copied'); setTimeout(() => setCopiedKey(null), 1200); }
                          }}
                        >
                          <i className={copiedKey === `${keyBase}:url` ? 'fa-solid fa-check text-green-600' : 'fa-regular fa-copy'} aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 p-6 text-sm text-gray-600 dark:text-gray-400">
            No active account yet. Subscribe to activate your first account.
            <div className="mt-3">
              <Link href="/subscribe" className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Subscribe</Link>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-soft">
        <div>
          <h3 className="text-lg font-semibold">Apps & downloads</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose your device to start streaming.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <button
            type="button"
            onClick={() => setFirestickOpen(true)}
            className="group rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-900 p-4 hover:-translate-y-0.5 hover:shadow-sm transition text-left btn-neutral"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-gray-700 dark:bg-white/10 dark:text-gray-100">
                <i className="fa-solid fa-fire" aria-hidden="true" />
              </span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Firestick</div>
                <div className="text-xs text-gray-500">View install steps</div>
              </div>
            </div>
          </button>
          {appLinks.map((link) => (
            <a key={link.key} href={link.href} target="_blank" rel="noreferrer" className="group rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-900 p-4 hover:-translate-y-0.5 hover:shadow-sm transition">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-gray-700 dark:bg-white/10 dark:text-gray-100">
                  <i className={link.icon} aria-hidden="true" />
                </span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{link.label}</div>
                  <div className="text-xs text-gray-500">Open download</div>
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
