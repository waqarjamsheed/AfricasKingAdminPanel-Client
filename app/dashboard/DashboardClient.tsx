"use client";

import { useEffect, useState } from 'react';
import { ShimmerBlock } from '../ui/Shimmer';

const IOS_URL = process.env.NEXT_PUBLIC_IOS_APP_URL || '';
const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL || '';
const ANDROID_TV_URL = process.env.NEXT_PUBLIC_ANDROID_TV_APP_URL || '';
const APPLE_TV_URL = process.env.NEXT_PUBLIC_APPLE_TV_APP_URL || process.env.NEXT_PUBLIC_IOS_APP_URL || '';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://web.africasking.net';

type App = {
  id: string;
  name: string;
  description: string;
  url: string;
  infoOnly?: boolean;
  icon: React.ReactNode;
};

const apps: App[] = [
  {
    id: 'ios',
    name: 'iOS — iPhone & iPad',
    description: 'Download on the App Store',
    url: IOS_URL,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="1.5">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <circle cx="12" cy="17" r="1" fill="#f44335" />
      </svg>
    ),
  },
  {
    id: 'android',
    name: 'Android — Phones & Tablets',
    description: 'Get it on Google Play',
    url: ANDROID_URL,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="1.5">
        <path d="M4 16.5V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8.5" />
        <rect x="2" y="16" width="20" height="3" rx="1.5" />
        <path d="M8 2.5L6 1M16 2.5l2-1.5" strokeLinecap="round" />
        <circle cx="9" cy="10" r="1" fill="#f44335" stroke="none" />
        <circle cx="15" cy="10" r="1" fill="#f44335" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'tv',
    name: 'TV — Google TV & Android TV',
    description: 'Coming Soon',
    url: '',
    infoOnly: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" strokeLinecap="round" />
        <circle cx="12" cy="10" r="2.5" fill="#f44335" stroke="none" />
        <path d="M10 10l-1.5-1.5M14 10l1.5-1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'appletv',
    name: 'Apple TV',
    description: 'Search "AfricasKing" on the App Store on your Apple TV',
    url: '',
    infoOnly: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="1.5">
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 17v2M16 17v2M6 19h12" strokeLinecap="round" />
        <path d="M9 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'web',
    name: 'Web App',
    description: 'Stream directly in your browser',
    url: WEB_URL,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
];

export default function DashboardClient() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(t);
  }, []);

  if (!loaded) {
    return (
      <div className="px-4 pt-5 pb-6">
        <ShimmerBlock className="h-6 w-32 mb-2" />
        <ShimmerBlock className="h-3 w-48 mb-5" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl p-4 flex items-center gap-4 border-2" style={{ borderColor: 'var(--ak-border)', background: 'var(--ak-card)' }}>
              <ShimmerBlock className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <ShimmerBlock className="h-4 w-36" />
                <ShimmerBlock className="h-3 w-52" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleTap = (app: App) => {
    if (app.infoOnly || !app.url) return;
    window.open(app.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--ak-text)' }}>Applications</h1>
      <p className="text-xs mb-4" style={{ color: 'var(--ak-muted)' }}>Tap your device to download the app</p>

      <div className="space-y-3">
        {apps.map((app) => {
          const clickable = !app.infoOnly && !!app.url;
          const Wrapper = clickable ? 'button' : 'div';
          return (
            <Wrapper
              key={app.id}
              onClick={clickable ? () => handleTap(app) : undefined}
              className="w-full rounded-xl p-4 flex items-center gap-4 text-left border-2"
              style={{
                background: 'var(--ak-card)',
                borderColor: 'var(--ak-border)',
                color: 'var(--ak-text)',
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--ak-card2)' }}>
                {app.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--ak-text)' }}>{app.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ak-muted)' }}>{app.description}</p>
              </div>
              {clickable && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ak-muted)', flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
