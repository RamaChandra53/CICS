'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RedditMobileNav() {
  const pathname = usePathname();

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠', href: '/feed' },
    { id: 'communities', label: 'Communities', icon: '👥', href: '/communities' },
    { id: 'create', label: 'Post', icon: '➕', href: '#' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', href: '/notifications' },
    { id: 'profile', label: 'Profile', icon: '👤', href: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1b] border-t border-[#343536] z-50 md:hidden">
      <div className="flex items-center justify-around h-12">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center justify-center text-xs transition-colors ${
              pathname === item.href
                ? 'text-[#0079d3]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-lg mb-1">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
