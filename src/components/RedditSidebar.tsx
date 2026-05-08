'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ROOMS } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import CreatePostForm from '@/components/CreatePostForm';

export default function RedditSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [showCreatePost, setShowCreatePost] = useState(false);
  
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
    <div className="fixed left-0 top-12 bottom-0 w-60 bg-[#1a1a1b] border-r border-[#343536] overflow-y-auto">
      <div className="p-2">
        {/* MY COMMUNITIES Section */}
        <div className="mb-2">
          <div className="text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1 px-1">
            MY COMMUNITIES
          </div>
          
          {ROOMS.slice(0, 5).map((room) => (
            <Link
              key={room.id}
              href={`/room/${room.id}`}
              className={`flex items-center gap-1 px-1 py-0.5 rounded-xs text-xs transition-colors ${
                pathname === `/room/${room.id}` 
                  ? 'bg-[#333436] text-white' 
                  : 'text-gray-400 hover:bg-[#2d2d2e] hover:text-white'
              }`}
            >
              <span className="text-xs">{getRoomIcon(room.id)}</span>
              <span className="font-medium">{room.label}</span>
            </Link>
          ))}
        </div>

        {/* ALL COMMUNITIES Section */}
        <div className="mb-4">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-2">
            ALL COMMUNITIES
          </div>
          
          {ROOMS.slice(5).map((room) => (
            <Link
              key={room.id}
              href={`/room/${room.id}`}
              className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${
                pathname === `/room/${room.id}` 
                  ? 'bg-[#333436] text-white' 
                  : 'text-gray-400 hover:bg-[#2d2d2e] hover:text-white'
              }`}
            >
              <span className="text-lg">{getRoomIcon(room.id)}</span>
              <span className="font-medium">{room.label}</span>
            </Link>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-[#343536] bg-[#1a1a1b]">
          {/* Create Post Button */}
          {profile && (
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex items-center gap-2 px-2 py-1 rounded text-sm bg-[#0079d3] hover:bg-[#1a76d3] text-white transition-colors w-full mb-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">Create Post</span>
            </button>
          )}
          
          <Link
            href="/profile"
            className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${
              pathname === '/profile' 
                ? 'bg-[#333436] text-white' 
                : 'text-gray-400 hover:bg-[#2d2d2e] hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">Profile</span>
          </Link>
          
          <button 
            onClick={async () => {
              await signOut();
              router.push('/');
            }}
            className="flex items-center gap-2 px-2 py-1 rounded text-sm text-gray-400 hover:bg-[#2d2d2e] hover:text-white transition-colors w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
      
      {/* Create Post Modal */}
      {showCreatePost && profile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1b] border border-[#343536] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-[#343536] flex items-center justify-between">
              <h2 className="text-white font-semibold">Create Post</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <CreatePostForm
                profile={profile}
                onPostCreated={() => {
                  setShowCreatePost(false);
                  router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
