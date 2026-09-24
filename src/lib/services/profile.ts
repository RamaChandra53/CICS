import type { Profile } from '@/types';
import { ensureUniquePseudoUsername } from '@/lib/usernameGenerator';
import type { SupabaseClientLike } from './supabase-types';

export const PROFILE_SELECT =
  'id, username, full_name, roll_number, year, branch, section, is_first_login, is_verified, is_anonymous, id_card_url, email, college_email, is_email_verified, real_display_name, pseudo_username, pending_pseudo_username, pseudo_username_status, pseudo_username_requested_at, pseudo_username_rejection_reason, pseudo_username_last_changed_at, show_roll_number_publicly, bio, default_identity';

const LEGACY_PROFILE_SELECT =
  'id, username, full_name, roll_number, year, branch, section, is_first_login, is_verified, is_anonymous, id_card_url, email, college_email, is_email_verified, real_display_name, pseudo_username, pending_pseudo_username, pseudo_username_status, pseudo_username_requested_at, pseudo_username_rejection_reason, pseudo_username_last_changed_at, show_roll_number_publicly';

function withProfileDefaults(profile: Profile): Profile {
  return {
    ...profile,
    bio: profile.bio ?? null,
    default_identity: profile.default_identity === 'full' ? 'full' : 'pseudo',
  };
}

export function isAuthLockError(value: unknown): boolean {
  if (!value) return false;
  const message = value instanceof Error ? value.message : String((value as { message?: unknown }).message ?? value);
  return message.includes('lock:') || message.includes('NavigatorLockAcquireTimeoutError');
}

export function isTimeoutError(value: unknown): boolean {
  if (!value) return false;
  const error = value as { name?: unknown; message?: unknown };
  const message = value instanceof Error ? value.message : String(error.message ?? value);
  return error.name === 'TimeoutError' || message.toLowerCase().includes('timed out');
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      const timeoutError = new Error(message);
      timeoutError.name = 'TimeoutError';
      reject(timeoutError);
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
  }
}

export async function backfillPseudoUsername(
  supabase: SupabaseClientLike,
  profile: Profile
): Promise<Profile> {
  if (profile.pseudo_username) {
    return profile;
  }

  try {
    const pseudoUsername = await ensureUniquePseudoUsername(supabase as Parameters<typeof ensureUniquePseudoUsername>[0]);
    const { error } = await supabase
      .from('profiles')
      .update({
        pseudo_username: pseudoUsername,
        pseudo_username_status: 'approved',
      })
      .eq('id', profile.id);

    if (error) {
      console.error('Failed to backfill pseudo_username:', error);
      return profile;
    }

    return {
      ...profile,
      pseudo_username: pseudoUsername,
      pseudo_username_status: 'approved',
    };
  } catch (err) {
    console.error('Error during pseudo_username backfill:', err);
    return profile;
  }
}

export async function fetchProfileById(supabase: SupabaseClientLike, userId: string): Promise<Profile | null> {
  let profileResult:
    | { data: Profile | null; error: { message?: string } | null }
    | null = null;

  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      profileResult = await withTimeout<{
        data: Profile | null;
        error: { message?: string } | null;
      }>(
        supabase
          .from('profiles')
          .select(LEGACY_PROFILE_SELECT)
          .eq('id', userId)
          .single() as unknown as Promise<{ data: Profile | null; error: { message?: string } | null }>,
        8000,
        'Profile request timed out'
      );
      break;
    } catch (fetchError) {
      if (!isAuthLockError(fetchError) && attempt === maxAttempts - 1) {
        throw fetchError;
      }
      if (attempt < maxAttempts - 1) {
        await delay(400 * (attempt + 1));
      }
    }
  }

  if (!profileResult) {
    throw new Error('Profile request failed');
  }

  let { data } = profileResult;
  const { error } = profileResult;
  if (error) throw error;
  if (!data) return null;

  // These fields are introduced by migration 013. Keep them out of the
  // blocking auth query so deployments on the previous schema still load.
  try {
    const enhancements = await withTimeout<{
      data: Pick<Profile, 'bio' | 'default_identity'> | null;
      error: { code?: string; message?: string } | null;
    }>(
      supabase
        .from('profiles')
        .select('bio, default_identity')
        .eq('id', userId)
        .single() as unknown as Promise<{
          data: Pick<Profile, 'bio' | 'default_identity'> | null;
          error: { code?: string; message?: string } | null;
        }>,
      2000,
      'Profile enhancement request timed out'
    );

    if (!enhancements.error && enhancements.data) {
      data = { ...data, ...enhancements.data };
    }
  } catch (enhancementError) {
    if (!isTimeoutError(enhancementError)) {
      console.warn('Optional profile fields are unavailable:', enhancementError);
    }
  }

  return backfillPseudoUsername(supabase, withProfileDefaults(data));
}
