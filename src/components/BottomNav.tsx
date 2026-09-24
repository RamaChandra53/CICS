'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { id: 'home', href: '/feed', label: 'Home' },
  { id: 'post', href: '/post', label: 'Post' },
  { id: 'profile', href: '/profile', label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border-primary bg-bg-secondary pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 w-full max-w-[480px] items-center justify-around px-1 sm:px-2">
        {navItems.map((item) => {
          const isActive =
            item.id === 'post'
              ? pathname === '/post'
              : item.id === 'home'
              ? pathname === '/feed'
              : item.id === 'profile'
              ? pathname.startsWith('/profile')
              : false;

          const iconClassName = `h-5 w-5 ${isActive ? 'text-accent-primary' : 'text-text-muted'}`;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-accent-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {item.id === 'home' && (
                <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
                </svg>
              )}
              {item.id === 'post' && (
                <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              )}
              {item.id === 'profile' && (
                <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
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
