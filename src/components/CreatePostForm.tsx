'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile, ROOMS } from '@/types';

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

  // Rooms accessible to this user
  const accessibleRooms = profile.is_anonymous
    ? ROOMS.filter(r => ['college', 'confessions', 'random', 'rants'].includes(r.id))
    : ROOMS;
  const canSelectFromPresetRooms = accessibleRooms.some(r => r.id === room);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');

    try {
      const normalizedRoom = room === 'college' ? 'campus' : room;
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
        is_anon_post: isAnon || normalizedRoom === 'confessions',
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
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-[#1a1a1a] border border-gray-800/60 rounded-2xl px-4 py-3.5 text-gray-500 hover:border-indigo-500/40 hover:text-gray-300 text-left text-sm transition-colors flex items-center gap-3"
      >
        <span className="text-lg">✏️</span>
        What&apos;s on your mind?
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind?"
        autoFocus
        rows={3}
        className="w-full bg-transparent text-white placeholder-gray-600 text-sm resize-none focus:outline-none mb-3"
      />

      {/* Image preview */}
      {imageFile && (
        <div className="relative mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={URL.createObjectURL(imageFile)}
            alt="Preview"
            className="rounded-xl max-h-48 object-cover w-full"
          />
          <button
            type="button"
            onClick={() => setImageFile(null)}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      )}

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

          {/* Anonymous toggle */}
          {room !== 'confessions' && (
            <button
              type="button"
              onClick={() => setIsAnon(!isAnon)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg transition-colors ${
                isAnon
                  ? 'bg-gray-600 text-gray-200'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              👻 {isAnon ? 'Anonymous' : 'Post as anon?'}
            </button>
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
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
