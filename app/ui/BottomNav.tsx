"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import { apiPath } from '@/lib/clientApi';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth(app);

  if (pathname === '/login') return null;

  const navItems = [
    { href: '/dashboard', icon: 'fa-solid fa-home', label: 'Dashboard' },
    { href: '/credentials', icon: 'fa-solid fa-key', label: 'Details' },
    { href: '/subscription', icon: 'fa-regular fa-credit-card', label: 'Billing' },
    { href: '/account', icon: 'fa-solid fa-user', label: 'Account' },
    { href: '/change-password', icon: 'fa-solid fa-lock', label: 'Security' },
    { action: 'logout', icon: 'fa-solid fa-sign-out-alt', label: 'Logout' },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  const handleLogout = async () => {
    try {
      await fetch(apiPath('/api/auth/session'), { method: 'DELETE' });
      await signOut(auth);
      if (typeof window !== 'undefined') {
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
      }
      window.location.href = '/login?loggedout=1';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'var(--ak-nav)', borderTop: '1px solid var(--ak-border)', display: 'flex', height: '80px' }}>
      {navItems.map((item) => {
        const isItemActive = 'href' in item && item.href ? isActive(item.href) : false;
        const color = isItemActive ? '#f44335' : 'var(--ak-muted)';

        if ('action' in item && item.action === 'logout') {
          return (
            <button
              key="logout"
              type="button"
              onClick={handleLogout}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                flex: 1,
                fontSize: '10px',
                fontWeight: 500,
                color: color,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              title="Logout"
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <i className={`${item.icon} text-lg mb-1`} aria-hidden="true" style={{ marginBottom: '4px', fontSize: '18px' }} />
              <span>{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={'href' in item && item.href ? item.href : item.label}
            href={'href' in item && item.href ? item.href : '#'}
            className="flex flex-col items-center justify-center w-full h-full text-[10px] font-medium transition-colors flex-1"
            style={{ color }}
          >
            <i className={`${item.icon} text-lg mb-1`} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
