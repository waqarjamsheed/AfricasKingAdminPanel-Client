"use client";

import { useState } from 'react';

const faqs = [
  { q: 'How do I set up my IPTV on my phone?', a: 'Download IPTV Smarters Pro from the App Store or Google Play. Open the app, select "Login with Xtream Codes API", then enter your username, password and server URL from your Accounts tab.' },
  { q: 'How do I set up on Fire Stick?', a: 'On your Fire Stick, go to Settings → My Fire TV → Developer Options → turn on "Apps from Unknown Sources". Then use the Downloader app to install IPTV Smarters. Enter your credentials from the Accounts tab.' },
  { q: 'Why are my channels not loading?', a: 'Check that your internet connection is stable. Try refreshing channels from the Account tab. If the issue persists, contact us via email.' },
  { q: 'How do I update my payment details?', a: 'Go to the Payment tab to manage your subscription and payment method.' },
  { q: 'How many devices can I use simultaneously?', a: 'Each account supports one device at a time. Contact us for multi-screen packages.' },
  { q: 'What do I do if I forgot my password?', a: 'Use the "Forgot password?" link on the login page and we will send you a reset email.' },
  { q: 'How do I cancel my subscription?', a: 'Go to the Payment tab and select "Cancel Subscription". Your service will remain active until the end of your billing period.' },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--ak-text)' }}>FAQ</h1>
      <p className="text-xs mb-5" style={{ color: 'var(--ak-muted)' }}>Frequently asked questions</p>

      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-xl overflow-hidden border" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-4 text-left"
              style={{ background: 'transparent', color: 'var(--ak-text)', border: 'none', padding: '16px' }}
            >
              <span className="text-sm font-medium pr-3" style={{ color: 'var(--ak-text)' }}>{faq.q}</span>
              <span style={{ color: openIndex === i ? '#f44335' : 'var(--ak-muted)', flexShrink: 0 }}>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transition: 'transform 0.2s', transform: openIndex === i ? 'rotate(180deg)' : 'none' }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4">
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ak-muted)' }}>{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
