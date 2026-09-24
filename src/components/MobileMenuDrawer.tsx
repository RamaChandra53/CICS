'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OFFICIAL_CLUBS } from '@/lib/services/communities';

type MobileMenuDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type TreeChild = {
  href?: string;
  label: string;
  detail?: string;
  disabled?: boolean;
};

function CommunitiesIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M7 21v-2a4 4 0 0 1 3-3.87" />
      <circle cx="12" cy="7" r="3" />
      <path d="M5.5 8a3.5 3.5 0 1 0 0-7" />
      <path d="M18.5 1a3.5 3.5 0 1 1 0 7" />
    </svg>
  );
}

function ClubsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 8H5a3 3 0 0 1-3-3V4h5" />
      <path d="M17 8h2a3 3 0 0 0 3-3V4h-5" />
    </svg>
  );
}

function TreeSection({
  title,
  description,
  icon,
  items,
  pathname,
  onClose,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  items: TreeChild[];
  pathname: string;
  onClose: () => void;
}) {
  return (
    <section className="border-b border-border-primary bg-bg-secondary p-3">
      <div className="flex items-center gap-3 px-1 py-1.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-accent-primary">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-base font-bold text-text-primary">{title}</span>
          <span className="block truncate text-xs text-text-secondary">{description}</span>
        </span>
      </div>

      <div className="relative ml-5 mt-2 space-y-1 border-l border-border-primary pl-4">
        {items.map((child) => {
          const active = child.href ? pathname === child.href || pathname.startsWith(`${child.href}/`) : false;
          const rowClassName = `group relative flex min-h-10 items-center rounded-xl px-3 py-2 transition-colors ${
            child.disabled
              ? 'cursor-default text-text-muted opacity-70'
              : active
              ? 'bg-bg-tertiary text-text-accent'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          }`;
          const content = (
            <>
              <span className={`absolute -left-4 top-1/2 h-px w-4 ${active ? 'bg-accent-primary' : 'bg-border-primary'}`} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{child.label}</span>
                {child.detail && (
                  <span className="block truncate text-[11px] text-text-muted">
                    {child.detail}
                  </span>
                )}
              </span>
            </>
          );

          if (!child.href || child.disabled) {
            return (
              <div key={child.label} className={rowClassName} aria-disabled="true">
                {content}
              </div>
            );
          }

          return (
            <Link
              key={child.href}
              href={child.href}
              onClick={onClose}
              className={rowClassName}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const communityChildren = useMemo<TreeChild[]>(() => {
    const yearNumber = profile?.year?.replace(/\D/g, '');
    const branchSlug = profile?.branch?.toLowerCase();

    return [
      {
        href: yearNumber ? `/room/year-${yearNumber}` : undefined,
        label: 'My Year',
        detail: profile?.year && yearNumber ? `${profile.year} Year` : 'Available after your profile loads',
        disabled: !yearNumber,
      },
      {
        href: branchSlug ? `/room/${branchSlug}` : undefined,
        label: 'My Branch',
        detail: profile?.branch || 'Available after your profile loads',
        disabled: !branchSlug,
      },
      {
        href: '/room/placements',
        label: 'Placements',
        detail: 'Internships, PPOs, interview prep',
      },
    ];
  }, [profile?.branch, profile?.year]);

  const clubChildren = useMemo<TreeChild[]>(
    () =>
      OFFICIAL_CLUBS.map((club) => ({
        href: `/room/${club.slug}`,
        label: club.name,
        detail: club.description ?? undefined,
      })),
    []
  );

  return (
    <div className={`md:hidden fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 bg-black/55 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        className={`absolute left-0 top-0 flex h-dvh w-[82vw] max-w-[320px] flex-col border-r border-border-primary bg-bg-secondary transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-primary px-4">
          <p className="text-sm font-semibold text-text-primary">Menu</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-9 w-9 items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <TreeSection
            title="Communities"
            description="Your academic spaces"
            icon={<CommunitiesIcon />}
            items={communityChildren}
            pathname={pathname}
            onClose={onClose}
          />
          <TreeSection
            title="Clubs"
            description="Official MGIT clubs"
            icon={<ClubsIcon />}
            items={clubChildren}
            pathname={pathname}
            onClose={onClose}
          />
        </nav>
      </aside>
    </div>
  );
}
