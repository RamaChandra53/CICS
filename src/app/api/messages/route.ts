import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const search = request.nextUrl.searchParams.get('search')?.trim();
  if (search) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, roll_number, pseudo_username, real_display_name, branch, year')
      .neq('id', user.id)
      .or(`roll_number.ilike.%${search}%,pseudo_username.ilike.%${search}%,real_display_name.ilike.%${search}%`)
      .limit(8);
    if (error) return NextResponse.json({ error: 'Unable to search profiles.' }, { status: 503 });
    return NextResponse.json({ profiles: data ?? [] });
  }
  const otherUserId = request.nextUrl.searchParams.get('with');
  const base = admin.from('direct_messages').select('id, sender_id, recipient_id, body, image_url, created_at, read_at');
  const [sent, received] = await Promise.all([
    otherUserId
      ? base.eq('sender_id', user.id).eq('recipient_id', otherUserId).order('created_at', { ascending: true })
      : base.eq('sender_id', user.id).order('created_at', { ascending: false }).limit(100),
    otherUserId
      ? admin.from('direct_messages').select('id, sender_id, recipient_id, body, image_url, created_at, read_at').eq('sender_id', otherUserId).eq('recipient_id', user.id).order('created_at', { ascending: true })
      : admin.from('direct_messages').select('id, sender_id, recipient_id, body, image_url, created_at, read_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100),
  ]);
  if (sent.error || received.error) {
    const fallbackBase = admin.from('direct_messages').select('id, sender_id, recipient_id, body, created_at, read_at');
    const [fallbackSent, fallbackReceived] = await Promise.all([
      otherUserId ? fallbackBase.eq('sender_id', user.id).eq('recipient_id', otherUserId).order('created_at', { ascending: true }) : fallbackBase.eq('sender_id', user.id).order('created_at', { ascending: false }).limit(100),
      otherUserId ? admin.from('direct_messages').select('id, sender_id, recipient_id, body, created_at, read_at').eq('sender_id', otherUserId).eq('recipient_id', user.id).order('created_at', { ascending: true }) : admin.from('direct_messages').select('id, sender_id, recipient_id, body, created_at, read_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100),
    ]);
    if (fallbackSent.error || fallbackReceived.error) return NextResponse.json({ error: 'Unable to load messages. Apply migration 013 first.' }, { status: 503 });
    const fallbackMessages = [...(fallbackSent.data ?? []), ...(fallbackReceived.data ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((message) => ({ ...message, image_url: null }));
    return otherUserId ? NextResponse.json({ messages: fallbackMessages }) : NextResponse.json({ conversations: [] });
  }

  const messages = [...(sent.data ?? []), ...(received.data ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (otherUserId) {
    await admin.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('sender_id', otherUserId).eq('recipient_id', user.id).is('read_at', null);
    return NextResponse.json({ messages });
  }

  const participantIds = [...new Set(messages.map((message) => message.sender_id === user.id ? message.recipient_id : message.sender_id))];
  const { data: profiles } = participantIds.length
    ? await admin.from('profiles').select('id, pseudo_username, real_display_name, branch, year').in('id', participantIds)
    : { data: [] };
  const summaries = participantIds.map((id) => {
    const latest = messages.find((message) => message.sender_id === id || message.recipient_id === id);
    const profile = (profiles ?? []).find((item) => item.id === id);
    return { userId: id, profile, latest };
  });
  return NextResponse.json({ conversations: summaries });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { recipient?: string; body?: string; imageUrl?: string | null } | null;
  const recipientKey = body?.recipient?.trim();
  const messageBody = body?.body?.trim();
  if (!recipientKey || (!messageBody && !body?.imageUrl)) return NextResponse.json({ error: 'Recipient and message or image are required.' }, { status: 400 });

  const admin = createAdminClient();
  let recipient: { id: string } | null = null;
  for (const field of ['id', 'roll_number', 'pseudo_username'] as const) {
    if (field === 'id' && !/^[0-9a-f-]{36}$/i.test(recipientKey)) continue;
    const { data } = await admin.from('profiles').select('id').eq(field, recipientKey).maybeSingle();
    if (data) { recipient = data; break; }
  }
  if (!recipient && recipientKey.includes('@')) {
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const matchedUser = users.users.find((candidate) => candidate.email?.toLowerCase() === recipientKey.toLowerCase());
    if (matchedUser) recipient = { id: matchedUser.id };
  }
  if (!recipient || recipient.id === user.id) return NextResponse.json({ error: 'Recipient not found.' }, { status: 404 });

  const { data, error } = await admin.from('direct_messages').insert({ sender_id: user.id, recipient_id: recipient.id, body: messageBody || '', image_url: body?.imageUrl || null }).select('id, sender_id, recipient_id, body, image_url, created_at, read_at').single();
  if (error) {
    const fallback = await admin.from('direct_messages').insert({ sender_id: user.id, recipient_id: recipient.id, body: messageBody || '' }).select('id, sender_id, recipient_id, body, created_at, read_at').single();
    if (fallback.error) return NextResponse.json({ error: 'Unable to send message. Apply migration 013 first.' }, { status: 503 });
    return NextResponse.json({ message: { ...fallback.data, image_url: null } }, { status: 201 });
  }
  return NextResponse.json({ message: data }, { status: 201 });
}
