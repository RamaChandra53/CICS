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
  email: string | null;
  college_email: string | null;
  is_email_verified: boolean;
  created_at: string;
  // Identity system v4
  real_display_name: string | null;
  pseudo_username: string | null;
  pending_pseudo_username: string | null;
  pseudo_username_status: 'approved' | 'pending' | 'rejected';
  pseudo_username_requested_at: string | null;
  pseudo_username_rejection_reason: string | null;
  pseudo_username_last_changed_at: string | null;
  show_roll_number_publicly: boolean;
};

export type PostType = 'text' | 'image' | 'video' | 'poll' | 'link';

export type DisplayMode = 'full' | 'partial' | 'anonymous' | 'pseudo';

export type Post = {
  id: string;
  author_id: string;
  room: string;
  content: string;
  post_type: PostType;
  headline: string | null;
  description: string | null;
  tags: string[] | null;
  community_slug: string | null;
  is_draft: boolean;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  link_metadata: Record<string, unknown> | null;
  poll_options: string[] | null;
  poll_expires_at: string | null;
  is_anon_post: boolean;
  display_mode: DisplayMode;
  year_tag: string | null;
  branch_tag: string | null;
  section_tag: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile | null;
  comment_count?: number;
  user_vote?: 'up' | 'down' | null;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  is_anon_comment: boolean;
  display_mode: DisplayMode;
  upvotes: number;
  downvotes: number;
  created_at: string;
  profiles?: Profile | null;
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
  { id: 'campus', label: 'Campus', icon: '🎓', description: 'Everyone in the college' },
  { id: 'confessions', label: 'Confessions', icon: '🤫', description: 'Anonymous confessions' },
  { id: 'placements', label: 'Placements', icon: '💼', description: 'Placement updates & discussion' },
  { id: 'alumni', label: 'Alumni', icon: '🎓', description: 'Alumni network & connections' },
];

export const BRANCHES = ['CSE', 'ECE', 'IT', 'MECH', 'CIVIL', 'EEE', 'MCT', 'MME', 'CSB', 'CSM', 'CSD'];
export const YEARS = ['1st', '2nd', '3rd', '4th'];
export const SECTIONS = ['1', '2', '3', '4', '5'];
