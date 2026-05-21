'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROOMS } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import RedditNavbar from '@/components/RedditNavbar';
import RedditMobileNav from '@/components/RedditMobileNav';

export default function CommunitiesPage() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const getRoomIcon = (roomId: string) => {
    switch (roomId) {
      case 'campus': return '🎓';
      case 'placements': return '💼';
      case 'exams': return '📚';
      case 'hostellife': return '🏠';
      case 'confessions': return '🤫';
      case 'memes': return '😂';
      case 'academics': return '📖';
      case 'events': return '🎉';
      case 'sports': return '⚽';
      case 'tech': return '💻';
      default: return '📌';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <RedditNavbar />
      
      <main className="pt-16 pb-20 px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Communities</h1>
        
        {/* MY COMMUNITIES Section */}
        <div className="mb-6">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3 px-1">
            MY COMMUNITIES
          </div>
          
          <div className="bg-[#1a1a1b] border border-[#343536] rounded-xl overflow-hidden">
            {ROOMS.slice(0, 5).map((room, index) => (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className={`flex items-center gap-3 p-4 transition-colors hover:bg-[#2d2d2e] ${
                  index !== 0 ? 'border-t border-[#343536]' : ''
                }`}
              >
                <div className="w-10 h-10 bg-[#2d2d2e] rounded-full flex items-center justify-center text-xl">
                  {getRoomIcon(room.id)}
                </div>
                <div>
                  <div className="text-white font-medium text-base">{room.label}</div>
                  <div className="text-gray-400 text-sm">r/{room.id}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ALL COMMUNITIES Section */}
        <div className="mb-6">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3 px-1">
            ALL COMMUNITIES
          </div>
          
          <div className="bg-[#1a1a1b] border border-[#343536] rounded-xl overflow-hidden">
            {ROOMS.slice(5).map((room, index) => (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className={`flex items-center gap-3 p-4 transition-colors hover:bg-[#2d2d2e] ${
                  index !== 0 ? 'border-t border-[#343536]' : ''
                }`}
              >
                <div className="w-10 h-10 bg-[#2d2d2e] rounded-full flex items-center justify-center text-xl">
                  {getRoomIcon(room.id)}
                </div>
                <div>
                  <div className="text-white font-medium text-base">{room.label}</div>
                  <div className="text-gray-400 text-sm">r/{room.id}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      
      <RedditMobileNav />
    </div>
  );
}
