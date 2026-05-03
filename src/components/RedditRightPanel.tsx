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
          
          <div className="flex items-center gap-4 text-gray-400 text-sm mb-4">
            <div>
              <div className="text-white font-semibold">1.2k</div>
              <div>Members</div>
            </div>
            <div>
              <div className="text-white font-semibold">45</div>
              <div>Online</div>
            </div>
          </div>
          
          <button className="w-full bg-[#0079d3] hover:bg-[#0066b3] text-white py-2 px-4 rounded-full font-medium text-sm transition-colors">
            Join Community
          </button>
        </div>
      )}

      {/* About CICS */}
      <div className="p-4">
        <h3 className="text-white font-bold text-sm mb-3">About CICS</h3>
        <div className="space-y-2 text-gray-400 text-sm">
          <div>• College Internal Communication System</div>
          <div>• Connect with students across all branches</div>
          <div>• Share campus updates and experiences</div>
          <div>• Anonymous posting supported</div>
          <div>• Verified student accounts only</div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="p-4 border-t border-[#343536]">
        <h3 className="text-white font-bold text-sm mb-3">Quick Links</h3>
        <div className="space-y-2">
          <a href="#" className="block text-[#0079d3] hover:underline text-sm">Campus Rules</a>
          <a href="#" className="block text-[#0079d3] hover:underline text-sm">Academic Calendar</a>
          <a href="#" className="block text-[#0079d3] hover:underline text-sm">Placement Resources</a>
          <a href="#" className="block text-[#0079d3] hover:underline text-sm">Hostel Info</a>
        </div>
      </div>

      {/* Create Post Button */}
      <div className="p-4 border-t border-[#343536]">
        <button className="w-full bg-[#0079d3] hover:bg-[#0066b3] text-white py-2 px-4 rounded-full font-medium text-sm transition-colors">
          Create Post
        </button>
      </div>
    </div>
  );
}
