import './globals.css';
import { ReactNode } from 'react';
import Header from './ui/Header';
import BottomNav from './ui/BottomNav';

export const metadata = {
  title: 'AfricasKing',
  description: 'Manage subscriptions'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#ef4444" />
        {/* Font Awesome for icons */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/font-awesome@6.5.0/css/all.min.css" />
        {/* Tailwind via CDN with theme script */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const saved = localStorage.getItem('theme');
              const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              const isDark = saved ? saved === 'dark' : prefersDark;
              document.documentElement.classList.toggle('dark', isDark);
              document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
              document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
            } catch {}
            window.tailwind = window.tailwind || {};
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    primary: {
                      DEFAULT: '#ef4444',
                      50:'#fef2f2',100:'#fee2e2',200:'#fecaca',300:'#fca5a5',400:'#f87171',500:'#ef4444',600:'#dc2626',700:'#b91c1c',800:'#991b1b',900:'#7f1d1d',950:'#450a0a'
                    }
                  },
                  boxShadow: {
                    soft: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)'
                  }
                }
              }
            };
          })();
        `}} />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ak-bg)', color: 'var(--ak-text)' }}>
        <Header />
        <div style={{ flex: 1, paddingBottom: '80px', overflow: 'auto', padding: '20px' }}>
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
