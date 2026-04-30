export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  roll_number: string | null;
  year: string | null;
  branch: string | null;
  section: string | null;
  is_first_login: boolean;
  is_verified: boolean;
  is_anonymous: boolean;
  id_card_url: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  room: string;
  content: string;
  image_url: string | null;
  is_anon_post: boolean;
  year_tag: string | null;
  branch_tag: string | null;
  section_tag: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  profiles?: Profile;
  comment_count?: number;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  is_anon_comment: boolean;
  created_at: string;
  profiles?: Profile;
  replies?: Comment[];
};

export type Room = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

export type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  type: string;
  member_count: number;
  created_at: string;
};

export const ROOMS: Room[] = [
  { id: 'college', label: 'College Feed', icon: '🏠', description: 'Everyone in the college' },
  { id: 'year', label: 'My Year', icon: '📅', description: 'Students of your year' },
  { id: 'branch', label: 'My Branch', icon: '💻', description: 'Students of your branch' },
  { id: 'section', label: 'My Section', icon: '👥', description: 'Your exact section' },
  { id: 'confessions', label: 'Confessions', icon: '🔥', description: 'Anonymous only' },
  { id: 'random', label: 'Random', icon: '💬', description: 'Off-topic, memes, anything' },
];

export const BRANCHES = ['CSE', 'ECE', 'IT', 'MECH', 'CIVIL', 'EEE', 'AIDS', 'AIML', 'MBA', 'MCA'];
export const YEARS = ['1st', '2nd', '3rd', '4th'];
export const SECTIONS = ['A', 'B', 'C'];
