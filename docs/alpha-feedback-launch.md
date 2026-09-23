# CICS Close-Friends Physical Alpha Test

## Goal

Ship the basic CICS website to 10-20 trusted MGIT classmates and learn whether they understand it, trust it, and would use it again.

This is a website MVP for Vercel Hobby/free plan, not a native app launch.

The first round should be tested physically. Sit beside testers, give them the website URL, watch silently while they try the flow, then ask questions face to face.

## Keep For Alpha

- MGIT email login/register and OTP verification
- Main feed
- Communities based on the tester's year, branch, and section
- Official clubs page where anyone can join listed MGIT clubs
- Text posts as the main path
- Image, video, link, and poll posts if already working
- Comments and voting
- Anonymous, pseudo, partial, and full identity modes
- Profile page
- Report content flow
- Admin report review

## Postpone

- DMs and private chat
- Referral codes
- Karma, trust points, or reputation
- Notifications
- User-created communities
- Unofficial clubs
- Separate boys/girls spaces
- Advanced moderation analytics
- Growth dashboards
- Native mobile app work

## Mobile UX Checklist

- Landing page clearly says CICS is a private MGIT-only campus discussion website.
- Registration explains that email and roll details are for verification, not public display.
- Feed is readable on phones without crowded controls.
- Create post defaults users toward simple text posts.
- Identity choices use plain language and do not feel scary.
- Empty, loading, and error states explain what happened.
- Report actions are available from posts/comments.

## Vercel Free Plan Checklist

- Keep realtime-heavy features off for the alpha.
- Avoid notifications, DMs, and background jobs.
- Avoid adding analytics dashboards before feedback proves the need.
- Keep media uploads limited during testing.
- Set required Supabase and SMTP environment variables in Vercel.
- Run TypeScript, lint, unit tests, production build, and npm audit before sharing the URL.

## Physical Test Script

Say this before handing them the website:

```text
Hey, I am testing CICS, a private MGIT-only campus discussion website.

Please try these 4 things on your phone. I will mostly stay quiet and watch where the website feels confusing:
1. Register or log in with your MGIT email.
2. Browse the feed and open one post.
3. Create one text post.
4. Comment or vote on another post.

After that, I will ask a few questions. Please be honest, even if something looks bad.
```

## Observation Notes

- Could they understand what CICS is without your explanation?
- Did they hesitate during register/login?
- Did they understand why MGIT email/roll details were needed?
- Did they trust anonymous/pseudo posting?
- Could they find create post quickly?
- Could they create a text post in under 60 seconds?
- Did they understand communities?
- Did they naturally comment or vote?
- Which page caused the longest pause?
- Did they say anything like "why would I use this" or "this feels unsafe"?

## Questions To Ask After Testing

- What did you think this website was for?
- Did you trust it enough to post? Why or why not?
- Was anonymous, pseudo, and full identity clear?
- What confused you?
- What felt unnecessary?
- Would you use this again tomorrow?
- What would make you invite a friend?
- Which page looked worst?
- Which feature did you expect but did not find?
- Rate usefulness, trust, and design from 1 to 10.

## Launch Acceptance

- Website deploys successfully on Vercel Hobby/free.
- No critical npm audit issues.
- Main flows work on mobile.
- New tester can register without help.
- User can create a text post in under 60 seconds.
- Feed, comments, voting, reports, and profile work.
- TypeScript, lint, unit tests, and production build pass.
