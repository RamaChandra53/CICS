# CICS Post-Audit Execution — Task Tracker

## Week 1: Security Lockdown (Tasks 1-5) — COMPLETED ✅

- `[x]` **Task 1**: Secure `/api/reset-password` — Added OTP validation ✅
  - OTP code required, expiry check, OTP consumed after use
- `[x]` **Task 2**: Lock down profile RLS — Created `profiles_public` view, restricted PII ✅
  - Migration: `20260613_lock_down_profiles_rls.sql`
  - View exposes only: id, pseudo_username, is_verified, year, branch, real_display_name
- `[x]` **Task 3**: Add Next.js `middleware.ts` for server-side route protection ✅
  - Protected routes redirect to `/` if no session
  - Auth pages redirect to `/feed` if already logged in
- `[x]` **Task 4**: Move default password check to server-side API route ✅
  - `/api/auth/check-default-password` — server-side check
  - `/api/auth/first-login` — server-side signup with default password
  - Client no longer contains `DEFAULT_PASSWORD` constant
- `[x]` **Task 5**: Fix full identity mode — don't fall back to roll number ✅
  - `identityDisplay.ts` — falls back to `pseudo_username` → `'Campus Member'` (never `username`)
  - Profile page — display name edit UI added (`real_display_name`)

## Week 2: Clean Foundation (Tasks 6-10)

- `[x]` **Task 6**: Delete all dead code (8 components, 1 context, unused functions)
  - Files to delete: `CreatePostForm.tsx`, `VoteButtons.tsx`, `EmailVerificationModal.tsx`, `RichTextEditor.tsx`, `RichTextEditorModern.tsx`, `RedditMobileNav.tsx`, `ErrorBoundaryModern.tsx`, `TagsInput.tsx`, `ProfileContext.tsx`
  - Remove `generateAnonUsername()` from `utils.ts`
  - ⚠️ Note: `VoteButtons.tsx` is STILL IMPORTED by `PostCard.tsx` — must fix PostCard first
- `[x]` **Task 7**: Remove `quill` and `react-quill` from dependencies
- `[x]` **Task 8**: Consolidate to one ErrorBoundary implementation
- `[x]` **Task 9**: Consolidate SQL files into numbered migrations
- `[x]` **Task 10**: Fix community directory to use DB data

## Week 3: Fix Broken Features (Tasks 11-14)

- `[x]` **Task 11**: Create `comment_votes` table + wire up voting
- `[x]` **Task 12**: Add video player rendering in PostCard
- `[x]` **Task 13**: Add link card rendering in PostCard
- `[x]` **Task 14**: Add poll voting UI and results display

## Week 4: Core Missing Features (Tasks 15-18)

- `[x]` **Task 15**: Integrate email service for OTP delivery
- `[x]` **Task 16**: Add post edit/delete UI
- `[x]` **Task 17**: Add basic report button + admin review page
- `[x]` **Task 18**: Add SSRF protection to link-preview + rate limiting
