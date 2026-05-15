import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--ak-bg)' }} />}>
      <LoginClient />
    </Suspense>
  );
}
