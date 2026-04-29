'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/feed', icon: '🏠', label: 'Feed' },
  { href: '/room/confessions', icon: '🔥', label: 'Confess' },
  { href: '/room/random', icon: '💬', label: 'Random' },
  { href: '/profile', icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#111] border-t border-gray-800/60">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/feed' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${
                isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
