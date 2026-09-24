import { ROOMS, type Community, type Profile } from '@/types';
import { normalizeCommunityRows, type CommunitySummary } from '@/types/domain';
import type { SupabaseClientLike } from './supabase-types';

export const OFFICIAL_CLUBS: CommunitySummary[] = [
  {
    id: 'persona-club-tech',
    name: 'Persona Club',
    slug: 'persona-club-tech',
    description: 'Tech club for builders, coding, and technical exploration',
    icon: '💻',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'nova-club',
    name: 'Nova Club',
    slug: 'nova-club',
    description: 'Open club space for student-led activities and events',
    icon: '✨',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'idea-incubator-club',
    name: 'Idea Incubator Club',
    slug: 'idea-incubator-club',
    description: 'Business, entrepreneurship, and startup ideas',
    icon: '💡',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'literary-club',
    name: 'Literary Club',
    slug: 'literary-club',
    description: 'Writing, reading, debate, and campus expression',
    icon: '📚',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'photography-club',
    name: 'Photography Club',
    slug: 'photography-club',
    description: 'Photography, editing, and visual storytelling',
    icon: '📷',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'spotlight-club-film',
    name: 'Spotlight Club',
    slug: 'spotlight-club-film',
    description: 'Film, cinema, and visual media',
    icon: '🎬',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'beat-cruisers',
    name: 'Beat Cruisers',
    slug: 'beat-cruisers',
    description: 'Dance club group',
    icon: '🕺',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'nithya-dance',
    name: 'Nithya',
    slug: 'nithya-dance',
    description: 'Dance club group',
    icon: '💃',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'symphony-club-music',
    name: 'Symphony Club',
    slug: 'symphony-club-music',
    description: 'Music, singing, instruments, and performances',
    icon: '🎵',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'yoga-spirituality-club',
    name: 'Yoga & Spirituality Club',
    slug: 'yoga-spirituality-club',
    description: 'Yoga, mindfulness, and spiritual wellbeing',
    icon: '🧘',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'adobe-design-club',
    name: 'Adobe Design Club',
    slug: 'adobe-design-club',
    description: 'Design, creative tools, and digital art',
    icon: '🎨',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'sports-club',
    name: 'Sports Club',
    slug: 'sports-club',
    description: 'Sports, matches, and fitness events',
    icon: '🏆',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'uhv-club',
    name: 'UHV Club',
    slug: 'uhv-club',
    description: 'Universal Human Values discussions and activities',
    icon: '🤝',
    type: 'club',
    member_count: 0,
    created_at: new Date().toISOString(),
  },
];

const OFFICIAL_CLUB_SLUGS = new Set(OFFICIAL_CLUBS.map((club) => club.slug));
const CACHE_TTL_MS = 45_000;

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

let communitiesCache: CacheEntry<CommunitySummary[]> | null = null;
let clubsCache: CacheEntry<CommunitySummary[]> | null = null;
const userCommunitiesCache = new Map<string, CacheEntry<CommunitySummary[]>>();

function readCache<T>(entry: CacheEntry<T> | null | undefined): T | null {
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.data;
}

function writeCache<T>(data: T): CacheEntry<T> {
  return {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export function clearCommunityCaches(userId?: string) {
  communitiesCache = null;
  clubsCache = null;
  if (userId) {
    userCommunitiesCache.delete(userId);
  } else {
    userCommunitiesCache.clear();
  }
}

export function fallbackCommunities(): CommunitySummary[] {
  return ROOMS.map((room) => ({
    id: room.id,
    name: room.label,
    slug: room.id,
    description: room.description,
    icon: room.icon,
    type: 'open',
    member_count: 0,
    created_at: new Date().toISOString(),
  }));
}

export function isClubCommunity(community: Pick<CommunitySummary, 'slug' | 'type'>): boolean {
  return community.type === 'club' || OFFICIAL_CLUB_SLUGS.has(community.slug);
}

export function getCommunityLabel(slug: string | null | undefined, communities: CommunitySummary[] = fallbackCommunities()): string {
  if (!slug) return 'general';
  const knownCommunities = [...communities, ...OFFICIAL_CLUBS];
  return knownCommunities.find((community) => community.slug === slug || community.id === slug)?.name ?? slug;
}

function compactNumber(value: string | null | undefined): string | null {
  const match = value?.match(/\d+/);
  return match?.[0] ?? null;
}

function communityAcronym(value: string): string {
  return value
    .replace(/&/g, ' and ')
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word && word.toLowerCase() !== 'and')
    .map((word) => word[0])
    .join('')
    .toLowerCase();
}

/** Returns a compact, user-facing label without changing community identity or routing. */
export function formatCommunityChipLabel(
  community: Pick<CommunitySummary, 'id' | 'slug' | 'name'>,
  profile: Pick<Profile, 'branch' | 'year' | 'section'> | null
): string {
  const slug = community.slug.toLowerCase();
  const branch = profile?.branch?.trim().toUpperCase() || null;
  const year = compactNumber(profile?.year);
  const section = profile?.section?.trim() || null;
  const branchSlug = branch?.toLowerCase();
  const communityAcronyms = [community.name, community.slug, community.id]
    .map(communityAcronym)
    .filter(Boolean);

  if (slug === 'all' || community.id === 'all') return 'All';

  const isYearCommunity = year && (slug === `year-${year}` || slug === `year${year}`);
  if (isYearCommunity) return `Year ${year}`;

  const isSectionCommunity = branch && section && (
    slug === `${branchSlug}-${section}` ||
    slug === `${branchSlug}-section-${section}` ||
    slug.endsWith(`-${branchSlug}-${section}`)
  );
  if (isSectionCommunity) return `${branch} Section ${section}`;

  const isBranchCommunity = branch && branchSlug && (
    slug === branchSlug ||
    slug.endsWith(`-${branchSlug}`) ||
    slug.includes(`-${branchSlug}-`) ||
    communityAcronyms.some((acronym) => acronym.includes(branchSlug))
  );
  if (isBranchCommunity) return branch;

  return community.name;
}

export async function fetchCommunities(supabase: SupabaseClientLike): Promise<CommunitySummary[]> {
  const cached = readCache(communitiesCache);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('communities')
    .select('id, name, slug, description, icon, type, member_count, created_at')
    .order('member_count', { ascending: false });

  const communities = data as unknown as Community[] | null;

  if (error || !communities || communities.length === 0) {
    const fallback = fallbackCommunities();
    communitiesCache = writeCache(fallback);
    return fallback;
  }

  const normalized = normalizeCommunityRows(communities);
  communitiesCache = writeCache(normalized);
  return normalized;
}

export async function fetchClubs(supabase: SupabaseClientLike): Promise<CommunitySummary[]> {
  const cached = readCache(clubsCache);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('communities')
    .select('id, name, slug, description, icon, type, member_count, created_at')
    .eq('type', 'club')
    .order('name', { ascending: true });

  const clubs = data as unknown as Community[] | null;

  if (error || !clubs || clubs.length === 0) {
    clubsCache = writeCache(OFFICIAL_CLUBS);
    return OFFICIAL_CLUBS;
  }

  const normalized = normalizeCommunityRows(clubs);
  clubsCache = writeCache(normalized);
  return normalized;
}

export async function fetchUserCommunities(
  supabase: SupabaseClientLike,
  userId: string
): Promise<CommunitySummary[]> {
  const cached = readCache(userCommunitiesCache.get(userId));
  if (cached) return cached;

  const { data, error } = await supabase
    .from('community_members')
    .select(`
      communities (
        id,
        name,
        slug,
        description,
        icon,
        type,
        member_count,
        created_at
      )
    `)
    .eq('user_id', userId);

  if (error || !data) {
    const fallback = fallbackCommunities();
    userCommunitiesCache.set(userId, writeCache(fallback));
    return fallback;
  }

  const rows = data as unknown as Array<{ communities: Community | Community[] | null }>;
  const communities = rows.flatMap((row) => {
    if (!row.communities) return [];
    return Array.isArray(row.communities) ? row.communities : [row.communities];
  });

  const normalized = normalizeCommunityRows(communities);
  userCommunitiesCache.set(userId, writeCache(normalized));
  return normalized;
}
