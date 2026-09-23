import type { SupabaseClientLike } from './supabase-types';

export type PollState = {
  userVotedOption: number | null;
  results: Record<number, number>;
  totalVotes: number;
};

export function summarizePollVotes(votes: Array<{ option_index: number }> | null | undefined): Pick<PollState, 'results' | 'totalVotes'> {
  const results: Record<number, number> = {};
  let totalVotes = 0;

  for (const vote of votes ?? []) {
    results[vote.option_index] = (results[vote.option_index] ?? 0) + 1;
    totalVotes += 1;
  }

  return { results, totalVotes };
}

export async function fetchPollState(
  supabase: SupabaseClientLike,
  postId: string,
  currentUserId?: string | null
): Promise<PollState> {
  const { data: votes, error } = await supabase
    .from('poll_votes')
    .select('option_index')
    .eq('post_id', postId);

  if (error) {
    if (error.code === 'PGRST205') {
      return { userVotedOption: null, results: {}, totalVotes: 0 };
    }
    throw error;
  }

  const { results, totalVotes } = summarizePollVotes(votes as Array<{ option_index: number }>);
  let userVotedOption: number | null = null;

  if (currentUserId) {
    const { data: userVote } = await supabase
      .from('poll_votes')
      .select('option_index')
      .eq('post_id', postId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    userVotedOption = (userVote as { option_index?: number } | null)?.option_index ?? null;
  }

  return { userVotedOption, results, totalVotes };
}

export async function submitPollVote(
  supabase: SupabaseClientLike,
  postId: string,
  userId: string,
  optionIndex: number
): Promise<void> {
  const { error } = await supabase
    .from('poll_votes')
    .insert({ user_id: userId, post_id: postId, option_index: optionIndex });

  if (error) throw error;
}
