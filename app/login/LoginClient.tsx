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
    <main className="flex md:flex-row flex-col md:max-h-screen" style={{ background: 'var(--ak-bg)', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16 }}>
      <LoaderOverlay open={loading} text="Logging in…" />
      <ThemePopup />
      <div className="hidden md:flex absolute" style={{ bottom: 16, left: 16 }}>
        <img src="/icon.png" alt="AfricasKing" className='w-full' />
      </div>

      {/* Form Container */}
      <div className="flex flex-col items-center w-full h-[40vh] md:h-auto md:ml-auto md:mr-16" style={{ maxWidth: 400, padding: 16 }}>
        <div style={{ background: 'var(--ak-card)', borderRadius: 12, padding: '16px 14px', width: '100%', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ak-text)', margin: '0 0 12px' }}>Login</h2>
        {sessionExpired && (<p style={{ color: 'var(--ak-muted)', marginBottom: 6, fontSize: 11 }}>Your session expired. Please login again.</p>)}
        {loggedOut && (<p style={{ color: 'var(--ak-muted)', marginBottom: 6, fontSize: 11 }}>You have been logged out.</p>)}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--ak-text)', marginBottom: 4, fontWeight: 500 }}>email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '6px 0', borderBottom: '1px solid var(--ak-border)', fontSize: 12, color: 'var(--ak-text)', background: 'transparent', outline: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = '#f44335')} onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--ak-border)')} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--ak-text)', marginBottom: 4, fontWeight: 500 }}>password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '6px 0', borderBottom: '1px solid var(--ak-border)', fontSize: 12, color: 'var(--ak-text)', background: 'transparent', outline: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = '#f44335')} onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--ak-border)')} required />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 10, padding: '8px 0', background: '#f44335', color: 'white', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }} onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')} onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}>
            {loading ? 'Signing in' : 'Login'}
          </button>
          {error && <p style={{ color: '#ef4444', fontSize: 10, margin: '6px 0 0' }}>{error}</p>}
          <div style={{ marginTop: 8, fontSize: 11, textAlign: 'center' }}>
            <Link href="/forgot" style={{ color: '#f44335', textDecoration: 'none' }}>Forgot password?</Link>
          </div>
        </form>
        {allowRegistration ? (<p style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'var(--ak-muted)' }}>Don't have an account? <Link href="/register" style={{ color: '#f44335', textDecoration: 'none', fontWeight: 500 }}>Register</Link></p>) : (<p style={{ marginTop: 8, textAlign: 'center', fontSize: 10, color: 'var(--ak-muted)' }}>{REGISTRATION_WAITLIST_MESSAGE}</p>)}
        </div>
      </div>

      {/* Mobile Logo - Below form on mobile, hidden on desktop */}
      <div className="flex md:hidden flex-col items-center w-full" style={{ textAlign: 'center'}}>
        <img src="/icon.png" alt="AfricasKing" className='w-full' />
      </div>
    </main>
  );
}
