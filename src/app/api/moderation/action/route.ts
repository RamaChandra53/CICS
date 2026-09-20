import { NextResponse } from 'next/server';
import { requireModerator } from '@/lib/moderation.server';

const ACTIONS = new Set(['warn', 'remove_post', 'remove_comment', 'mute', 'kick', 'ban', 'unban']);

export async function POST(request: Request) {
  try {
    const { user, admin } = await requireModerator();
    const body = await request.json() as {
      action?: string;
      targetUserId?: string;
      postId?: string;
      commentId?: string;
      reportId?: string;
      reason?: string;
      durationHours?: number | null;
      metadata?: Record<string, unknown>;
    };

    if (!body.action || !ACTIONS.has(body.action)) {
      return NextResponse.json({ error: 'Unsupported moderation action.' }, { status: 400 });
    }
    if (body.targetUserId === user.id) {
      return NextResponse.json({ error: 'You cannot moderate your own account.' }, { status: 400 });
    }
    if (!body.reason?.trim()) {
      return NextResponse.json({ error: 'A moderation reason is required.' }, { status: 400 });
    }
    if (['mute', 'kick', 'ban', 'unban'].includes(body.action) && !body.targetUserId) {
      return NextResponse.json({ error: 'A target user is required for this action.' }, { status: 400 });
    }

    const action = body.action;
    if (action === 'remove_post' && body.postId) {
      const { error } = await admin.from('posts').delete().eq('id', body.postId);
      if (error) throw error;
    }
    if (action === 'remove_comment' && body.commentId) {
      const { error } = await admin.from('comments').delete().eq('id', body.commentId);
      if (error) throw error;
    }

    if (['mute', 'ban'].includes(action) && body.targetUserId) {
      const hours = body.durationHours === null ? null : Math.max(1, Math.min(body.durationHours ?? 24, 24 * 365));
      const { error } = await admin.from('moderation_suspensions').upsert({
        user_id: body.targetUserId,
        kind: action,
        reason: body.reason.trim(),
        ends_at: hours === null ? null : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
        revoked_at: null,
        created_by: user.id,
      }, { onConflict: 'user_id' });
      if (error) throw error;
    }
    if (action === 'unban' && body.targetUserId) {
      const { error } = await admin.from('moderation_suspensions').update({ revoked_at: new Date().toISOString() }).eq('user_id', body.targetUserId);
      if (error) throw error;
    }
    if (action === 'kick' && body.targetUserId) {
      // Kick immediately revokes all sessions. A future login is still allowed.
      const { error } = await admin.auth.admin.signOut(body.targetUserId, 'global');
      if (error) throw error;
    }

    const { error: auditError } = await admin.from('moderation_actions').insert({
      moderator_id: user.id,
      target_user_id: body.targetUserId ?? null,
      post_id: body.postId ?? null,
      comment_id: body.commentId ?? null,
      action,
      reason: body.reason.trim(),
      metadata: { ...(body.metadata ?? {}), reportId: body.reportId ?? null },
    });
    if (auditError) throw auditError;

    if (body.reportId) {
      await admin.from('reports').update({
        status: action === 'warn' ? 'reviewed' : 'actioned',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: body.reason.trim(),
      }).eq('id', body.reportId);
    }

    return NextResponse.json({ ok: true, action });
  } catch (error) {
    if (error instanceof Error && error.message === 'MODERATOR_REQUIRED') {
      return NextResponse.json({ error: 'Moderator access required.' }, { status: 403 });
    }
    console.error('Moderation action error:', error);
    return NextResponse.json({ error: 'Moderation action failed.' }, { status: 500 });
  }
}
