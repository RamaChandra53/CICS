'use client';

import { ROOMS } from '@/types';

export default function RedditRightPanel({ currentRoom }: { currentRoom?: string }) {
  const room = currentRoom ? ROOMS.find(r => r.id === currentRoom) : null;

  return (
    <div className="hidden xl:block w-80 bg-[#1a1a1b] border border-[#343536] rounded">
      {/* Community Info */}
      {room && (
        <div className="p-4 border-b border-[#343536]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#0079d3] rounded-full flex items-center justify-center text-white text-xl">
              {room.icon}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">r/{room.label}</h3>
              <p className="text-gray-400 text-sm">r/{room.id}</p>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm mb-3">
            {room.label} community for CICS students. Share your experiences, ask questions, and connect with fellow students.
          </p>
          
          <div className="text-gray-400 text-sm mb-4">
            r/{room?.label} community for CICS students
          </div>
          
          <button className="w-full bg-[#0079d3] hover:bg-[#0066b3] text-white py-2 px-4 rounded-full font-medium text-sm transition-colors">
            Join Community
          </button>
        </div>
      )}

      
      
          </div>
  );
}
