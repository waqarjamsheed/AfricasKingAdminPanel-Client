"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [videoOpen, setVideoOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText('Info@africasking.net').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(app), (user) => {
      if (user) {
        router.replace('/credentials');
      } else {
        setAuthChecked(true);
      }
    });
    return () => unsub();
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-full max-w-xs mx-5">
          <div className="bg-white/10 rounded-2xl py-8 px-7 space-y-4">
            <div className="shimmer-block h-10 w-full rounded-lg" />
            <div className="shimmer-block h-10 w-full rounded-lg" />
            <div className="shimmer-block h-10 w-full rounded-lg" />
            <div className="shimmer-block h-12 w-full rounded-full mt-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-start md:justify-around pt-10 pb-10 px-5 bg-black">
      <img src="/icon.png" alt="AfricasKing" className="w-[600px] h-full hidden md:flex" />

      <div className="bg-white rounded-2xl py-8 px-7 w-full max-w-xs shadow-xl mb-6">
        <Link
          href="/login"
          className="block py-4 border-b border-gray-200 text-zinc-800 text-sm font-medium hover:opacity-70 transition-opacity"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="block py-4 border-b border-gray-200 text-zinc-800 text-sm font-medium hover:opacity-70 transition-opacity"
        >
          Register
        </Link>
        <button
          onClick={copyEmail}
          className="w-full flex items-center justify-between py-4 border-b border-gray-200 text-left hover:opacity-70 transition-opacity"
          style={{ background: 'none', border: 'none', borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
        >
          <span className="text-zinc-800 text-sm font-medium">Info@africasking.net</span>
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
        <button
          onClick={() => setVideoOpen(true)}
          className="block mt-5 w-full py-3.5 bg-[#f44335] text-white text-sm font-semibold rounded-full text-center hover:opacity-90 transition-opacity"
        >
          Video
        </button>
      </div>

      <img src="/icon.png" alt="AfricasKing" className="w-96 flex md:hidden" />

      {/* Video modal */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setVideoOpen(false)}
              className="absolute -top-10 right-0 text-white opacity-70 hover:opacity-100"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <video
              src="/video/into.mp4"
              controls
              autoPlay
              className="w-full rounded-xl"
              style={{ maxHeight: '80vh' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
