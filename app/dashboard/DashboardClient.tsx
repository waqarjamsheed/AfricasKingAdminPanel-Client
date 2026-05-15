"use client";

import { useState } from 'react';

const apps = [
  { id: 'ios', name: 'iOS / Android Phone', description: 'Download for iPhone, iPad and Android devices' },
  { id: 'firestick', name: 'Fire Stick', description: 'Set up on Amazon Fire Stick or Fire TV' },
  { id: 'appletv', name: 'Apple TV', description: 'Install and stream on Apple TV 4K' },
  { id: 'smarttv', name: 'Smart TV', description: 'Available on Samsung, LG and Android TV' },
];

function AppIcon({ id }: { id: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="1.5">
      {id === 'ios' && <><rect x="5" y="2" width="14" height="20" rx="2" /><circle cx="12" cy="17" r="1" fill="#f44335" /></>}
      {id === 'firestick' && <><rect x="2" y="7" width="20" height="10" rx="2" /><path d="M8 17v3M16 17v3M6 20h12" /><circle cx="12" cy="12" r="2" fill="#f44335" /></>}
      {id === 'appletv' && <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 17v2M16 17v2M6 19h12" /><path d="M9 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></>}
      {id === 'smarttv' && <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>}
    </svg>
  );
}

export default function DashboardClient() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="px-4 pt-5">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--ak-text)' }}>Applications</h1>
      <p className="text-xs mb-4" style={{ color: 'var(--ak-muted)' }}>Select your device to get setup instructions</p>

      <div className="space-y-3">
        {apps.map((app) => (
          <button
            key={app.id}
            onClick={() => setSelected(selected === app.id ? null : app.id)}
            className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all border-2"
            style={{
              background: 'var(--ak-card)',
              borderColor: selected === app.id ? '#f44335' : 'var(--ak-border)',
              color: 'var(--ak-text)',
            }}
          >
            <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--ak-card2)' }}>
              <AppIcon id={app.id} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--ak-text)' }}>{app.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ak-muted)' }}>{app.description}</p>
            </div>
            <span style={{ color: selected === app.id ? '#f44335' : 'var(--ak-muted)' }}>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transition: 'transform 0.2s', transform: selected === app.id ? 'rotate(90deg)' : 'none' }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-4 rounded-xl p-4 border" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ak-text)' }}>Setup Instructions</p>
          <ol className="text-xs space-y-2 list-decimal list-inside" style={{ color: 'var(--ak-muted)' }}>
            <li>Download the IPTV Smarters Pro app from your app store</li>
            <li>Open the app and tap &quot;Login with Xtream Codes API&quot;</li>
            <li>Enter your username, password and the server URL from your Accounts tab</li>
            <li>Tap &quot;Add User&quot; and enjoy your content</li>
          </ol>
        </div>
      )}
    </div>
  );
}
