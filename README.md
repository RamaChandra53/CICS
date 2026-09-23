# CICS — College Internal Communication System

CICS is a Reddit-style internal social platform for college communities, built with Next.js and Supabase.

## 📌 Current Project Level

**Current level: Post-audit implementation complete + v2 architecture refactor underway.**  
Security hardening, identity flow, OTP flows, media posts, voting, moderation reports, and admin review flows are implemented. Core feed, post, comment, poll, community, and profile logic is being moved into typed service modules so UI components stay focused on rendering.

For detailed progress, see:
- `task.md`
- `implementation_plan.md`
- `docs/FEATURES-OVERVIEW.md`
- `docs/alpha-feedback-launch.md`

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
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="CICS <no-reply@example.com>"
```

### 3) Apply database migrations (Supabase SQL Editor)

Run files in `supabase/migrations` in order:
`001` → `012`

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
├── lib/
│   ├── services/      # Supabase data access and domain operations
│   └── ...            # Core utilities (auth, OTP, security, helpers)
├── types/             # Shared TypeScript and normalized domain types
└── proxy.ts           # Route protection middleware/proxy logic

supabase/
└── migrations/        # Ordered schema + policy migrations (001-012)
```

## 🔒 Security Notes

- Row-Level Security is enforced through Supabase policies and secure public views
- Sensitive operations are server-side only
- Link preview route includes SSRF guards and rate limiting
- Authentication gating is enforced through `src/proxy.ts`

## 🧭 Alpha Launch Notes

CICS is currently prepared for a close-friends website alpha on Vercel Hobby/free plan. Keep the first test small, mobile-first, and focused on the core loop: register, browse, post, comment, and vote.

For the first round, test physically with classmates. Sit with each tester, watch where they get stuck, and ask the questions in `docs/alpha-feedback-launch.md` after they try the flow.

## 🤝 Contribution Notes

Before contributing:
- Follow migration ordering (`001`–`012`)
- Keep API logic server-side for sensitive flows
- Run `npm run lint` and `npm run build`

## 📄 License

MIT
