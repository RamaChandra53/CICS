'use client';

import { useEffect, useRef, useState } from 'react';
import type { Profile, PublishingIdentity } from '@/types';
import {
  PUBLISHING_IDENTITIES,
  getIdentityModeHelper,
  getIdentityModeLabel,
} from '@/lib/identityDisplay';

type IdentityPickerProps = {
  value: PublishingIdentity;
  onChange: (identity: PublishingIdentity) => void;
  profile: Partial<Profile>;
  label?: string;
};

export default function IdentityPicker({ value, onChange, profile, label = 'Post as' }: IdentityPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span className="mb-2 block text-sm font-semibold text-text-primary">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-border-primary bg-bg-secondary px-3 text-left text-sm text-text-primary focus:border-accent-primary focus:outline-none"
      >
        <span className="truncate font-medium">{getIdentityModeLabel(value, profile)}</span>
        <svg className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open && (
        <div role="listbox" aria-label={label} className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-md border border-border-primary bg-bg-card p-1 shadow-xl">
          {PUBLISHING_IDENTITIES.map((identity) => (
            <button
              key={identity}
              type="button"
              role="option"
              aria-selected={value === identity}
              onClick={() => { onChange(identity); setOpen(false); }}
              className={`flex min-h-14 w-full items-start gap-3 rounded px-3 py-2 text-left transition-colors ${value === identity ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-secondary'}`}
            >
              <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${value === identity ? 'border-4 border-accent-primary' : 'border-border-secondary'}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{getIdentityModeLabel(identity, profile)}</span>
                <span className="block text-xs leading-5 text-text-muted">{getIdentityModeHelper(identity)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
