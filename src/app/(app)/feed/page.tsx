'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type IdentityMode = 'ghost' | 'section' | 'open';
type View = 'feed' | 'messages' | 'spaces' | 'saved';
type FeedTab = 'forYou' | 'following' | 'trending';
type FeedPost = { id: string; author: string; tag: string; mode: IdentityMode; time: string; body: string; likes: number; comments: number; image_url?: string | null; liked?: boolean };
type JoinedProfile = { real_display_name?: string | null; pseudo_username?: string | null; branch?: string | null; year?: string | null };
type DbPost = { id: string; content: string; image_url?: string | null; display_mode: string | null; created_at: string; upvotes: number | null; comment_count?: { count: number }[]; profiles: JoinedProfile | JoinedProfile[] | null };
type Conversation = { userId: string; profile?: JoinedProfile | null; latest?: { body: string; created_at: string } };
type DirectMessage = { id: string; sender_id: string; recipient_id: string; body: string; image_url?: string | null; created_at: string };
type Recipient = { id: string; roll_number?: string | null; pseudo_username?: string | null; real_display_name?: string | null; branch?: string | null; year?: string | null };

const identityModes: { id: IdentityMode; label: string; detail: string; icon: string }[] = [
  { id: 'ghost', label: 'Ghost mode', detail: 'No name or section', icon: '✦' },
  { id: 'section', label: 'Section only', detail: 'Your branch and year', icon: '◌' },
  { id: 'open', label: 'Open profile', detail: 'Your chosen display name', icon: '◎' },
];

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-4-.9L4 20l1.3-3.7A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"/></>,
    compass: <><circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-1.5 4.1-4.1 1.5 1.5-4.1 4.1-1.5Z"/></>,
    bookmark: <path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21L12 17.5 6.5 21V4.5Z"/>,
    search: <><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
    heart: <path d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9Z"/>,
    comment: <path d="M20 11.5a7.4 7.4 0 0 1-7.9 7.4 8.7 8.7 0 0 1-3.9-.9L4 20l1.2-3.6a7.1 7.1 0 0 1-1.2-4.9A7.4 7.4 0 0 1 12.1 4 7.4 7.4 0 0 1 20 11.5Z"/>,
    send: <><path d="m21 3-7.2 18-3.4-7.4L3 10.2 21 3Z"/><path d="M10.4 13.6 21 3"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

function Avatar({ mode, name, className = '' }: { mode: IdentityMode; name: string; className?: string }) {
  const colors = { ghost: 'from-violet-400 to-fuchsia-500', section: 'from-cyan-300 to-blue-500', open: 'from-amber-300 to-orange-500' };
  return <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${colors[mode]} font-bold text-slate-950 ${className}`}>{mode === 'ghost' ? '✦' : name.charAt(0).toUpperCase()}</div>;
}

export default function FeedPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryView = searchParams.get('view');
  const [view, setView] = useState<View>('feed');
  const [feedTab, setFeedTab] = useState<FeedTab>('forYou');
  const [identity, setIdentity] = useState<IdentityMode>('ghost');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [composer, setComposer] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [liveStats, setLiveStats] = useState({ registeredStudents: 0, postsToday: 0 });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [messageRecipient, setMessageRecipient] = useState('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [recipientSuggestions, setRecipientSuggestions] = useState<Recipient[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [messageImage, setMessageImage] = useState<File | null>(null);
  const [messageError, setMessageError] = useState('');
  const canSwitchIdentity = Boolean(profile?.is_email_verified);
  const currentIdentity = identityModes.find((mode) => mode.id === identity)!;
  const activeConversation = conversations.find((item) => item.userId === activeChat);

  useEffect(() => { setView('feed'); }, [queryView]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoadingPosts(true);
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const [postResult, profileResult, todayResult] = await Promise.all([
        supabase.from('posts').select('id, content, image_url, display_mode, created_at, upvotes, profiles (real_display_name, pseudo_username, branch, year), comment_count:comments(count)').eq('is_draft', false).order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_draft', false).gte('created_at', start.toISOString()),
      ]);
      if (cancelled) return;
      if (!postResult.error) {
        setPosts(((postResult.data ?? []) as DbPost[]).map((post) => {
          const authorProfile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
          const mode: IdentityMode = post.display_mode === 'full' ? 'open' : post.display_mode === 'partial' ? 'section' : 'ghost';
          const author = mode === 'open' ? authorProfile?.real_display_name || 'Campus member' : mode === 'section' ? `${authorProfile?.branch || 'Student'} · ${authorProfile?.year || 'Current'} year` : 'Anonymous';
          return { id: post.id, author, tag: mode === 'open' ? 'Open profile' : mode === 'section' ? 'Section only' : 'Ghost mode', mode, time: new Date(post.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' }), body: post.content, image_url: post.image_url, likes: post.upvotes ?? 0, comments: post.comment_count?.[0]?.count ?? 0 };
        }));
      }
      setLiveStats({ registeredStudents: profileResult.count ?? 0, postsToday: todayResult.count ?? 0 });
      setLoadingPosts(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [supabase, user]);

  useEffect(() => {
    if (!user || view !== 'messages') return;
    setMessageError('');
    fetch('/api/messages').then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load conversations.');
      setConversations(data.conversations ?? []);
    }).catch((error: Error) => setMessageError(error.message));
  }, [user, view]);

  useEffect(() => {
    if (!activeChat) return;
    fetch(`/api/messages?with=${encodeURIComponent(activeChat)}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load messages.');
      setDirectMessages(data.messages ?? []);
    }).catch((error: Error) => setMessageError(error.message));
  }, [activeChat]);

  useEffect(() => {
    if (!user || view !== 'messages' || messageRecipient.trim().length < 2 || activeChat) {
      setRecipientSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch(`/api/messages?search=${encodeURIComponent(messageRecipient.trim())}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Unable to search profiles.');
          setRecipientSuggestions(data.profiles ?? []);
        })
        .catch(() => setRecipientSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [user, view, messageRecipient, activeChat]);

  const filteredPosts = useMemo(() => posts.filter((post) => !search || `${post.body} ${post.author}`.toLowerCase().includes(search.toLowerCase())), [posts, search]);
  const displayedPosts = useMemo(() => {
    if (feedTab === 'following') return [];
    return feedTab === 'trending' ? [...filteredPosts].sort((a, b) => b.likes - a.likes) : filteredPosts;
  }, [feedTab, filteredPosts]);

  const publish = async () => {
    if (!user || !composer.trim()) return;
    const displayMode = identity === 'open' ? 'full' : identity === 'section' ? 'partial' : 'anonymous';
    let imageUrl: string | null = null;
    if (postImage) {
      const extension = postImage.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from('post-images').upload(path, postImage, { upsert: false, contentType: postImage.type });
      if (upload.error) return;
      imageUrl = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from('posts').insert({ author_id: user.id, room: 'college', content: composer.trim(), image_url: imageUrl, is_anon_post: identity === 'ghost', display_mode: displayMode });
    if (!error) window.location.reload();
  };

  const sendMessage = async () => {
    const recipient = selectedRecipientId || messageRecipient.trim() || activeChat;
    if (!recipient || (!messageBody.trim() && !messageImage)) return;
    setMessageError('');
    let imageUrl: string | null = null;
    if (messageImage) {
      const extension = messageImage.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user?.id}/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from('message-images').upload(path, messageImage, { upsert: false, contentType: messageImage.type });
      if (upload.error) { setMessageError('Unable to upload image. Apply migration 014 first.'); return; }
      imageUrl = supabase.storage.from('message-images').getPublicUrl(path).data.publicUrl;
    }
    const response = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient, body: messageBody.trim(), imageUrl }) });
    const data = await response.json();
    if (!response.ok) { setMessageError(data.error || 'Unable to send message.'); return; }
    setMessageBody(''); setMessageImage(null); setMessageRecipient('');
    setActiveChat(data.message.recipient_id);
    setDirectMessages((items) => [...items, data.message]);
  };

  const identityDot = identity === 'ghost' ? 'bg-violet-400' : identity === 'section' ? 'bg-cyan-300' : 'bg-amber-300';

  return <div className="mx-auto max-w-[1480px] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
    <div className="mb-7 flex items-center justify-between gap-4 lg:hidden"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-300 text-lg font-black text-slate-950">C</div><div><p className="font-display text-lg font-bold tracking-tight text-white">cics</p><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">campus pulse</p></div></div><button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400"><Icon name="bell" size={18}/></button></div>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"><main className="min-w-0">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/> Home</div><h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Home</h1><p className="mt-1.5 text-sm text-slate-500">Your campus conversation, in one timeline.</p></div><div className="relative w-full sm:w-52"><span className="absolute left-3 top-2.5 text-slate-500"><Icon name="search" size={16}/></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search CICS" className="w-full rounded-xl border border-white/10 bg-white/[0.035] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"/></div></div>
      {view === 'feed' && <><div className="sticky top-0 z-10 flex items-center gap-1 border-b border-white/10 bg-[#090b12]/90 p-1 backdrop-blur-xl">{(['forYou', 'following', 'trending'] as FeedTab[]).map((tab) => <button key={tab} onClick={() => setFeedTab(tab)} className={`flex-1 px-4 py-3 text-sm font-bold capitalize ${feedTab === tab ? 'border-b-2 border-cyan-300 text-white' : 'text-slate-500 hover:text-slate-200'} ${tab === 'trending' ? 'hidden sm:block' : ''}`}>{tab === 'forYou' ? 'For you' : tab}</button>)}</div><section className="border-b border-white/10 px-4 py-4 sm:px-5"><div className="flex gap-3"><Avatar mode={identity} name={currentIdentity.label} className="h-11 w-11 text-lg"/><button onClick={() => setShowComposer(true)} className="flex-1 rounded-2xl border border-white/8 bg-black/10 px-4 text-left text-sm text-slate-500 transition hover:border-cyan-300/25 hover:text-slate-300">What&apos;s on your mind?</button></div><div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3"><button onClick={() => setShowIdentity(true)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"><span className={`h-2 w-2 rounded-full ${identityDot}`}/>{currentIdentity.label}</button><button onClick={() => setShowComposer(true)} className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200">Post to campus</button></div></section><div className="space-y-0">{loadingPosts ? <div className="border-b border-white/10 px-5 py-12 text-center text-sm text-slate-500">Loading posts from campus…</div> : displayedPosts.length === 0 ? <div className="border-b border-white/10 px-5 py-12 text-center"><p className="text-sm font-semibold text-slate-300">{feedTab === 'following' ? 'No followed accounts yet' : 'No posts yet'}</p><p className="mt-1 text-xs text-slate-600">{feedTab === 'following' ? 'Following will show posts from people you choose to follow.' : 'Be the first person to start a real campus conversation.'}</p></div> : displayedPosts.map((post) => <article key={post.id} className="group border-b border-white/10 px-4 py-4 transition-colors hover:bg-white/[0.025] sm:px-5"><div className="flex items-start gap-3"><Avatar mode={post.mode} name={post.author} className="h-10 w-10 text-sm"/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-bold text-slate-100">{post.author}</span><span className="text-xs text-slate-600">·</span><span className="text-xs text-slate-500">{post.time}</span></div><p className="mt-0.5 text-xs font-medium text-slate-500">{post.tag}</p><p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-slate-200">{post.body}</p>{post.image_url && <img src={post.image_url} alt="Post attachment" className="mt-3 max-h-80 w-full rounded-2xl object-cover" />}<div className="mt-4 flex items-center gap-1"><span className="px-3 py-2 text-xs text-slate-500">{post.likes} likes</span><button onClick={() => router.push(`/post/${post.id}`)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-cyan-300"><Icon name="comment" size={16}/>{post.comments}</button></div></div></div></article>)}</div></>}
      {view === 'messages' && <section className="grid min-h-[540px] overflow-hidden rounded-3xl border border-white/8 bg-white/[0.025] md:grid-cols-[260px_minmax(0,1fr)]"><div className="border-b border-white/8 p-3 md:border-b-0 md:border-r"><div className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Messages</div><div className="relative"><input value={messageRecipient} onChange={(event) => { setMessageRecipient(event.target.value); setSelectedRecipientId(null); setActiveChat(null); }} placeholder="Search roll no. or profile" className="mb-1 w-full rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600"/>{recipientSuggestions.length > 0 && <div className="absolute left-0 right-0 top-10 z-20 overflow-hidden rounded-xl border border-white/10 bg-[#151a24] shadow-xl">{recipientSuggestions.map((recipient) => { const name = recipient.real_display_name || recipient.pseudo_username || recipient.roll_number || 'Campus member'; return <button key={recipient.id} onClick={() => { setActiveChat(recipient.id); setSelectedRecipientId(recipient.id); setMessageRecipient(''); setRecipientSuggestions([]); }} className="flex w-full items-center gap-2 border-b border-white/5 p-2 text-left last:border-0 hover:bg-white/5"><Avatar mode="section" name={name} className="h-8 w-8 text-[10px]"/><span className="min-w-0"><span className="block truncate text-xs font-semibold text-white">{name}</span><span className="block truncate text-[10px] text-slate-500">{recipient.roll_number || recipient.branch || 'CICS profile'}</span></span></button>; })}</div>}</div>{conversations.length === 0 ? <p className="px-2 py-5 text-xs leading-5 text-slate-600">No conversations yet. Search a profile above to start a real message.</p> : conversations.map((conversation) => { const name = conversation.profile?.real_display_name || conversation.profile?.pseudo_username || conversation.profile?.branch || 'Campus member'; return <button key={conversation.userId} onClick={() => { setActiveChat(conversation.userId); setSelectedRecipientId(conversation.userId); setMessageRecipient(''); }} className={`mb-1 flex w-full items-center gap-2 rounded-2xl p-2 text-left ${activeChat === conversation.userId ? 'bg-white/10' : 'hover:bg-white/5'}`}><Avatar mode="section" name={name} className="h-9 w-9 text-xs"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-200">{name}</p><p className="truncate text-[10px] text-slate-500">{conversation.latest?.body || 'No messages yet'}</p></div></button>; })}</div><div className="flex flex-col"><div className="flex items-center gap-3 border-b border-white/8 bg-[#111521]/90 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">✦</div><div><p className="text-sm font-bold text-white">{activeConversation?.profile?.real_display_name || activeConversation?.profile?.pseudo_username || (activeChat ? 'Conversation' : 'New message')}</p><p className="text-[10px] text-slate-500">Private messages stored in Supabase</p></div></div><div className="messages-wallpaper flex-1 space-y-3 p-5">{messageError && <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{messageError}</p>}{!activeChat ? <p className="py-12 text-center text-sm text-slate-500">Select a conversation or search a profile to start messaging.</p> : directMessages.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No messages in this conversation yet.</p> : directMessages.map((message) => <div key={message.id} className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender_id === user?.id ? 'ml-auto rounded-tr-md bg-cyan-300 text-slate-950' : 'rounded-tl-md bg-white/8 text-slate-300'}`}>{message.image_url && <img src={message.image_url} alt="Attached image" className="mb-2 max-h-64 rounded-xl object-cover" />}{message.body && <span>{message.body}</span>}</div>)}</div><div className="flex gap-2 border-t border-white/8 p-3"><label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-cyan-300" title="Attach image">＋<input type="file" accept="image/*" className="hidden" onChange={(event) => setMessageImage(event.target.files?.[0] ?? null)} /></label><input value={messageBody} onChange={(event) => setMessageBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void sendMessage(); }} placeholder="Write a message..." className="flex-1 rounded-xl bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"/><button onClick={() => void sendMessage()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300 text-slate-950"><Icon name="send" size={17}/></button></div></div></section>}
      {view === 'spaces' && <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-3xl border border-white/8 bg-gradient-to-br from-cyan-400/10 to-transparent p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Communities</p><h2 className="mt-8 font-display text-2xl font-bold text-white">Find your campus spaces</h2><p className="mt-2 text-sm text-slate-500">Open the community directory to see real activity.</p><button onClick={() => router.push('/communities')} className="mt-6 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950">Open communities</button></div></section>}
      {view === 'saved' && <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 text-slate-300"><Icon name="bookmark" size={23}/></div><h2 className="mt-5 font-display text-xl font-bold text-white">Your saved posts</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">Saving posts will be enabled when the saved-posts table is connected. No fake saved items are shown.</p></div>}
    </main><aside className="hidden space-y-4 lg:block"><div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5"><div className="flex items-center justify-between"><h2 className="font-display font-bold text-white">Campus pulse</h2><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Database</span></div><div className="mt-5 space-y-4"><div><div className="mb-2 flex items-center justify-between text-xs"><span className="text-slate-400">Registered students</span><span className="font-bold text-white">{liveStats.registeredStudents.toLocaleString()}</span></div><p className="text-[10px] text-slate-600">Counted from profiles</p></div><div><div className="mb-2 flex items-center justify-between text-xs"><span className="text-slate-400">Posts today</span><span className="font-bold text-white">{liveStats.postsToday.toLocaleString()}</span></div><p className="text-[10px] text-slate-600">Counted since local midnight</p></div></div></div><div className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.05] p-5"><h2 className="font-display font-bold text-white">Identity controls</h2><p className="mt-2 text-xs leading-5 text-slate-400">{canSwitchIdentity ? 'Your MGIT email is verified. You can switch identity modes.' : 'Verify your MGIT email before switching between identity modes.'}</p><button onClick={() => setShowIdentity(true)} className="mt-4 text-xs font-bold text-cyan-300 hover:text-cyan-200">Manage identity →</button></div></aside></div>
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#090b12]/95 px-3 py-2 backdrop-blur-xl lg:hidden"><div className="mx-auto flex max-w-lg items-center justify-around"><button onClick={() => router.push('/feed')} className="flex flex-col items-center gap-1 px-4 py-1.5 text-[10px] font-bold text-slate-500"><Icon name="home" size={19}/>Feed</button><button onClick={() => router.push('/messages')} className="flex flex-col items-center gap-1 px-4 py-1.5 text-[10px] font-bold text-slate-500"><Icon name="chat" size={19}/>Messages</button><button onClick={() => setShowComposer(true)} className="-mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl text-slate-950">+</button><button onClick={() => setView('spaces')} className="flex flex-col items-center gap-1 px-4 py-1.5 text-[10px] font-bold text-slate-500"><Icon name="compass" size={19}/>Spaces</button><button onClick={() => setShowIdentity(true)} className="flex flex-col items-center gap-1 px-4 py-1.5 text-[10px] font-bold text-slate-500"><Avatar mode={identity} name={currentIdentity.label} className="h-5 w-5 rounded-lg text-[9px]"/>Profile</button></div></nav>
    {showComposer && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111521] p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="font-display text-lg font-bold text-white">Share with campus</p><p className="mt-0.5 text-xs text-slate-500">Posting as {currentIdentity.label}</p></div><button onClick={() => setShowComposer(false)} className="text-slate-500 hover:text-white"><Icon name="close" size={19}/></button></div><textarea autoFocus value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Say what you mean..." className="h-36 w-full resize-none rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600"/><div className="mt-3 flex items-center gap-3"><label className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-cyan-300">Add image<input type="file" accept="image/*" className="hidden" onChange={(event) => setPostImage(event.target.files?.[0] ?? null)} /></label>{postImage && <span className="truncate text-xs text-slate-500">{postImage.name}</span>}</div><div className="mt-4 flex items-center justify-between"><button onClick={() => setShowIdentity(true)} className="flex items-center gap-2 text-xs font-semibold text-slate-400"><span className={`h-2 w-2 rounded-full ${identityDot}`}/>{currentIdentity.label}</button><button onClick={() => void publish()} className="rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-black text-slate-950">Publish post</button></div></div></div>}
    {showIdentity && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111521] p-5 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><p className="font-display text-lg font-bold text-white">Choose how you show up</p><p className="mt-1 text-xs leading-5 text-slate-500">Identity switching is available only after email verification.</p></div><button onClick={() => setShowIdentity(false)} className="text-slate-500 hover:text-white"><Icon name="close" size={19}/></button></div>{!canSwitchIdentity && <div className="mb-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100"><strong>Verify your email first.</strong> Verify your MGIT email to unlock the identity switcher. Your current default identity remains available.</div>}<div className="space-y-2">{identityModes.map((mode) => <button key={mode.id} disabled={!canSwitchIdentity} onClick={() => { if (canSwitchIdentity) { setIdentity(mode.id); setShowIdentity(false); } }} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${identity === mode.id ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-white/8 bg-white/[0.025] hover:border-white/20'}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${mode.id === 'ghost' ? 'bg-violet-400/15 text-violet-200' : mode.id === 'section' ? 'bg-cyan-300/15 text-cyan-200' : 'bg-amber-300/15 text-amber-200'}`}>{mode.icon}</span><span className="flex-1"><span className="block text-sm font-bold text-white">{mode.label}</span><span className="mt-0.5 block text-xs text-slate-500">{mode.detail}</span></span>{identity === mode.id && <span className="text-cyan-300">✓</span>}</button>)}</div></div></div>}
  </div>;
}
