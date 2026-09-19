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

Copy `/home/runner/work/cics1/cics1/.env.local.example` to `.env.local` and fill values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=re_your_resend_api_key
```

### 3) Apply database migrations (Supabase SQL Editor)

Run files in `/home/runner/work/cics1/cics1/supabase/migrations` in order:
`001` → `010`

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
