"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { apiPath } from '@/lib/clientApi';

export default function ForgotClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch(apiPath('/api/auth/password-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = data?.errorCode || '';
        let msg = data?.error || 'Failed to send reset email';
        if (code === 'auth/user-not-found') msg = 'No account found for this email.';
        else if (code === 'auth/invalid-email') msg = 'Invalid email address.';
        throw new Error(msg);
      }
      setSent(true);
    } catch (err: any) {
      const code = err?.code || '';
      let msg = 'Failed to send reset email';
      if (code === 'auth/user-not-found') msg = 'No account found for this email.';
      else if (code === 'auth/invalid-email') msg = 'Invalid email address.';
      else if (typeof err?.message === 'string') msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto my-10 p-4">
      <h2 className="text-2xl font-semibold">Forgot Password</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Enter your email to receive a password reset link.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label>
          Email
          <br />
          <input className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </label>
        <div>
          <button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
        </div>
      </form>
      {sent && <p className="text-green-600 mt-3">Reset email sent. Check your inbox.</p>}
      {error && <p className="text-red-600 mt-3">{error}</p>}
      <p className="mt-3 text-sm"><Link className="underline" href="/login">Back to login</Link></p>
    </main>
  );
}
