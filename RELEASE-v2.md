# Homepage v2 — Production Release

**Target prod push:** 2026-05-17
**Branch:** `release/homepage-v2` (cut from `main` @ `376cfa8`)
**Staging URL:** Netlify deploy preview on this PR

## What ships in v2

- Eleventy SSG with shared chrome partials (F1, PR #4)
- Trimmed home + dedicated nav pages (F2, PR #5)
- /services + /about as standalone pages (F3 + F4)
- /ai-readiness assessment landing + webhook source attribution (F6, PR #7)
- Three.js prism hero behind `?hero=v2` flag (F7, PR #6)
- Blog index — denser 4-up cards, dates on header, sorted newest first (PR #8)
- CM-for-AI series posts — 7 published + Part 5 draft (PRs #9, #10, #11)
- GA4 analytics via post-build snippet injection (IM-006, PR #12)
- GA4 events + technical SEO baseline — AN-001 + AN-003 (PR #13)

## Sign-off chain (Notion)

| Ticket | Owner | Gates |
|---|---|---|
| IM-001 — Drop v2 into staging URL | Eng | This PR's Netlify deploy preview IS the staging URL |
| DS-004 — OG card 1200×630 | Design | Asset + `og:image` meta tag still TODO |
| IM-002 — Run acceptance-criteria.md on staging | Eng | Run against preview URL |
| BS-004 — Voice/visual sign-off | Brand Steward | Run against preview URL |
| PM-001 — Approve for prod push | PM | After BS-004 + IM-002 green |
| IM-004 — Push to prod on 2026-05-17 | Eng | Merge this PR |
| IM-005 — Post-launch verification (within 2 hrs) | Eng | After merge |

## Open decisions before merge

- **Three.js hero flag** — does 05-17 flip default to v2 (visible to all), or does the flag stay on query string (private preview only)? See commit `a7d8648`. Hold a decision before merge.
- **OG card** — DS-004 must land before BS-004 sign-off can pass. Block merge until present.

## Verification after merge

- Production URL renders homepage v2 with no console errors
- `og:image` resolves (LinkedIn/Facebook/X previewer)
- GA4 events firing in real-time view
- /ai-readiness webhook delivering with correct source attribution

## Rollback

If verification fails within 2 hrs of merge: revert this PR's merge commit → push to main → Netlify redeploys previous build.
