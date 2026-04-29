'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ROOMS } from '@/types';
import { createClient } from '@/lib/supabase';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-[#111] border-r border-gray-800/60 fixed left-0 top-0 z-10">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800/60">
        <Link href="/feed" className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <div>
            <span className="text-white font-bold text-base">CICS</span>
            <p className="text-gray-500 text-[10px] leading-none">College Chat</p>
          </div>
        </Link>
      </div>

      {/* Rooms */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-gray-600 text-[10px] uppercase tracking-widest px-3 py-2">Rooms</p>
        {ROOMS.map(room => {
          const href = room.id === 'college' ? '/feed' : `/room/${room.id}`;
          const isActive = pathname === href || (room.id !== 'college' && pathname.startsWith(`/room/${room.id}`));
          return (
            <Link
              key={room.id}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span className="text-base">{room.icon}</span>
              <span>{room.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div className="p-3 border-t border-gray-800/60 space-y-1">
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            pathname === '/profile'
              ? 'bg-indigo-600/20 text-indigo-400 font-medium'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <span className="text-base">👤</span>
          <span>My Profile</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition-colors w-full text-left"
        >
          <span className="text-base">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
