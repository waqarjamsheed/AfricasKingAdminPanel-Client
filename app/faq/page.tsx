"use client";

import { useState } from 'react';

type Faq = { q: string; a: string; link?: { text: string; url: string } };

const faqs: Faq[] = [
  { q: 'How do I set up on Fire Stick?', a: 'On your Fire Stick, go to Settings → My Fire TV → Developer Options → turn on "Apps from Unknown Sources". Open the Downloader app and enter the link below to download the AfricasKing app. Once installed, enter your credentials from the Accounts tab.', link: { text: 'https://africasking.net/Flight713', url: 'https://africasking.net/Flight713' } },
  { q: 'Why are my channels not loading?', a: 'Check that your internet connection is stable. Try refreshing channels from the Setting tab. If the issue persists, contact us via email.' },
  { q: 'How do I update my payment details?', a: 'Go to the Payment tab to manage your subscription and payment method.' },
  { q: 'How many devices can I use simultaneously?', a: 'Each account supports one device at a time.' },
  { q: 'How do I cancel my subscription?', a: 'Click unsubscribe at the top.' },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--ak-text)' }}>FAQ</h1>
      <p className="text-xs mb-5" style={{ color: 'var(--ak-muted)' }}>Frequently asked questions</p>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-xl overflow-hidden border" style={{ background: 'var(--ak-card)', borderColor: 'var(--ak-border)' }}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-5 text-left"
              style={{ background: 'transparent', color: 'var(--ak-text)', border: 'none' }}
            >
              <span className="text-sm font-medium pr-4" style={{ color: 'var(--ak-text)' }}>{faq.q}</span>
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
                {faq.link && (
                  <a
                    href={faq.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs font-medium break-all"
                    style={{ color: '#f44335' }}
                  >
                    {faq.link.text}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
