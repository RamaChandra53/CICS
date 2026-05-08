'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({ 
  title,
  description,
  icon,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`bg-[#1a1a1b] border border-[#343536] rounded-lg p-8 text-center ${className}`}>
      {icon || <div className="text-4xl mb-3">📭</div>}
      <h3 className="text-[#d7dadc] text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-gray-400 text-sm mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-[#0079d3] hover:bg-[#1a76d3] text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
