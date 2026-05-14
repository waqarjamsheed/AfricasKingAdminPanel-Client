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
    <main className="max-w-md mx-auto my-10 p-4">
      <h2 className="text-2xl font-semibold">Change Password</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label>
          Current password
          <br />
          <input className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
        </label>
        <label>
          New password
          <br />
          <input className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
        </label>
        <label>
          Confirm new password
          <br />
          <input className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </label>
        <div>
          <button type="submit" disabled={loading}>{loading ? 'Updating…' : 'Update Password'}</button>
        </div>
      </form>
      {success && <p className="text-green-600 mt-3">Password updated successfully.</p>}
      {error && <p className="text-red-600 mt-3">{error}</p>}
      <p className="mt-3 text-sm"><Link className="underline" href="/dashboard">Back to dashboard</Link></p>
    </main>
  );
}

