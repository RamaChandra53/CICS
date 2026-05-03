'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function RedditNavbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  return (
    <nav className="fixed top-0 left-0 right-0 h-12 bg-[#1a1a1b] border-b border-[#343536] z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link href="/feed" className="text-white font-bold text-lg">
            CICS
          </Link>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search CICS"
              className="w-full bg-[#272729] text-white placeholder-gray-500 rounded-full py-2 px-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-[#0079d3]"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right: Notifications and Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Bell */}
          <button className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Profile Avatar */}
          <div className="w-8 h-8 bg-[#0079d3] rounded-full flex items-center justify-center text-white text-sm font-bold">
            U
          </div>
        </div>
      </div>
    </nav>
  );
}
