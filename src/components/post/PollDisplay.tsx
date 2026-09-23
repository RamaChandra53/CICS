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
                ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200'
                : showResults
                  ? 'border-[#252a31] text-slate-300'
                  : 'border-[#252a31] text-slate-300 hover:border-indigo-500/30 hover:bg-indigo-500/5 cursor-pointer'
            }`}
          >
            {showResults && (
              <div
                className={`absolute inset-y-0 left-0 ${isUserVote ? 'bg-indigo-500/15' : 'bg-[#1f2329]'}`}
                style={{ width: `${percentage}%` }}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className="font-medium">{option}</span>
              {showResults && (
                <span className={`text-xs ${isUserVote ? 'text-indigo-300' : 'text-slate-500'}`}>
                  {percentage}%
                </span>
              )}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-slate-500 px-1">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        {expiresAt && <span> · Ends {formatTimeAgo(expiresAt)}</span>}
      </p>
    </div>
  );
}
