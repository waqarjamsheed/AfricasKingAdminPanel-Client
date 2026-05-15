"use client";

import { FormEvent, useState } from 'react';
import { app } from '@/lib/firebaseClient';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import Link from 'next/link';

export default function ChangePasswordClient() {
  const auth = getAuth(app);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Not logged in');
      if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.');
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const code = err?.code || '';
      let msg = 'Failed to change password';
      if (code === 'auth/wrong-password') msg = 'Current password is incorrect.';
      else if (code === 'auth/weak-password') msg = 'New password is too weak.';
      else if (code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
      else if (typeof err?.message === 'string') msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-lg font-bold mb-4" style={{ color: 'var(--ak-text)' }}>Change Password</h1>

      <div className="rounded-xl p-4 mb-4 border" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
        <form onSubmit={onSubmit}>
          <div className="mb-5">
            <label className="block text-xs uppercase tracking-wide mb-2 font-medium" style={{ color: 'var(--ak-muted)' }}>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              className="w-full py-3 text-sm bg-transparent outline-none transition-colors"
              style={{ borderBottom: '1px solid var(--ak-border)', color: 'var(--ak-text)' }}
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs uppercase tracking-wide mb-2 font-medium" style={{ color: 'var(--ak-muted)' }}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full py-3 text-sm bg-transparent outline-none transition-colors"
              style={{ borderBottom: '1px solid var(--ak-border)', color: 'var(--ak-text)' }}
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs uppercase tracking-wide mb-2 font-medium" style={{ color: 'var(--ak-muted)' }}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full py-3 text-sm bg-transparent outline-none transition-colors"
              style={{ borderBottom: '1px solid var(--ak-border)', color: 'var(--ak-text)' }}
            />
          </div>

          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          {success && <p className="text-green-500 text-xs mb-3">Password updated successfully.</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#f44335] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      <p className="text-sm text-center" style={{ color: 'var(--ak-muted)' }}>
        <Link href="/account" className="text-[#f44335]">Back to Account</Link>
      </p>
    </div>
  );
}
