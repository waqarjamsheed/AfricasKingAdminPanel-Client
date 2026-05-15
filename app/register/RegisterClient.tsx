"use client";

import { useState } from 'react';
import { app, db } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Modal from '../ui/Modal';
import LoaderOverlay from '../ui/LoaderOverlay';
import { STATIC_PROMO_CODES } from '@/lib/promoCodes';
import { REGISTRATION_WAITLIST_MESSAGE } from '@/lib/registration';

export default function RegisterClient({
  initialRef = '',
  registrationAllowed = true,
  registrationAccessCode: _registrationAccessCode = '',
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
  const allowRegistration = registrationAllowed;
  const router = useRouter();
  const auth = getAuth(app);
  const [notice, setNotice] = useState<string | null>(null);
  const isProd = process.env.NODE_ENV === 'production';

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
    if (STATIC_PROMO_CODES.has(val)) return val;
    if (/^[a-z0-9]{6}$/i.test(val)) return val;
    return 'nocode';
  }

  const onSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      if (name) {
        try { await updateProfile(cred.user, { displayName: name }); } catch {}
      }
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
      try {
        const idToken = await cred.user.getIdToken();
        await fetch(apiPath('/api/admin/notifications/signup'), { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } });
      } catch {}
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
    <div className="min-h-screen flex flex-col md:flex-row md:justify-around items-center justify-start pt-10 pb-10 px-5 bg-black">
      <LoaderOverlay open={loading} text="Creating account…" />
      <Modal open={!!notice} title="Email Verification" onClose={() => { setNotice(null); router.push('/login'); }}>
        <p className="text-sm text-gray-700">{notice}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => { setNotice(null); router.push('/login'); }}
            className="px-4 py-2 bg-[#f44335] text-white rounded-full text-sm font-semibold"
          >
            OK
          </button>
        </div>
      </Modal>

      <img src="/icon.png" alt="AfricasKing" className='w-[600px] h-full hidden md:flex' />

      <div className="bg-white rounded-2xl py-8 px-7 w-full max-w-xs shadow-xl mb-6 relative">
        <Link
          href="/"
          className="absolute top-4 left-4 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        {!allowRegistration ? (
          <div className="mt-6">
            <p className="text-sm text-amber-800 font-medium mb-4">{REGISTRATION_WAITLIST_MESSAGE}</p>
            <Link href="/login" className="text-sm text-[#f44335] font-medium">Go to login</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6">
            <div className="mb-5">
              <label className="block text-sm text-black mb-2 font-medium">name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full py-3 border-b border-gray-200 text-sm text-zinc-800 bg-transparent outline-none focus:border-[#f44335] transition-colors"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm text-black mb-2 font-medium">email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full py-3 border-b border-gray-200 text-sm text-zinc-800 bg-transparent outline-none focus:border-[#f44335] transition-colors"
                required
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm text-black mb-2 font-medium">password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full py-3 border-b border-gray-200 text-sm text-zinc-800 bg-transparent outline-none focus:border-[#f44335] transition-colors"
                required
                minLength={6}
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm text-black mb-2 font-medium">
                {initialRef ? 'promo / referral code' : 'discount code (optional)'}
              </label>
              {initialRef ? (
                <input
                  type="text"
                  value={discountCode}
                  disabled
                  readOnly
                  className="w-full py-3 border-b border-gray-200 text-sm text-zinc-400 bg-transparent outline-none"
                  placeholder="Added from your invite or referral link"
                />
              ) : (
                <input
                  type="text"
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value)}
                  className="w-full py-3 border-b border-gray-200 text-sm text-zinc-800 bg-transparent outline-none focus:border-[#f44335] transition-colors"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#f44335] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        )}

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        <p className="mt-4 text-center text-xs text-gray-500">
          Already have an account? <Link href="/login" className="text-[#f44335] font-medium">Login</Link>
        </p>
      </div>

       <img src="/icon.png" alt="AfricasKing" className='w-96 flex md:hidden' />
    </div>
  );
}
