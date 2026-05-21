'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { id: 'home', href: '/feed', label: 'Home' },
  { id: 'communities', href: '/communities', label: 'Communities' },
  { id: 'post', href: '/feed?compose=1', label: 'Post' },
  { id: 'notifications', href: '/notifications', label: 'Notifications' },
  { id: 'profile', href: '/profile', label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[#252a31] bg-[#0b0f12] pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            item.id === 'post'
              ? false
              : item.id === 'home'
              ? pathname === '/feed'
              : item.id === 'communities'
              ? pathname.startsWith('/communities') || pathname.startsWith('/room')
              : item.id === 'notifications'
              ? pathname.startsWith('/notifications')
              : item.id === 'profile'
              ? pathname.startsWith('/profile')
              : false;

          const iconClassName = `h-5 w-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={(event) => {
                if (item.id !== 'post') return;
                event.preventDefault();
                if (pathname !== '/feed') {
                  router.push('/feed?compose=1');
                  return;
                }
                const target = document.getElementById('create-post');
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-400'
              }`}
            >
              {item.id === 'home' && (
                <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
                </svg>
              )}
              {item.id === 'communities' && (
                <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M7 21v-2a4 4 0 0 1 3-3.87" />
                  <circle cx="12" cy="7" r="3" />
                  <path d="M5.5 8a3.5 3.5 0 1 0 0-7" />
                  <path d="M18.5 1a3.5 3.5 0 1 1 0 7" />
                </svg>
              )}
              {item.id === 'post' && (
                <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              )}
              {item.id === 'notifications' && (
                <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              )}
              {item.id === 'profile' && (
                <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20a6 6 0 0 1 12 0" />
                </svg>
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
