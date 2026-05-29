/**
 * Pseudo Username Generator
 *
 * Generates PascalCase Adjective+Noun usernames that are:
 * - readable, memorable, and socially safe
 * - NOT based on roll numbers, real names, or any identifiable info
 * - validated against profanity/slurs/impersonation
 */

// ── Word Lists ──────────────────────────────────────────────

const ADJECTIVES = [
  'Silent', 'Lunar', 'Crimson', 'Echo', 'Ghost', 'Midnight', 'Static', 'Cosmic',
  'Neon', 'Frozen', 'Swift', 'Amber', 'Shadow', 'Crystal', 'Velvet', 'Iron',
  'Bright', 'Dusk', 'Coral', 'Storm', 'Nova', 'Sage', 'Arctic', 'Ember',
  'Misty', 'Solar', 'Rustic', 'Cobalt', 'Ashen', 'Vivid', 'Hollow', 'Onyx',
  'Golden', 'Silver', 'Copper', 'Scarlet', 'Azure', 'Ivory', 'Rogue', 'Faded',
  'Gentle', 'Fierce', 'Calm', 'Wild', 'Noble', 'Brave', 'Rapid', 'Quiet',
  'Warm', 'Cool', 'Stark', 'Woven', 'Hidden', 'Lucid', 'Mellow', 'Bold',
  'Rusted', 'Dusky', 'Frosty', 'Smoky', 'Hazy', 'Dreamy', 'Cloudy', 'Windy',
  'Snowy', 'Rainy', 'Sunny', 'Mossy', 'Sandy', 'Rocky', 'Dusty', 'Foggy',
  'Starry', 'Lunar', 'Fiery', 'Icy', 'Tiny', 'Grand', 'Keen', 'Odd',
];

const NOUNS = [
  'Volt', 'Byte', 'Fox', 'Circuit', 'Pixel', 'Orbit', 'Leaf', 'Spark',
  'Wave', 'Cipher', 'Falcon', 'Drift', 'Prism', 'Raven', 'Flame', 'Comet',
  'Reed', 'Lynx', 'Surge', 'Glider', 'Flint', 'Crest', 'Bloom', 'Wisp',
  'Arrow', 'Pulse', 'Ridge', 'Pearl', 'Moss', 'Quartz', 'Blaze', 'Shard',
  'Stone', 'Brook', 'Crane', 'Robin', 'Finch', 'Otter', 'Hawk', 'Heron',
  'Cedar', 'Maple', 'Birch', 'Aspen', 'Fern', 'Dune', 'Cliff', 'Cove',
  'Reef', 'Tide', 'Shore', 'Gale', 'Frost', 'Cloud', 'Mist', 'Rain',
  'Snow', 'Star', 'Moon', 'Sun', 'Echo', 'Shade', 'Glow', 'Haze',
  'Ember', 'Ash', 'Dust', 'Smoke', 'Vine', 'Thorn', 'Root', 'Seed',
  'Peak', 'Vale', 'Glen', 'Knoll', 'Dell', 'Ford', 'Creek', 'Pond',
];

// ── Blocklists ──────────────────────────────────────────────

const PROFANITY_PATTERNS = [
  // Slurs, vulgar terms, offensive content
  /f[u\*][c\*]k/i, /sh[i\*]t/i, /b[i\*]tch/i, /a[s\*]{2}/i,
  /d[i\*]ck/i, /p[u\*]ssy/i, /n[i\*]gg/i, /f[a\*]g/i,
  /wh[o\*]re/i, /sl[u\*]t/i, /c[u\*]nt/i, /damn/i,
  /retard/i, /crap/i, /piss/i, /cock/i,
  // Political / religious
  /hindu/i, /muslim/i, /christian/i, /sikh/i, /buddha/i,
  /modi/i, /gandhi/i, /nehru/i, /bjp/i, /congress/i,
  // Caste / community
  /brahmin/i, /dalit/i, /kshatriya/i, /shudra/i, /obc/i,
  // Faculty / admin impersonation
  /admin/i, /moderator/i, /principal/i, /director/i,
  /professor/i, /faculty/i, /dean/i, /hod/i,
  /mgit/i, /official/i, /staff/i, /warden/i,
];

// Roll number pattern (MGIT format: 2 digits + 3 letters + 1 letter + 4 digits)
const ROLL_NUMBER_PATTERN = /^\d{2}[A-Z]{3}[A-Z]\d{4}$/i;
// Phone number pattern
const PHONE_PATTERN = /\d{10}/;

// ── Generator ───────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a PascalCase pseudo username: Adjective + Noun
 */
export function generatePseudoUsername(): string {
  return randomItem(ADJECTIVES) + randomItem(NOUNS);
}

/**
 * Validate a pseudo username.
 * Returns null if valid, or an error string if invalid.
 */
export function validatePseudoUsername(username: string): string | null {
  if (!username || typeof username !== 'string') {
    return 'Username is required';
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return 'Username must be at least 3 characters';
  }

  if (trimmed.length > 18) {
    return 'Username must be 18 characters or less';
  }

  if (/\s/.test(trimmed)) {
    return 'Username cannot contain spaces';
  }

  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    return 'Username can only contain letters and numbers';
  }

  if (ROLL_NUMBER_PATTERN.test(trimmed)) {
    return 'Username cannot be a roll number';
  }

  if (PHONE_PATTERN.test(trimmed)) {
    return 'Username cannot contain a phone number';
  }

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'This username is not allowed';
    }
  }

  return null;
}

/**
 * Generate a unique pseudo username by checking against existing usernames in the database.
 * Appends a numeric suffix on collision.
 * Falls back to 'CampusUser' + random digits if generation completely fails.
 */
export async function ensureUniquePseudoUsername(
  supabase: {
    from: (table: 'profiles') => {
      select: (columns: 'id') => {
        eq: (column: 'pseudo_username', value: string) => {
          maybeSingle: () => Promise<{
            data: { id: string } | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };
  }
): Promise<string> {
  const MAX_ATTEMPTS = 20;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let candidate = generatePseudoUsername();

    // On retries, append a random number to reduce collision chance
    if (attempt > 0) {
      candidate += Math.floor(Math.random() * 999) + 1;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('pseudo_username', candidate)
      .maybeSingle();

    if (error) {
      console.error('Error checking pseudo_username uniqueness:', error);
      continue;
    }

    if (!data) {
      return candidate;
    }
  }

  // Fallback: CampusUser + random 4-digit number
  const fallback = 'CampusUser' + Math.floor(1000 + Math.random() * 9000);
  console.warn('Pseudo username generation fell back to:', fallback);
  return fallback;
}
