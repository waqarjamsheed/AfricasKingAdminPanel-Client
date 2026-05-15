"use client";

import { FormEvent, useEffect, useState } from 'react';
import { getAuth, signInWithEmailAndPassword, sendEmailVerification, User } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import LoaderOverlay from '../ui/LoaderOverlay';
import { REGISTRATION_WAITLIST_MESSAGE } from '@/lib/registration';

export default function LoginClient({
  requireEmailVerification = true,
  allowRegistration = true,
}: {
  requireEmailVerification?: boolean;
  allowRegistration?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const sessionExpired = (search?.get('session') || '') === 'expired';
  const loggedOut = (search?.get('loggedout') || '') === '1';
  const auth = getAuth(app);
  const isProd = process.env.NODE_ENV === 'production';

  useEffect(() => {
    if (!sessionExpired && !loggedOut) return;
    fetch(apiPath('/api/auth/session'), { method: 'DELETE' }).catch(() => {});
  }, [sessionExpired, loggedOut]);

  const formatAuthError = (err: any, fallback = 'Login failed') => {
    const code = err?.code || '';
    if (code === 'auth/user-not-found') return allowRegistration ? 'No account found for this email. Please register.' : 'No account found for this email.';
    if (code === 'auth/wrong-password') return 'Incorrect password. Please try again.';
    if (code === 'auth/invalid-credential') return 'Invalid email or password.';
    if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later or reset your password.';
    if (code === 'auth/invalid-email') return 'Invalid email address.';
    if (typeof err?.message === 'string') return err.message;
    return fallback;
  };

  const formatResendError = (err: any) => {
    if (isProd) {
      console.error('[login] resend verification failed', err);
      return 'Something went wrong. Please try again later.';
    }
    return formatAuthError(err, 'Failed to resend verification email.');
  };

  const resendVerificationEmail = async (user: User) => {
    let apiError: string | null = null;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(apiPath('/api/auth/send-verification'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const json = await res.json().catch(() => null as any);
      if (res.ok) return;
      apiError = json?.error || 'Failed to resend verification email.';
    } catch (err: any) {
      apiError = err?.message || 'Failed to resend verification email.';
    }
    await sendEmailVerification(user).catch((err: any) => {
      const msg = err?.message || 'Failed to resend verification email.';
      throw new Error(apiError ? `${apiError} ${msg}` : msg);
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let navigated = false;
    const navigate = (path: string) => {
      navigated = true;
      setLoading(false);
      try { window.dispatchEvent(new Event('ak:navigate-start')); } catch {}
      router.replace(path);
    };
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      try { await user?.reload(); } catch {}
      if (requireEmailVerification && !user?.emailVerified) {
        let resendFailed: string | null = null;
        if (user) {
          try {
            await resendVerificationEmail(user);
          } catch (err: any) {
            resendFailed = formatResendError(err);
          }
        } else {
          resendFailed = 'User session not available to resend verification email.';
        }
        try { await auth.signOut(); } catch {}
        setError(resendFailed
          ? `Please verify your email before logging in. We could not resend the verification email. ${resendFailed}`
          : 'Please verify your email before logging in. We just resent the verification email. Check your inbox and spam folder.');
        setLoading(false);
        return;
      }
      try {
        const idToken = await auth.currentUser?.getIdToken(true);
        if (idToken) {
          await fetch(apiPath('/api/auth/session'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });
        }
      } catch {}
      navigate('/dashboard');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      if (!navigated) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-start md:justify-around pt-10 pb-10 px-5 bg-black">
      <LoaderOverlay open={loading} text="Logging in…" />

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

        {sessionExpired && <p className="text-xs text-gray-500 mb-3 mt-6">Your session expired. Please login again.</p>}
        {loggedOut && <p className="text-xs text-gray-500 mb-3 mt-6">You have been logged out.</p>}

        <form onSubmit={onSubmit} className="mt-6">
          <div className="mb-5">
            <label className="block text-sm text-black mb-2 font-medium">email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full py-3 border-b border-gray-200 text-sm text-zinc-800 bg-transparent outline-none focus:border-[#f44335] transition-colors"
              required
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm text-black mb-2 font-medium">password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-3 border-b border-gray-200 text-sm text-zinc-800 bg-transparent outline-none focus:border-[#f44335] transition-colors"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#f44335] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Submit'}
          </button>

          <div className="mt-4 text-center">
            <Link href="/forgot" className="text-xs text-gray-500 hover:opacity-70 transition-opacity">Forgot password?</Link>
          </div>
        </form>

        {allowRegistration
          ? <p className="mt-4 text-center text-xs text-gray-500">Don&apos;t have an account? <Link href="/register" className="text-[#f44335] font-medium">Register</Link></p>
          : <p className="mt-4 text-center text-xs text-gray-500">{REGISTRATION_WAITLIST_MESSAGE}</p>
        }
      </div>

      <img src="/icon.png" alt="AfricasKing" className='w-96 flex md:hidden' />
    </div>
  );
}
