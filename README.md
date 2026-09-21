# CICS — College Internal Communication System

CICS is a Reddit-style internal social platform for college communities, built with Next.js and Supabase.

## 📌 Current Project Level

**Current level: Post-audit implementation complete (Tasks 1–18).**  
Security hardening, identity flow, OTP flows, media posts, voting, moderation reports, and admin review flows are implemented.

For detailed progress, see:
- `/home/runner/work/cics1/cics1/task.md`
- `/home/runner/work/cics1/cics1/implementation_plan.md`
- `/home/runner/work/cics1/cics1/docs/FEATURES-OVERVIEW.md`

## ✨ What’s Included

- College email and OTP-based flows (verification + password reset)
- Community feed, room pages, and profile pages
- Post types: text, image, video, link preview, and polls
- Post/comment voting with optimistic updates
- Identity modes (full, pseudo, anonymous where allowed)
- Report flow + admin report review page
- Rate limiting and SSRF protection on sensitive API routes

## 🚀 Quick Start

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env.local` and fill values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=re_your_resend_api_key
```

For SMTP delivery instead of Resend, use the `SMTP_*` variables documented in
`.env.example`. Do not configure both delivery providers unless SMTP is the
intended primary provider.

### 3) Apply database migrations (Supabase SQL Editor)

Run every file in `supabase/migrations` in numeric order (`001` → `015`).

### 4) Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 🧪 Useful Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — lint source files
- `npm run test` — run Playwright unit project

## ▲ Deploy to Vercel

This app uses Next.js server routes and Supabase, so deploy it as a dynamic
Next.js application; do not use a static export.

1. Import the GitHub repository into Vercel. Vercel auto-detects Next.js; keep
   the project root as the repository root and the build command as `npm run build`.
2. In **Settings → Environment Variables**, add these variables for
   **Production** (and Preview if you want preview deployments to work):

   ```text
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ```

   Configure one mail provider so OTP verification and password-reset emails
   work in production:

   ```text
   SMTP_USER, SMTP_PASS
   ```

   Optional SMTP configuration: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and
   `EMAIL_FROM`. Alternatively use `RESEND_API_KEY` and `EMAIL_FROM`.
3. In Supabase **Authentication → URL Configuration**, set the Vercel production
   URL as the Site URL and add it to Redirect URLs. Add each preview URL only if
   users need to test auth flows there.
4. In Supabase, run migrations `001` through `015` before allowing users onto
   the site. This creates the schema, RLS policies, and storage buckets needed
   for posts, messages, images, reports, and moderation.
5. Deploy from Vercel. Future pushes to the configured production branch deploy
   automatically.

`SUPABASE_SERVICE_ROLE_KEY`, SMTP passwords, and Resend keys are server-only
secrets. Never prefix them with `NEXT_PUBLIC_` and never commit them to Git.

## 🏗️ Repository Guidance

```text
src/
├── app/
│   ├── (app)/         # Protected app routes (feed, communities, post, admin)
│   ├── api/           # Server routes (OTP, reset password, auth checks, link preview)
│   └── ...            # Public/auth/reset pages
├── components/        # UI and feature components
├── contexts/          # React contexts
├── hooks/             # Custom hooks
├── lib/               # Core utilities (auth, OTP, security, helpers)
├── types/             # Shared TypeScript types
└── proxy.ts           # Route protection middleware/proxy logic

supabase/
└── migrations/        # Ordered schema + policy migrations (001-010)
```

## 🔒 Security Notes

- Row-Level Security is enforced through Supabase policies and secure public views
- Sensitive operations are server-side only
- Link preview route includes SSRF guards and rate limiting
- Authentication gating is enforced through `src/proxy.ts`

## 🤝 Contribution Notes

Before contributing:
- Follow migration ordering (`001`–`010`)
- Keep API logic server-side for sensitive flows
- Run `npm run lint` and `npm run build`

## 📄 License

MIT
