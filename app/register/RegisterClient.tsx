"use client";

import { FormEvent, useState } from 'react';
import { app, db } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemePopup from '../ui/ThemePopup';
import Modal from '../ui/Modal';
import LoaderOverlay from '../ui/LoaderOverlay';
import { STATIC_PROMO_CODES } from '@/lib/promoCodes';
import { REGISTRATION_WAITLIST_MESSAGE } from '@/lib/registration';

export default function RegisterClient({
  initialRef = '',
  registrationAllowed = true,
  registrationAccessCode = '',
}: {
  initialRef?: string;
  registrationAllowed?: boolean;
  registrationAccessCode?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState(initialRef || '');
  const [allowRegistration, setAllowRegistration] = useState(registrationAllowed);
  const router = useRouter();
  const auth = getAuth(app);
  const [notice, setNotice] = useState<string | null>(null);
  const isProd = process.env.NODE_ENV === 'production';

  const refreshRegistrationStatus = async () => {
    try {
      const params = new URLSearchParams();
      if (registrationAccessCode) params.set('code', registrationAccessCode);
      const url = params.size
        ? `${apiPath('/api/settings/public')}?${params.toString()}`
        : apiPath('/api/settings/public');
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json().catch(() => null as any);
      if (res.ok && typeof json?.allowRegistration === 'boolean') {
        setAllowRegistration(json.allowRegistration);
        return json.allowRegistration;
      }
    } catch {}
    return allowRegistration;
  };

  const sendVerificationEmail = async (user: User) => {
    let apiError: string | null = null;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(apiPath('/api/auth/send-verification'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const json = await res.json().catch(() => null as any);
      if (res.ok) return;
      apiError = json?.error || 'Failed to send verification email.';
    } catch (err: any) {
      apiError = err?.message || 'Failed to send verification email.';
    }
    // Fallback to client SDK for environments where the admin route is unavailable.
    await sendEmailVerification(user).catch((err: any) => {
      const msg = err?.message || 'Failed to send verification email.';
      throw new Error(apiError ? `${apiError} ${msg}` : msg);
    });
  };

  function normalizeDiscount(input: string | null | undefined): string {
    const val = String(input || '').trim().toLowerCase();
    if (!val) return 'nocode';
    if (val === 'nocode') return 'nocode';
    if (val === 'kings' || val === 'king' || val === 'kingz') return 'kings';
    // Known static promos
    if (STATIC_PROMO_CODES.has(val)) return val;
    // Weekly dynamic promos (exactly 6 alphanumeric)
    if (/^[a-z0-9]{6}$/i.test(val)) return val;
    return 'nocode';
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const registrationOpen = await refreshRegistrationStatus();
      if (!registrationOpen) {
        setError(REGISTRATION_WAITLIST_MESSAGE);
        return;
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      // Persist initial user profile with discount plan
      const plan = normalizeDiscount(discountCode);
      try {
        await setDoc(
          doc(db, 'users', uid),
          {
            email: cred.user.email || email,
            displayName: name || null,
            discountPlan: plan,
            status: 'registered',
            emailVerified: false,
            provider: 'password',
            createdAt: Date.now()
          },
          { merge: true }
        );
      } catch {}
      // Log signup for admin notification (best effort)
      try {
        const idToken = await cred.user.getIdToken();
        await fetch(apiPath('/api/admin/notifications/signup'), { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } });
      } catch {}
      // If referral code present, ask server to associate reseller now
      try {
        const refCode = (discountCode || initialRef || '').trim().toLowerCase();
        const normalizedRef = refCode === 'nocode' ? '' : refCode;
        if (normalizedRef) {
          const idToken = await cred.user.getIdToken();
          const res = await fetch(apiPath('/api/ref/assign'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ code: normalizedRef }) });
          const json = await res.json().catch(() => null as any);
          if (!res.ok) {
            throw new Error(json?.error || 'Failed to attach referral code. Please try again.');
          }
          if (json?.resellerId) {
            await setDoc(doc(db, 'users', uid), {
              resellerId: json.resellerId,
              resellerCode: json.code || normalizedRef,
              resellerAssignedAt: Date.now(),
              resellerSource: 'signup'
            }, { merge: true });
          }
        }
      } catch {}
      try {
        await sendVerificationEmail(cred.user);
        setNotice('Verification email sent. Please verify before subscribing.');
      } catch (err: any) {
        if (isProd) {
          console.error('[register] verification email failed', err);
          setNotice('Account created, but we could not send a verification email. Please try again later or login to resend.');
        } else {
          const msg = err?.message || 'Account created, but we could not send a verification email.';
          setNotice(`${msg} Please login to resend the verification email.`);
        }
      }
    } catch (err: any) {
      const code = err?.code || '';
      let msg = 'Registration failed';
      if (code === 'auth/email-already-in-use') msg = 'An account with this email already exists. Please login.';
      else if (code === 'auth/invalid-email') msg = 'Invalid email address.';
      else if (code === 'auth/weak-password') msg = 'Password is too weak. Use at least 6 characters.';
      else if (typeof err?.message === 'string') msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto my-10 p-4">
      <LoaderOverlay open={loading} text="Creating account…" />
      <ThemePopup />
      <Modal open={!!notice} title="Email Verification" onClose={() => { setNotice(null); router.push('/login'); }}>
        <p className="text-sm text-gray-700 dark:text-gray-200">{notice}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => { setNotice(null); router.push('/login'); }}>OK</button>
        </div>
      </Modal>
      <h2 className="text-2xl font-semibold">Register</h2>
      {!allowRegistration ? (
        <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-medium">{REGISTRATION_WAITLIST_MESSAGE}</p>
          <div className="mt-4">
            <Link className="underline" href="/login">Go to login</Link>
          </div>
        </div>
      ) : (
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label>
          Name
          <br />
          <input className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2" value={name} onChange={e => setName(e.target.value)} type="text" />
        </label>
        <label>
          {initialRef ? 'Promo / referral code' : 'Discount code (optional)'}
          <br />
          {initialRef ? (
            <input
              className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-gray-600 dark:text-gray-300"
              value={discountCode}
              type="text"
              disabled
              readOnly
              placeholder="Added from your invite or referral link"
            />
          ) : (
            <input
              className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2"
              value={discountCode}
              onChange={e => setDiscountCode(e.target.value)}
              type="text"
              placeholder=""
            />
          )}
        </label>
        <label>
          Email
          <br />
          <input className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <br />
          <input className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={6} />
        </label>
        <div>
          <button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create Account'}</button>
        </div>
      </form>
      )}
      {error && <p className="text-red-600 mt-3">{error}</p>}
      <p className="mt-3">Already have an account? <Link className="underline" href="/login">Login</Link></p>
    </main>
  );
}
