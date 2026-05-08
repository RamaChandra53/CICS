'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile, ROOMS } from '@/types';
import EmailVerificationModal from './EmailVerificationModal';

interface CreatePostFormProps {
  profile: Profile;
  defaultRoom?: string;
  onPostCreated?: () => void;
}

export default function CreatePostForm({ profile, defaultRoom = 'college', onPostCreated }: CreatePostFormProps) {
  const supabase = createClient();
  const [content, setContent] = useState('');
  const [room, setRoom] = useState(defaultRoom);
  const [isAnon, setIsAnon] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [displayMode, setDisplayMode] = useState<'full' | 'partial' | 'anonymous'>('full');
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Rooms accessible to this user
  const accessibleRooms = profile.is_anonymous
    ? ROOMS.filter(r => ['college', 'confessions', 'random', 'rants'].includes(r.id))
    : ROOMS;
  const canSelectFromPresetRooms = accessibleRooms.some(r => r.id === room);

  const handleDisplayModeChange = (mode: 'full' | 'partial' | 'anonymous') => {
    if (!profile.is_email_verified && mode !== 'full') {
      setShowVerificationModal(true);
      return;
    }
    setDisplayMode(mode);
  };

  const handleVerificationSuccess = () => {
    // Profile verification status is handled by AuthContext
    // The profile prop will be updated automatically through the context
    setShowVerificationModal(false);
  };

  const getDisplayModeLabel = (mode: 'full' | 'partial' | 'anonymous') => {
    switch (mode) {
      case 'full':
        return profile.roll_number 
          ? `${profile.roll_number} · ${profile.branch || 'Unknown'} · ${profile.year || 'Unknown'}`
          : profile.username || 'Unknown';
      case 'partial':
        return profile.branch && profile.year 
          ? `${profile.branch}_${profile.year} ✓`
          : 'Verified ✓';
      case 'anonymous':
        return '👻 Anonymous';
      default:
        return profile.username || 'Unknown';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Use room directly since schema expects 'college' not 'campus'
      const normalizedRoom = room;
      let imageUrl: string | null = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${profile.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      const postData: Record<string, unknown> = {
        author_id: profile.id,
        room: normalizedRoom,
        content: content.trim(),
        display_mode: displayMode, // Use display_mode instead of is_anon_post
        image_url: imageUrl,
      };

      // Add filter tags for filtered rooms
      if (normalizedRoom === 'year' || normalizedRoom === 'section') postData.year_tag = profile.year;
      if (normalizedRoom === 'branch' || normalizedRoom === 'section') postData.branch_tag = profile.branch;
      if (normalizedRoom === 'section') postData.section_tag = profile.section;
      
      const { error: insertError } = await supabase.from('posts').insert(postData);
      if (insertError) throw insertError;

      setContent('');
      setImageFile(null);
      setIsAnon(false);
      setExpanded(false);
      onPostCreated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <div
        onClick={() => { setExpanded(true); setError(''); }}
        className="flex items-center gap-3 p-2 cursor-pointer hover:bg-[#343536] transition-colors"
      >
        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Create Post"
          className="flex-1 bg-transparent text-[#d7dadc] placeholder-gray-500 outline-none cursor-pointer text-sm"
          readOnly
        />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-2">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's on your mind?"
          autoFocus
          rows={3}
          className="w-full bg-transparent text-white placeholder-gray-600 text-sm resize-none focus:outline-none mb-3"
        />

      {error && (
        <p className="text-red-400 text-xs mb-3 bg-red-900/20 border border-red-800/40 rounded-lg p-2">{error}</p>
      )}

      <div className="flex items-center justify-between border-t border-gray-800/40 pt-3">
        <div className="flex items-center gap-2">
          {/* Room selector */}
          {canSelectFromPresetRooms ? (
            <select
              value={room}
              onChange={e => setRoom(e.target.value)}
              className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none border border-gray-700"
            >
              {accessibleRooms.map(r => (
                <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
              ))}
            </select>
          ) : (
            <span className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700">
              r/{room}
            </span>
          )}

          {/* Image upload */}
          <label className="cursor-pointer text-gray-500 hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-gray-800">
            <span className="text-base">🖼️</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setImageFile(e.target.files?.[0] || null)}
            />
          </label>

          {/* Display mode selector */}
          {room !== 'confessions' && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs mr-1">Post as:</span>
              {(['full', 'partial', 'anonymous'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleDisplayModeChange(mode)}
                  disabled={!profile.is_email_verified && mode !== 'full'}
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border transition-all duration-200 font-medium ${
                    displayMode === mode
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
                      : profile.is_email_verified || mode === 'full'
                      ? 'bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-700/50 hover:text-gray-300 hover:border-gray-600'
                      : 'bg-gray-900/30 text-gray-600 border-gray-800 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    displayMode === mode
                      ? 'bg-white'
                      : profile.is_email_verified || mode === 'full'
                      ? 'bg-gray-500'
                      : 'bg-gray-600'
                  }`} />
                  <span>{getDisplayModeLabel(mode)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setExpanded(false); setError(''); }}
            className="text-gray-500 hover:text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </form>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
        userRollNumber={profile.roll_number || ''}
      />
    </>
  );
}
