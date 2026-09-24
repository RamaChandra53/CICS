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
    <div className={`rounded-lg border border-border-primary bg-bg-card p-8 text-center ${className}`}>
      {icon || <div className="text-4xl mb-3">📭</div>}
      <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mb-4 text-sm text-text-secondary">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="rounded bg-accent-primary px-4 py-2 text-sm text-white transition-colors hover:bg-accent-secondary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
