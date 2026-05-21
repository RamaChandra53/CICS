'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROOMS } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import RedditNavbar from '@/components/RedditNavbar';

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
    <div className="min-h-screen bg-[#0b0f12]">
      <RedditNavbar />

      <main className="pt-2 md:pt-16 pb-24 px-3 md:px-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-6">Communities</h1>
        
        {/* MY COMMUNITIES Section */}
        <div className="mb-6">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3 px-1">
            MY COMMUNITIES
          </div>
          
          <div className="bg-[#15181c] border border-[#252a31] rounded-2xl overflow-hidden">
            {ROOMS.slice(0, 5).map((room, index) => (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className={`flex items-center gap-3 p-4 transition-colors hover:bg-[#1f2329] ${
                  index !== 0 ? 'border-t border-[#252a31]' : ''
                }`}
              >
                <div className="w-10 h-10 bg-[#1f2329] rounded-full flex items-center justify-center text-xl">
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
          
          <div className="bg-[#15181c] border border-[#252a31] rounded-2xl overflow-hidden">
            {ROOMS.slice(5).map((room, index) => (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className={`flex items-center gap-3 p-4 transition-colors hover:bg-[#1f2329] ${
                  index !== 0 ? 'border-t border-[#252a31]' : ''
                }`}
              >
                <div className="w-10 h-10 bg-[#1f2329] rounded-full flex items-center justify-center text-xl">
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
    </div>
  );
}
