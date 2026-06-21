# CICS Post-Audit — Complete Implementation Plan

Continuation of the audit-driven task tracker. Week 1 (Tasks 1–5) is complete. This plan covers Weeks 2–4 (Tasks 6–18).

## Current State Summary

After Week 1, the following is already done:
- ✅ `/api/reset-password` — secured with OTP validation
- ✅ Profiles RLS — locked down via `profiles_public` view
- ✅ `middleware.ts` — server-side route protection added
- ✅ Default password moved server-side
- ✅ Full identity mode — no longer falls back to roll number
- ✅ Dead code partially cleaned (8 of 9 files deleted, `quill`/`react-quill` removed from `package.json`)
- ✅ `ErrorBoundaryFunctional.tsx`, `ErrorBoundaryModern.tsx` — deleted, consolidated to single `ErrorBoundary.tsx`
- ✅ `ProfileContext.tsx` — deleted
- ✅ `comment_votes` migration — SQL file created at `supabase/migrations/20260613_comment_votes.sql`

---

## Week 2: Clean Foundation (Tasks 6–10)

---

### Task 6 — Delete remaining dead code

Most dead code was already cleaned in Week 1. One file remains:

#### [MODIFY] [PostCard.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/PostCard.tsx)
- **Problem**: `PostCard.tsx` line 9 imports `VoteButtons` (the vertical variant). The component is used on both the mobile `sm:flex` layout (line 432–442) and the desktop layout (line 462–472).
- **Plan**: Replace `VoteButtons` with `HorizontalVoteButtons` everywhere in PostCard, matching the existing pattern used in the post detail page. Remove the vertical layout section entirely — the desktop layout should use horizontal votes like the post detail page does.
- After this, `VoteButtons.tsx` becomes truly unused.

#### [DELETE] [VoteButtons.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/VoteButtons.tsx)
- Safe to delete after PostCard migration above.

#### [MODIFY] [utils.ts](file:///c:/Projects/antigravity clone/cics1/cics1/src/lib/utils.ts)
- `generateAnonUsername()` — already removed ✅ (file only has `formatTimeAgo` now). No action needed.

---

### Task 7 — Remove `quill` and `react-quill`

**Already complete ✅** — Neither package appears in `package.json`. No further action needed.

---

### Task 8 — Consolidate to one ErrorBoundary

**Already complete ✅** — Only [ErrorBoundary.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/ErrorBoundary.tsx) remains. All 4 pages (feed, profile, room, admin) import it consistently.

---

### Task 9 — Consolidate SQL files into numbered migrations

#### Root SQL files to consolidate

There are **11 ad-hoc SQL files** in the project root:

| File | Content | Action |
|------|---------|--------|
| `supabase-schema.sql` | Base schema (profiles, posts, comments, communities, etc.) | Move → `001_base_schema.sql` |
| `enhanced-post-schema.sql` | Enhanced post columns (post_type, headline, etc.) | Merge into `002_enhanced_posts.sql` |
| `enhanced-post-schema-safe.sql` | Safe version of above with `IF NOT EXISTS` | Merge into `002_enhanced_posts.sql` |
| `update-post-schema.sql` | Post schema updates | Merge into `002_enhanced_posts.sql` |
| `create-basic-communities.sql` | Initial 5 communities + membership | Move → `003_communities.sql` |
| `reddit-hybrid-communities.sql` | Community system enhancements | Merge into `003_communities.sql` |
| `alumni-community.sql` | Alumni community seed data | Merge into `003_communities.sql` |
| `otp-schema.sql` | OTP codes table | Move → `004_otp_codes.sql` |
| `college-email-verification.sql` | Email verification columns | Move → `005_email_verification.sql` |
| `soft-verification-model.sql` | Soft verification model | Move → `005_email_verification.sql` |
| `performance-indexes.sql` | Performance indexes | Move → `006_performance_indexes.sql` |

#### Plan
1. Create numbered migration files in `supabase/migrations/`:
   - `001_base_schema.sql` — Core tables (profiles, posts, comments, post_votes, poll_votes, admins)
   - `002_enhanced_posts.sql` — Post type system, headline, tags, video/link/poll columns
   - `003_communities.sql` — Communities table, community_members, seed data, triggers
   - `004_otp_codes.sql` — OTP codes table
   - `005_email_verification.sql` — Email verification columns + soft verification
   - `006_performance_indexes.sql` — All performance indexes
   - Existing `identity-system-v4.sql` → rename to `007_identity_system_v4.sql`
   - Existing `20260613_lock_down_profiles_rls.sql` → rename to `008_lock_down_profiles_rls.sql`
   - Existing `20260613_comment_votes.sql` → rename to `009_comment_votes.sql`
2. Delete the 11 root-level SQL files.
3. All migrations use `IF NOT EXISTS` / `IF EXISTS` guards for idempotency.

> [!IMPORTANT]
> These are **documentation-only** migrations. They record what the DB schema should look like but are NOT auto-run. The actual Supabase DB was already set up manually. This is purely for organizational clarity and version control.

---

### Task 10 — Fix community directory to use DB data

**Already complete ✅** — [communities/page.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/app/(app)/communities/page.tsx) already fetches from the `communities` table via Supabase (line 27–31). It does NOT use the hardcoded `ROOMS` array.

However, the stale `ROOMS` constant in [types/index.ts](file:///c:/Projects/antigravity clone/cics1/cics1/src/types/index.ts) (lines 96–103) is still imported by `PostCard.tsx` and `post/[postId]/page.tsx` for display labels. This needs cleanup:

#### [MODIFY] [types/index.ts](file:///c:/Projects/antigravity clone/cics1/cics1/src/types/index.ts)
- Update the `ROOMS` array to match the actual DB communities: `campus`, `confessions`, `placements`, `clubs`, `alumni`
- Remove stale entries (`college`, `year`, `branch`, `section`, `random`)

#### [MODIFY] [PostCard.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/PostCard.tsx)
- The room label lookup `ROOMS.find(r => r.id === post.room)` (line 274) should fall back to `post.room` or `post.community_slug` directly when no match is found, rather than defaulting to `'general'`.

---

## Week 3: Fix Broken Features (Tasks 11–14)

---

### Task 11 — Wire up comment voting

The SQL migration already exists at [20260613_comment_votes.sql](file:///c:/Projects/antigravity clone/cics1/cics1/supabase/migrations/20260613_comment_votes.sql). The frontend component [CommentHorizontalVotes.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/CommentHorizontalVotes.tsx) is already fully implemented with optimistic updates, vote toggling, and error rollback.

**Remaining work**:

#### [MODIFY] [post/[postId]/page.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/app/(app)/post/[postId]/page.tsx)
- Pass `currentUserId={user?.id}` to `CommentHorizontalVotes` (currently not passed — line 86–91 in `CommentItem`)
- The `CommentItem` component receives `profile` prop but doesn't pass `currentUserId` to the votes component

#### Supabase DB
- **Ensure the migration has been run** on the production Supabase instance. The SQL file exists but may not have been applied.

---

### Task 12 — Video player rendering in PostCard

**Already complete ✅** — [PostCard.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/PostCard.tsx) lines 238–251 already render a `<video>` element with controls when `post.video_url` exists. The `PostMedia` component handles this.

The post detail page ([post/[postId]/page.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/app/(app)/post/[postId]/page.tsx) lines 636–647) also renders video.

No further action needed.

---

### Task 13 — Link card rendering in PostCard

**Already complete ✅** — [PostCard.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/PostCard.tsx) has a `LinkPreview` component (lines 161–220) that:
- Fetches OG metadata from `/api/link-preview`
- Renders domain, title, description, and OG image
- Has loading skeleton and fallback states

The `PostMedia` component renders it at lines 253–256.

No further action needed.

---

### Task 14 — Poll voting UI and results display

**Already complete ✅** — [PostCard.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/PostCard.tsx) has a `PollDisplay` component (lines 23–158) that:
- Loads poll vote counts from `poll_votes` table
- Shows voting buttons when user hasn't voted
- Shows percentage results after voting
- Handles vote submission with optimistic updates
- Displays total votes and expiry time

The `PostMedia` component renders it at lines 258–261.

No further action needed.

---

## Week 4: Core Missing Features (Tasks 15–18)

---

### Task 15 — Integrate email service for OTP delivery

#### [MODIFY] [otp.ts](file:///c:/Projects/antigravity clone/cics1/cics1/src/lib/otp.ts)
- Replace the `sendOTPEmail` stub (lines 82–94) with actual email sending
- **Recommended service**: Resend (simple API, generous free tier, no domain verification needed for testing)
- Implementation:
  1. Install `resend` package
  2. Create a server-side API route `/api/send-otp` that:
     - Generates OTP via `generateOTP()`
     - Stores OTP via `storeOTP()`
     - Sends email via Resend API
  3. Move email sending to server-side only (current `otp.ts` runs client-side via `createClient()`)

#### [NEW] `src/app/api/send-otp/route.ts`
- Server-side API route that handles OTP generation + storage + email sending
- Accepts `{ email, type }` body
- Uses `RESEND_API_KEY` from environment
- Rate limits: max 1 OTP per email per 60 seconds

#### [MODIFY] [.env.local.example](file:///c:/Projects/antigravity clone/cics1/cics1/.env.local.example)
- Add `RESEND_API_KEY=your_resend_api_key`

#### [MODIFY] [forgot-password/page.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/app/forgot-password/page.tsx)
- Update to call `/api/send-otp` instead of client-side `sendOTPEmail()`

#### [MODIFY] [CollegeEmailVerificationModal.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/CollegeEmailVerificationModal.tsx)
- Update to call `/api/send-otp` instead of client-side `sendOTPEmail()`

> [!IMPORTANT]
> **Decision needed**: Which email service do you want to use? Options:
> - **Resend** (recommended) — Simple API, 100 emails/day free, easy setup
> - **SendGrid** — More established, 100 emails/day free
> - **AWS SES** — Cheapest at scale but requires more setup
> - **Custom SMTP** — If you have an existing mail server

---

### Task 16 — Post edit/delete UI

**Already partially complete ✅** — The post detail page ([post/[postId]/page.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/app/(app)/post/[postId]/page.tsx)) already has:
- Edit button + inline editing textarea (lines 542–615)
- Delete button + confirmation modal (lines 556–589)
- `handleEditSave` and `handleDelete` handlers (lines 195–230)

**Remaining work**:

#### [MODIFY] [PostCard.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/PostCard.tsx)
- Add a three-dot overflow menu (⋮) visible only to the post author
- Menu options: "Edit" (navigates to post detail in edit mode) and "Delete" (inline confirm + delete)
- Alternative: Keep edit/delete only on the post detail page (current state) — this is acceptable UX for a v1

> [!NOTE]
> The post detail page edit/delete is already fully functional. Adding it to PostCard is a nice-to-have. **Recommend shipping as-is** and adding PostCard actions in a later iteration.

---

### Task 17 — Basic report button + admin review page

#### [NEW] `supabase/migrations/010_reports.sql`
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT report_has_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);
```

#### [NEW] `src/components/ReportModal.tsx`
- Modal triggered by "Report" button (already present in PostCard desktop layout, line 542–550, but with no handler)
- Reason categories: Spam, Harassment, Inappropriate Content, Misinformation, Other
- Optional details text field
- Submits to `reports` table

#### [MODIFY] [PostCard.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/PostCard.tsx)
- Wire the existing "Report" button (line 542) to open `ReportModal`
- Pass `postId` and `currentUserId`

#### [NEW] `src/app/(app)/admin/reports/page.tsx`
- Admin-only page listing pending reports
- Shows reported content, reporter (anonymous), reason, timestamp
- Actions: Dismiss, Action (delete post/comment), reviewed notes
- Filters: pending/reviewed/actioned/dismissed

#### [MODIFY] [Sidebar.tsx](file:///c:/Projects/antigravity clone/cics1/cics1/src/components/Sidebar.tsx)
- Add "Reports" link in the admin section (conditionally shown for admins)

---

### Task 18 — SSRF protection + rate limiting on link-preview

#### [MODIFY] [link-preview/route.ts](file:///c:/Projects/antigravity clone/cics1/cics1/src/app/api/link-preview/route.ts)
- **SSRF protection**:
  1. Parse the URL and resolve the hostname to an IP address
  2. Block private/reserved IP ranges: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, `127.x.x.x`, `169.254.x.x`, `::1`, `fc00::/7`
  3. Block `localhost`, `0.0.0.0`, and metadata endpoints (e.g., `169.254.169.254`)
  4. Allowlist only `http` and `https` schemes
  5. Set a fetch timeout (5 seconds)
  6. Limit response body size (1MB max)

- **Rate limiting**:
  1. Simple in-memory rate limiter (Map-based, reset on server restart)
  2. Limit: 30 requests per minute per IP
  3. Return 429 when exceeded
  4. Add rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

#### [NEW] `src/lib/rate-limiter.ts`
- Reusable in-memory rate limiter class
- Can be imported by other API routes (e.g., `/api/send-otp`, `/api/reset-password`)

---

## Open Questions

> [!IMPORTANT]
> 1. **Email service choice** (Task 15): Which provider should we integrate? Resend is recommended for simplicity.
> 2. **PostCard edit/delete** (Task 16): Should we add edit/delete to the feed cards, or is the post detail page sufficient for now?
> 3. **SQL migration execution**: Should I just organize the files, or do you want me to actually merge/deduplicate the SQL content? The existing DB is already set up — these would be reference-only.
> 4. **VoteButtons removal** (Task 6): The current PostCard uses vertical `VoteButtons` for desktop and `HorizontalVoteButtons` for mobile. Replacing vertical with horizontal changes the desktop layout. Want me to keep both layouts or unify to horizontal?

---

## Verification Plan

### Automated Tests
```bash
npm run build          # Verify no import errors after dead code removal
npm run lint           # Verify no lint errors
npm run test           # Run existing Playwright tests
```

### Manual Verification
- [ ] Delete VoteButtons.tsx → verify PostCard still renders correctly
- [ ] Update ROOMS array → verify PostCard shows correct community labels
- [ ] Run comment votes migration → verify CommentHorizontalVotes shows real counts
- [ ] Test report flow end-to-end: Report → Admin review → Dismiss/Action
- [ ] Test link-preview with private IP URLs → verify SSRF block
- [ ] Test rate limiting → verify 429 responses
- [ ] Test email OTP flow (after email service integration)
