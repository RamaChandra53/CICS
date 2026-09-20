import { NextResponse } from 'next/server';
import { getAuthorizedModerator } from '@/lib/moderation.server';

export async function GET() {
  try {
    const result = await getAuthorizedModerator();
    return NextResponse.json({
      isModerator: Boolean(result.moderator),
      label: result.moderator?.label ?? null,
      displayName: result.profile?.real_display_name ?? null,
    });
  } catch (error) {
    console.error('Moderator status error:', error);
    return NextResponse.json({ isModerator: false }, { status: 500 });
  }
}
