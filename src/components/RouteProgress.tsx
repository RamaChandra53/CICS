'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showProgress = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      setPending(true);
      hideTimerRef.current = setTimeout(() => setPending(false), 4000);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return;

      showProgress();
    };

    const handleManualStart = () => showProgress();

    document.addEventListener('click', handleClick, true);
    window.addEventListener('cics-route-start', handleManualStart);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('cics-route-start', handleManualStart);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pending) return;

    const hideTimer = setTimeout(() => setPending(false), 180);
    return () => clearTimeout(hideTimer);
  }, [pathname, pending]);

  return (
    <div
      aria-hidden="true"
      className={`fixed left-0 right-0 top-0 z-[60] h-0.5 origin-left bg-indigo-400 transition-all duration-300 ${
        pending ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
      }`}
    />
  );
}
