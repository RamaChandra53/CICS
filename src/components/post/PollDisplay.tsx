'use client';

import type { MouseEvent } from 'react';
import { formatTimeAgo } from '@/lib/utils';
import { usePoll } from '@/hooks/usePoll';

type PollDisplayProps = {
  postId: string;
  options: string[];
  expiresAt?: string | null;
  currentUserId?: string | null;
};

export default function PollDisplay({ postId, options, expiresAt, currentUserId }: PollDisplayProps) {
  const { userVotedOption, results, totalVotes, voting, vote } = usePoll(
    postId,
    options.length,
    currentUserId
  );

  const handleVote = async (event: MouseEvent, optionIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    await vote(optionIndex);
  };

  const showResults = userVotedOption !== null || !currentUserId;

  if (!options.length) return null;

  return (
    <div className="mt-3 space-y-2" onClick={(event) => event.stopPropagation()}>
      {options.map((option, index) => {
        const count = results[index] ?? 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isUserVote = userVotedOption === index;

        return (
          <button
            key={`${option}-${index}`}
            onClick={(event) => handleVote(event, index)}
            disabled={showResults || voting}
            className={`w-full relative overflow-hidden rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
              isUserVote
                ? 'border-accent-primary bg-bg-tertiary text-text-primary'
                : showResults
                  ? 'border-border-primary bg-bg-secondary text-text-primary'
                  : 'border-border-primary bg-bg-secondary text-text-primary hover:border-accent-primary hover:bg-bg-hover cursor-pointer'
            }`}
          >
            {showResults && (
              <div
                className={`absolute inset-y-0 left-0 ${isUserVote ? 'bg-accent-primary/15' : 'bg-bg-tertiary'}`}
                style={{ width: `${percentage}%` }}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className="font-medium">{option}</span>
              {showResults && (
                <span className={`text-xs ${isUserVote ? 'text-text-accent' : 'text-text-secondary'}`}>
                  {percentage}%
                </span>
              )}
            </div>
          </button>
        );
      })}
      <p className="px-1 text-xs text-text-secondary">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        {expiresAt && <span> · Ends {formatTimeAgo(expiresAt)}</span>}
      </p>
    </div>
  );
}
