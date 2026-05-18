"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationLoader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prevPath, setPrevPath] = useState<string | null>(null);

  useEffect(() => {
    const onStart = () => setOpen(true);
    window.addEventListener('ak:navigate-start', onStart);
    return () => window.removeEventListener('ak:navigate-start', onStart);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (prevPath && pathname !== prevPath) {
      setOpen(true);
      const t = setTimeout(() => setOpen(false), 500);
      setPrevPath(pathname);
      return () => clearTimeout(t);
    }
    if (!prevPath) setPrevPath(pathname);
  }, [pathname, prevPath]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 1500);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;
  return <div className="nav-shimmer-bar" />;
}
