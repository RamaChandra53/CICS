# CICS: College Internal Communication System

A modern, Reddit-style internal social platform built with Next.js 16, React, and Supabase. Designed to foster community, transparent communication, and trusted connections within educational institutions.

## ✨ Key Features

- **Modern UI & UX**: Clean, intuitive interface with a "Floating Sidebar" desktop layout and a bottom navigation bar for mobile-optimized browsing.
- **Authentication & Soft-Verification**: Secure email/password login. Users can browse and post immediately upon signup, but unlocking higher-trust features (like password resets or trusted anonymous posting) requires verifying their `@mgit.ac.in` college email via OTP.
- **Dynamic Communities**: Create, join, and explore communities (e.g., Campus, Placements, Confessions, Alumni, Clubs).
- **Rich Media Posts**: Support for text, image, video, link previews, and polls. Features include threaded comments, upvoting/downvoting on both posts and comments, and a unified post card UI.
- **User Profiles & Identity**: Dedicated profile pages with post history. Support for "Full Identity", "Pseudo-Anonymous", and strictly "Anonymous" display modes depending on the community rules.
- **Content Moderation**: Built-in reporting system (`Spam`, `Harassment`, `Inappropriate`) with an Admin Dashboard for reviewing and removing flagged content.
- **Advanced Security**: Built-in rate limiting and strict SSRF (Server-Side Request Forgery) protection on backend API routes (like link previews).

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.com/) account
- A [Resend](https://resend.com/) account (for email OTP delivery)

### 1. Clone the repository

```bash
git clone https://github.com/RamaChandra53/cics1.git
cd cics1
```

### 2. Install dependencies

```bash
npm install
```

### 3. Database Setup (Supabase)

You need to apply the database schema to your Supabase project. 
Navigate to the `supabase/migrations/` folder. Execute the SQL files in order (`001` through `010`) in your Supabase SQL Editor. This will set up all tables (profiles, posts, comments, communities, reports), RLS security policies, and required database triggers.

### 4. Environment Configuration

Create a `.env.local` file in the root directory and add your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Service — Resend (https://resend.com)
# Required for OTP delivery (password reset + college email verification)
RESEND_API_KEY=re_your_resend_api_key
```

### 5. Run the Application

```bash
npm run dev
```

The app will start at `http://localhost:3000`.

## 🔒 Security Architecture

CICS is built with strict security in mind:
- **Row Level Security (RLS)**: Direct database access is locked down. Users can only edit/delete their own posts and votes. Public profiles are exposed via a secured `profiles_public` view to prevent PII leakage.
- **Server-Side API Routes**: Sensitive operations (like generating OTPs or checking default passwords) are handled entirely server-side, keeping service keys out of the browser.
- **Next.js Proxy**: A robust `proxy.ts` (middleware) strictly enforces authentication state across all protected `/(app)` routes before the page even renders.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Email Delivery**: [Resend](https://resend.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: Custom SVGs

## 🏗️ Project Structure

```text
src/
├── app/
│   ├── (app)/         # Protected main routes (feed, post detail, communities, admin)
│   ├── (auth)/        # Public routes (login, signup, forgot-password)
│   └── api/           # Server-side API endpoints (send-otp, link-preview)
├── components/        # Reusable React components (PostCard, Sidebar, ReportModal)
├── contexts/          # React Context providers (AuthContext)
├── lib/               # Utility functions (rate-limiter, OTP logic, Supabase client)
├── types/             # Shared TypeScript definitions
└── proxy.ts           # Next.js Server Middleware for route protection

supabase/
└── migrations/        # Sequential SQL schema migrations
```

## 🤝 Contributing

Contributions are welcome! Please see our [Implementation Plan](implementation_plan.md) and [Task Tracker](task.md) for details on the current architecture, recent codebase audits, and future goals.

## 📄 License

This project is licensed under the MIT License.

---

Made with ❤️ for the College Community
