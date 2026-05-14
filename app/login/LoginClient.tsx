"use client";

import { FormEvent, useEffect, useState } from 'react';
import { getAuth, signInWithEmailAndPassword, sendEmailVerification, User } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ThemePopup from '../ui/ThemePopup';
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
    // Fallback to client SDK for environments where the admin route is unavailable.
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
      // Use replace to avoid leaving the login page in history
      router.replace(path);
    };
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      try { await user?.reload(); } catch {}
      if (requireEmailVerification && !user?.emailVerified) {
        // Block login until email is verified
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
      // Create a 24h session cookie
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
    <main className="max-w-md mx-auto my-10 p-4">
      <LoaderOverlay open={loading} text="Logging in…" />
      <ThemePopup />
      <h2 className="text-2xl font-semibold">Login</h2>
      {sessionExpired && (
        <p className="text-gray-500 mb-3">Your session expired. Please login again.</p>
      )}
      {loggedOut && (
        <p className="text-gray-500 mb-3">You have been logged out.</p>
      )}
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label>
          Email
          <br />
          <input className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <br />
          <input className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        </label>
        <div>
          <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
          <div className="mt-2 text-sm">
            <Link className="underline" href="/forgot">Forgot password?</Link>
          </div>
        </div>
      </form>
      {error && <p className="text-red-600 mt-3">{error}</p>}
      {allowRegistration ? (
        <p className="mt-3">Don’t have an account? <Link className="underline" href="/register">Register</Link></p>
      ) : (
        <p className="mt-3 text-sm text-gray-500">{REGISTRATION_WAITLIST_MESSAGE}</p>
      )}
    </main>
  );
}
