import 'server-only';

/**
 * Single source of truth for moderator access.
 * Add/remove entries here, then call /api/moderation/me once while signed in
 * to synchronize the admins table and moderator flags.
 */
export const MODERATOR_ALLOWLIST = [
  {
    rollNumber: '25261A3238',
    email: 'nkhan_csb253238@mgit.ac.in',
    label: 'Founding moderator',
  },
  {
    rollNumber: '25261A3263',
    email: 'vramachandra_csb253263@mgit.ac.in',
    label: 'Founding moderator',
  },
] as const;

export function normalizeModeratorValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function isAllowlistedModerator(profile: {
  roll_number?: string | null;
  email?: string | null;
  college_email?: string | null;
}) {
  const rollNumber = normalizeModeratorValue(profile.roll_number);
  const emails = [profile.email, profile.college_email].map(normalizeModeratorValue);
  return MODERATOR_ALLOWLIST.find((moderator) =>
    moderator.rollNumber.toLowerCase() === rollNumber && emails.includes(moderator.email.toLowerCase())
  ) ?? null;
}
