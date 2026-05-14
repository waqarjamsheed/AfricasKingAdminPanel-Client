"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LoaderOverlay from './LoaderOverlay';

export default function NavigationLoader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prevPath, setPrevPath] = useState<string | null>(null);

  // Show loader when custom navigate-start is fired (side menu links trigger this)
  useEffect(() => {
    const onStart = () => setOpen(true);
    window.addEventListener('ak:navigate-start', onStart);
    return () => window.removeEventListener('ak:navigate-start', onStart);
  }, []);

  // Also show on any pathname change, and auto-hide after a short delay
  useEffect(() => {
    if (!pathname) return;
    if (prevPath && pathname !== prevPath) {
      setOpen(true);
      const t = setTimeout(() => setOpen(false), 400);
      setPrevPath(pathname);
      return () => clearTimeout(t);
    }
    if (!prevPath) setPrevPath(pathname);
  }, [pathname, prevPath]);

  // Safety: ensure loader never stays stuck
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 1200);
    return () => clearTimeout(t);
  }, [open]);

  return <LoaderOverlay open={open} text="Loading…" />;
}
