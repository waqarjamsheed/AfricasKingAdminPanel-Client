import './globals.css';
import { ReactNode } from 'react';
import Script from 'next/script';
import Header from './ui/Header';

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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        {/* Tailwind via CDN (kept for immediate styles) with early theme application */}
        <Script id="ak-tailwind-config" strategy="beforeInteractive">
          {`
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
          `}
        </Script>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100" suppressHydrationWarning>
        <Header />
        <div className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}
