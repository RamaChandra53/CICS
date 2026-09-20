'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Profile = { id: string; roll_number?: string | null; pseudo_username?: string | null; real_display_name?: string | null; branch?: string | null; year?: string | null };
type Conversation = { userId: string; profile?: Profile | null; latest?: { body: string; image_url?: string | null; created_at: string } };
type Message = { id: string; sender_id: string; recipient_id: string; body: string; image_url?: string | null; created_at: string };

function Avatar({ name, className = '' }: { name: string; className?: string }) {
  return <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 font-bold text-slate-950 ${className}`}>{name.charAt(0).toUpperCase()}</div>;
}

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    setLoading(true);
    const response = await fetch('/api/messages');
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Unable to load messages.');
    else setConversations(data.conversations ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) void loadConversations(); }, [user]);

  useEffect(() => {
    if (!user || search.trim().length < 2 || activeChat) { setSuggestions([]); return; }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/messages?search=${encodeURIComponent(search.trim())}`);
      const data = await response.json();
      setSuggestions(response.ok ? data.profiles ?? [] : []);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [user, search, activeChat]);

  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    fetch(`/api/messages?with=${encodeURIComponent(activeChat)}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load conversation.');
      setMessages(data.messages ?? []);
    }).catch((caught: Error) => setError(caught.message));
  }, [activeChat]);

  const send = async () => {
    const recipient = selectedRecipientId || activeChat;
    if (!recipient || (!body.trim() && !image)) return;
    setError('');
    let imageUrl: string | null = null;
    if (image) {
      const extension = image.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user?.id}/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from('message-images').upload(path, image, { upsert: false, contentType: image.type });
      if (upload.error) { setError('Image uploads require migration 014.'); return; }
      imageUrl = supabase.storage.from('message-images').getPublicUrl(path).data.publicUrl;
    }
    const response = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient, body: body.trim(), imageUrl }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Unable to send message.'); return; }
    setBody(''); setImage(null); setSearch(''); setSuggestions([]); setActiveChat(recipient); setSelectedRecipientId(recipient);
    setMessages((current) => [...current, data.message]);
    await loadConversations();
  };

  const activeProfile = conversations.find((conversation) => conversation.userId === activeChat)?.profile;
  const activeName = activeProfile?.real_display_name || activeProfile?.pseudo_username || activeProfile?.roll_number || 'Campus member';

  return <div className="mx-auto w-full max-w-6xl px-3 py-5 md:px-6 md:py-8">
    <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Private messages</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Messages</h1><p className="mt-2 text-sm text-slate-500">Direct conversations stored in Supabase.</p></div><button onClick={() => router.push('/feed')} className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-white">Back to feed</button></div>
    <section className="grid min-h-[560px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] md:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 p-3 md:border-b-0 md:border-r"><div className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">People</div><div className="relative"><input value={search} onChange={(event) => { setSearch(event.target.value); setActiveChat(null); setSelectedRecipientId(null); }} placeholder="Search roll no. or profile" className="mb-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"/>{suggestions.length > 0 && <div className="absolute left-0 right-0 top-11 z-20 overflow-hidden rounded-xl border border-white/10 bg-[#151a24] shadow-xl">{suggestions.map((person) => { const name = person.real_display_name || person.pseudo_username || person.roll_number || 'Campus member'; return <button key={person.id} onClick={() => { setActiveChat(person.id); setSelectedRecipientId(person.id); setSearch(''); setSuggestions([]); }} className="flex w-full cursor-pointer items-center gap-2 border-b border-white/5 p-2.5 text-left transition last:border-0 hover:bg-white/10"><Avatar name={name} className="h-9 w-9 text-xs"/><span className="min-w-0"><span className="block truncate text-xs font-semibold text-white">{name}</span><span className="block truncate text-[10px] text-slate-500">{person.roll_number || person.branch || 'CICS profile'}</span></span></button>; })}</div>}</div>{loading ? <p className="px-2 py-5 text-xs text-slate-600">Loading conversations…</p> : conversations.length === 0 ? <p className="px-2 py-5 text-xs leading-5 text-slate-600">No conversations yet. Search a profile above.</p> : conversations.map((conversation) => { const name = conversation.profile?.real_display_name || conversation.profile?.pseudo_username || conversation.profile?.roll_number || 'Campus member'; return <button key={conversation.userId} onClick={() => { setActiveChat(conversation.userId); setSelectedRecipientId(conversation.userId); }} className={`mb-1 flex w-full cursor-pointer items-center gap-2 rounded-2xl p-2.5 text-left transition ${activeChat === conversation.userId ? 'bg-white/10' : 'hover:bg-white/5'}`}><Avatar name={name} className="h-9 w-9 text-xs"/><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-200">{name}</span><span className="block truncate text-[10px] text-slate-500">{conversation.latest?.body || (conversation.latest?.image_url ? 'Image attachment' : 'No message text')}</span></span></button>; })}</aside>
      <div className="flex min-h-[560px] flex-col"><div className="border-b border-white/10 bg-[#111521]/90 p-4"><p className="text-sm font-bold text-white">{activeChat ? activeName : 'New message'}</p><p className="mt-1 text-[10px] text-slate-500">Only participants can read this conversation.</p></div><div className="messages-wallpaper flex-1 space-y-3 p-5">{error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}{!activeChat ? <p className="py-16 text-center text-sm text-slate-500">Search for a roll number or profile to start.</p> : messages.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No messages in this conversation yet.</p> : messages.map((message) => <div key={message.id} className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender_id === user?.id ? 'ml-auto rounded-tr-md bg-cyan-300 text-slate-950' : 'rounded-tl-md bg-white/10 text-slate-200'}`}>{message.image_url && <img src={message.image_url} alt="Attached image" className="mb-2 max-h-72 rounded-xl object-cover" />}{message.body && <span>{message.body}</span>}</div>)}</div><div className="flex items-center gap-2 border-t border-white/10 p-3"><label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-300" title="Attach image">＋<input type="file" accept="image/*" className="hidden" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>{image && <span className="max-w-32 truncate text-[10px] text-slate-500">{image.name}</span>}<input value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void send(); }} placeholder="Write a message…" className="flex-1 rounded-xl bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-cyan-300/30"/><button onClick={() => void send()} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50" disabled={!activeChat && !selectedRecipientId}>➤</button></div></div>
    </section>
  </div>;
}
