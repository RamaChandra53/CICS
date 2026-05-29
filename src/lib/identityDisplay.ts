/**
 * Identity Display Utility
 *
 * Centralised logic for how users appear across the app.
 * All components should use this instead of inline display logic.
 *
 * RULE: Roll numbers are NEVER shown publicly.
 */

import { Profile } from '@/types';

// ── Types ───────────────────────────────────────────────────

export type IdentityMode = 'pseudo' | 'full' | 'partial' | 'anonymous';

export interface IdentityDisplay {
  displayName: string;
  avatar: string;
  avatarBg: string;
  showVerified: boolean;
}

export interface IdentityModeAccess {
  available: boolean;
  requiresVerification: boolean;
}

// ── Community Default Modes ─────────────────────────────────

const COMMUNITY_DEFAULTS: Record<string, IdentityMode> = {
  general: 'pseudo',
  campus: 'pseudo',
  college: 'pseudo',
  random: 'pseudo',
  clubs: 'pseudo',
  confessions: 'anonymous',
  rants: 'anonymous',
  placements: 'partial',
  academic: 'partial',
  exams: 'partial',
  notes: 'partial',
};

/**
 * Returns the default identity mode for a community.
 */
export function getCommunityDefaultMode(communitySlug: string): IdentityMode {
  return COMMUNITY_DEFAULTS[communitySlug] ?? 'pseudo';
}

/**
 * Returns the effective default mode for a user in a community.
 * If the community default requires verification and the user is unverified,
 * falls back to 'pseudo' instead of blocking.
 */
export function getEffectiveDefaultMode(
  communitySlug: string,
  profile: Pick<Profile, 'is_email_verified' | 'is_verified'> | null
): IdentityMode {
  const communityDefault = getCommunityDefaultMode(communitySlug);

  if (communityDefault === 'anonymous' || communityDefault === 'partial') {
    const isVerified = profile?.is_email_verified || profile?.is_verified;
    if (!isVerified) {
      return 'pseudo';
    }
  }

  return communityDefault;
}

// ── Identity Mode Access ────────────────────────────────────

/**
 * Returns which identity modes are available to a user.
 */
export function getIdentityModeAccess(
  profile: Pick<Profile, 'is_email_verified' | 'is_verified'> | null
): Record<IdentityMode, IdentityModeAccess> {
  const isVerified = profile?.is_email_verified || profile?.is_verified || false;

  return {
    pseudo: { available: true, requiresVerification: false },
    full: { available: true, requiresVerification: false },
    partial: { available: isVerified, requiresVerification: true },
    anonymous: { available: isVerified, requiresVerification: true },
  };
}

// ── Identity Display ────────────────────────────────────────

/**
 * Returns the display info for a post/comment author.
 *
 * @param profile - The author's profile (from the `profiles` join)
 * @param displayMode - The display_mode stored on the post/comment
 */
export function getPostIdentityDisplay(
  profile: Partial<Profile> | null | undefined,
  displayMode: string | null | undefined,
  isAnonymous?: boolean
): IdentityDisplay {
  const mode = normalizeDisplayMode(displayMode, isAnonymous);

  switch (mode) {
    case 'anonymous':
      return {
        displayName: 'Anonymous',
        avatar: '👻',
        avatarBg: 'bg-gray-700 text-gray-400',
        showVerified: false,
      };

    case 'partial': {
      const branch = profile?.branch || '';
      const year = profile?.year || '';
      const isVerified = profile?.is_email_verified || profile?.is_verified || false;

      let name = '';
      if (branch && year) {
        name = `${branch} · ${year} Year`;
      } else if (branch) {
        name = branch;
      } else if (year) {
        name = `${year} Year`;
      } else {
        name = 'Verified Student';
      }

      return {
        displayName: name,
        avatar: branch?.[0]?.toUpperCase() || '✓',
        avatarBg: 'bg-purple-600/30 text-purple-400',
        showVerified: isVerified,
      };
    }

    case 'full': {
      // NEVER show roll_number. Use cascading fallback.
      const fullName =
        profile?.real_display_name ||
        profile?.full_name ||
        profile?.username ||
        profile?.pseudo_username ||
        'Campus Member';

      const isVerified = profile?.is_email_verified || profile?.is_verified || false;

      return {
        displayName: fullName,
        avatar: fullName[0]?.toUpperCase() || '?',
        avatarBg: 'bg-indigo-600/30 text-indigo-400',
        showVerified: isVerified,
      };
    }

    case 'pseudo':
    default: {
      const pseudoName = profile?.pseudo_username || 'CampusUser';

      return {
        displayName: pseudoName,
        avatar: pseudoName[0]?.toUpperCase() || '?',
        avatarBg: 'bg-emerald-600/30 text-emerald-400',
        showVerified: false,
      };
    }
  }
}

// ── Mode Labels for UI ──────────────────────────────────────

/**
 * Returns a user-friendly label for an identity mode in the selector UI.
 */
export function getIdentityModeLabel(
  mode: IdentityMode,
  profile: Partial<Profile> | null
): string {
  switch (mode) {
    case 'pseudo':
      return profile?.pseudo_username || 'Campus Nickname';
    case 'anonymous':
      return '👻 Anonymous';
    case 'partial': {
      const branch = profile?.branch || '';
      const year = profile?.year || '';
      if (branch && year) return `${branch} · ${year} Year`;
      if (branch) return branch;
      if (year) return `${year} Year`;
      return 'Branch · Year';
    }
    case 'full': {
      const name =
        profile?.real_display_name ||
        profile?.full_name ||
        profile?.username ||
        profile?.pseudo_username ||
        'Profile Identity';
      return name;
    }
    default:
      return 'Unknown';
  }
}

/**
 * Returns the helper text shown below the identity mode selector.
 */
export function getIdentityModeHelper(mode: IdentityMode): string {
  switch (mode) {
    case 'pseudo':
      return 'People can recognize you without knowing who you are.';
    case 'anonymous':
      return 'Completely hides your public identity.';
    case 'partial':
      return 'Shows only your branch and year.';
    case 'full':
      return 'Shows your profile identity.';
    default:
      return '';
  }
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Normalizes a display_mode value. Handles legacy posts that only have
 * 'full' | 'partial' | 'anonymous' and adds support for 'pseudo'.
 * Also handles cases where is_anon_post is set but display_mode isn't.
 */
function normalizeDisplayMode(
  displayMode: string | null | undefined,
  isAnonymous?: boolean
): IdentityMode {
  if (displayMode === 'pseudo') return 'pseudo';
  if (displayMode === 'anonymous') return 'anonymous';
  if (displayMode === 'partial') return 'partial';
  if (displayMode === 'full') return 'full';

  // Legacy fallback: if no display_mode, honor the explicit anonymous flag
  if (isAnonymous) return 'anonymous';

  return 'pseudo';
}
