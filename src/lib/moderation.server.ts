import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { isAllowlistedModerator } from '@/lib/moderatorConfig.server';

export async function getAuthorizedModerator() {
  const sessionClient = await createServerSupabaseClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return { user: null, profile: null, moderator: null, admin: null };

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, roll_number, email, college_email, real_display_name')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;

  const moderator = profile ? isAllowlistedModerator(profile) : null;
  if (!moderator) return { user, profile, moderator: null, admin };

  // Keep the database in sync with the complete dedicated allowlist. The API
  // is the only place that can perform this sync because this module is server-only.
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, roll_number, email, college_email');
  if (profilesError) throw profilesError;

  const matchedProfiles = (profiles ?? []).filter((candidate) => isAllowlistedModerator(candidate));
  const matchedIds = matchedProfiles.map((candidate) => candidate.id);
  // The flag is additive; allowlisted access still works if migration 012 has
  // not been applied yet, while the database flag is synced once it exists.
  await admin.from('profiles').update({ is_moderator: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (matchedIds.length > 0) {
    await admin.from('profiles').update({ is_moderator: true }).in('id', matchedIds);
  }
  for (const matchedId of matchedIds) {
    await admin.from('admins').upsert({ user_id: matchedId }, { onConflict: 'user_id' });
  }
  const { data: existingAdmins } = await admin.from('admins').select('user_id');
  for (const existingAdmin of existingAdmins ?? []) {
    if (!matchedIds.includes(existingAdmin.user_id)) {
      await admin.from('admins').delete().eq('user_id', existingAdmin.user_id);
    }
  }

  return { user, profile, moderator, admin };
}

export async function requireModerator() {
  const result = await getAuthorizedModerator();
  if (!result.user || !result.moderator || !result.admin) {
    throw new Error('MODERATOR_REQUIRED');
  }
  return result as typeof result & { user: NonNullable<typeof result.user>; moderator: NonNullable<typeof result.moderator>; admin: NonNullable<typeof result.admin> };
}
