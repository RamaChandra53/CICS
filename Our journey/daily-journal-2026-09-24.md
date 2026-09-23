# Daily Journal - 2026-09-24

## What We Did Today

Today we worked on making CICS feel closer to a basic, testable mobile-first website for a small close-friends alpha.

The biggest direction was clear: do not rebuild from scratch. We continued refining the current codebase in place and focused on architecture, reliability, navigation, and mobile UX.

## Architecture And Foundation

We continued the v2 architecture-first refactor. The app now has clearer service boundaries for posts, comments, polls, communities, and profile/auth helpers. The goal was to move logic out of large UI components and make the codebase easier to test and extend.

We added shared domain-style types and service modules so pages and components do not keep reshaping raw Supabase data everywhere. We also added unit tests for important extracted logic.

## Dependency And Security Work

We handled the npm audit issue safely. The important point was that we did not run a forced audit fix. We used the safer non-breaking path and updated dependencies such as Next.js from `16.2.4` to `16.3.6`.

We verified that the app still passed TypeScript, lint, tests/build checks during the process. Existing image warnings from `<img>` remained, but there were no ESLint errors after the later fixes.

## Product Direction

We clarified that CICS is a website, not a mobile app, and that it will be deployed on the Vercel free plan for a small alpha test.

We removed the earlier idea of collecting feedback through a form. The better current plan is to test physically with close friends, watch them use the website, and ask questions directly.

We also decided to avoid adding heavy features before alpha. DMs, referrals, karma, notifications, custom communities, and advanced analytics should wait.

## Communities And Clubs

We defined the community access direction:

- A new user should only enter the community for their own year.
- A new user should only enter the community for their own branch.
- Branch communities should not be accessible by students from other branches.
- Placements remains a shared academic community.

We added official club support. The clubs are open for anyone to join, unlike year and branch communities.

Official clubs included:

- Persona Club - Tech
- Nova Club
- Idea Incubator Club - Business
- Literary Club
- Photography Club
- Spotlight Club - Film
- Beat Cruisers
- Nithya
- Symphony Club - Music
- Yoga & Spirituality Club
- Adobe Design Club
- Sports Club
- UHV Club

We also added a database migration for academic communities and clubs.

## Mobile UI And Navigation

We made several important mobile UX changes.

The top-left `CICS` branding on mobile was removed and replaced with a hamburger button. The top-right profile button remains.

The bottom navigation was simplified to only:

- Home
- Post
- Profile

Communities and Clubs were moved out of the bottom bar and into the hamburger drawer.

The hamburger drawer was changed into a tree-style menu. It now has two parent groups:

- Communities
- Clubs

Under Communities, we show:

- My Year
- My Branch
- Placements

Under Clubs, we show the official clubs as children. Parent rows are visually stronger, and child rows are smaller, indented, and connected with branch-style lines.

We also made the hamburger drawer scrollable using a fixed screen-height layout so it can handle any number of communities or clubs without overflowing.

## Feed And Posting UX

We removed the top feed post prompt and refresh button. The feed no longer shows the compact pill that said things like “Share something with campus...” or “Text posts are best for this alpha test.”

The Post action now lives in the bottom navigation. We also added pull-to-refresh behavior so users can drag down from the top of the feed to refresh.

One important tradeoff: removing the collapsed create-post card means room pages no longer show that small inline composer prompt. Posting still works from the bottom Post button on the feed. We may later add a cleaner room-specific post action if needed.

## Performance And Loading Feel

We worked on the issue where pages felt slow or stuck. We added route progress behavior and improved loading states so page transitions feel less dead.

We also handled a profile timeout issue. Earlier, the app could show a console error like `Profile request timed out`. The profile/auth handling was adjusted so a slow profile request does not completely block the app shell forever.

## Profile Loading Bug

There was a specific bug where tapping Profile from the bottom bar or the top profile button did not appear to load properly.

The cause was in the profile page logic:

- It treated temporarily missing profile data too aggressively.
- It could redirect or stay in a loading state while profile data was still arriving.
- It also waited for the user's posts to load before fully leaving the profile loading state.

We fixed this by:

- Waiting properly for `authLoading` and `profileLoading`.
- Redirecting only when there is no user session.
- Showing a retry state if the session exists but profile data did not load.
- Letting the profile shell load separately from the user's posts query.

After the fix, TypeScript passed and ESLint had zero errors.

## Git And Branch Handling

At the end, we needed to commit and push the work.

The user specifically said:

- Unstage all files first.
- Commit and push only to `numair-devs` and `ram-devs`.
- Do not touch `main`.

What happened:

1. We unstaged all files.
2. The repo was on local `main`, which was behind `origin/main`.
3. To avoid committing directly on `main`, we created a temporary branch:
   `codex/cics-mobile-mvp-polish`
4. We committed the current work there with the message:
   `Polish mobile MVP experience`
5. A direct push to `numair-devs` was rejected because the remote branch already had newer commits.
6. We fetched the remote branch tips.
7. We fast-forwarded local `numair-devs`, cherry-picked the prepared commit onto it, and pushed successfully.
8. We repeated the same process for `ram-devs`.
9. We switched back to `main`.
10. We deleted the temporary Codex branch.

Final pushed commits:

- `numair-devs`: `b4cab4f`
- `ram-devs`: `0a44a4a`

`main` was not committed to and was not pushed.

## Problems We Encountered

The first issue was npm audit vulnerabilities. We solved it by using the safe non-forced audit fix path instead of forcing major upgrades.

The second issue was page loading feeling slow. We improved route progress, loading states, and profile/auth timeout behavior.

The third issue was the mobile UI feeling cluttered. We removed search, removed the feed prompt card, simplified bottom navigation, and moved communities/clubs into a hamburger drawer.

The fourth issue was the profile page not loading reliably. We solved it by fixing the profile page loading assumptions.

The fifth issue was git push rejection. The remote branches had newer commits, so Git correctly blocked a non-fast-forward push. We solved it safely by fetching, fast-forwarding each target branch, cherry-picking our commit, and then pushing normally.

## Current State

The app is now closer to a proper alpha version:

- Mobile navigation is simpler.
- Communities and clubs are better organized.
- Profile loading is more reliable.
- The codebase has better service boundaries.
- The target branches are updated.
- The working tree was clean after the push.

The next useful step is to manually test the alpha flows on mobile:

- Login/register
- Feed loading
- Pull to refresh
- Post creation from bottom nav
- Profile navigation
- Hamburger drawer navigation
- Year, branch, placements, and club room access
- Commenting and voting
- Reporting content
