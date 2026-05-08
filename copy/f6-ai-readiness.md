# Prism AI Analytics — `/ai-readiness/` Copy Package

**Draft 1 · 2026-05-08 · Stream F6 (Cowork via brand-voice:content-generation)**

Source inputs: live assessment page at `https://dashboard-api-production-dabe.up.railway.app/prism-ai-readiness-assessment.html` (intro + 6 dimensions + band labels mirrored verbatim); v2 copy package at `prism_website_project/copy/v2-adoption-arc.md` (institutional voice anchors); Michele's clarification 2026-05-08 (page funnels into existing assessment flow, not a separately-published research artifact).

**Page job:** convert visitors into the lead-capture step. The assessment is the deliverable; this page is the marketing layer. Form posts to existing Netlify `name="contact"` flow → dashboard `/api/leads` → magic-link email to assessment.

---

## 1. Page meta

- **title:** AI Readiness Assessment — Prism AI Analytics
- **description (~155 chars):** Score your organization across 6 dimensions of AI readiness. Takes 12–15 minutes. Receive an instant score, band, and next-step guidance — no consultant required.
- **ogTitle:** Know exactly where your AI adoption stands. In 15 minutes.
- **ogDescription:** The Prism AI Analytics 6-Dimension AI Readiness Assessment scores your organization across Data Infrastructure, Technology Stack, Process Maturity, Team Readiness, Governance, and Strategic Alignment. Instant results.

## 2. Hero block

**Eyebrow:** `AI READINESS ASSESSMENT` *(simplified from agent's longer hero eyebrow per litmus self-check #8 — consistency with site's other eyebrow patterns)*

**Headline candidates** (Michele picks one)

**Option A**

> Know exactly where your AI adoption stands. In 15 minutes.

*Rationale: Direct imperative. Specificity ("15 minutes") signals bounded commitment, not a consultation funnel. The period after "In 15 minutes" creates a deliberate pause.*

**Option B**

> Six dimensions. One score. The starting point for AI adoption.

*Rationale: Structural framing — leads with framework architecture, lands on utility. Best fit if the audience already knows they need a starting-point diagnostic.*

**Option C** *(continuity with the live assessment's intro)*

> Discover exactly where your business stands with AI. Score your organization across six dimensions in under 15 minutes.

*Rationale: Mirrors the assessment's own intro line nearly verbatim. Visitors arriving at the assessment after this page will recognize the language. Consistency play across surfaces.*

**Subhead** (under chosen headline)

> Prism AI Analytics scores organizations across six dimensions of AI adoption readiness: Data Infrastructure, Technology Stack, Process Maturity, Team Readiness, Governance & Compliance, and Strategic Alignment. The assessment takes 12–15 minutes and produces an instant AI Readiness Score, a band placement, and per-dimension guidance on where to focus first.

**CTAs**

- Primary: `Start the Assessment →` *(scrolls to lead-capture form)*
- Secondary: `See the 6 dimensions →` *(scrolls to dimensions section)*

## 3. The 6 dimensions section

**Eyebrow:** `THE FRAMEWORK`
**Section headline:** Six dimensions of AI adoption readiness.
**Intro line:** AI adoption fails at predictable points. These six dimensions cover the full range of organizational factors — not just technical infrastructure — that determine whether an AI initiative succeeds in production or stalls after the pilot.

**Cards** (2×3 grid; verbatim from the live assessment):

1. **Data Infrastructure** — Quality, accessibility, structure, and accuracy of your business data.
2. **Technology Stack** — Modernness, integration, and AI-compatibility of your current tools.
3. **Process Maturity** — Documentation, repeatability, and automation-readiness of your workflows.
4. **Team Readiness** — Literacy, training, and cultural appetite for AI adoption.
5. **Governance & Compliance** — Policies for data security, privacy, ethical AI use, and risk.
6. **Strategic Alignment** — Connection between AI adoption and business goals / leadership commitment.

## 4. What you'll get section

**Eyebrow:** `YOUR RESULTS`
**Section headline:** An AI Readiness Score, ready when the assessment is complete.

**Body:**

The assessment produces a structured results page immediately upon submission:

- **AI Readiness Score** — a single composite score on a 5.0 scale.
- **Band placement** — your organization falls into one of four bands based on your score:
  - **Emerging** — Foundational gaps are present across multiple dimensions. AI adoption requires prerequisite work before tooling decisions are made.
  - **Developing** — Core infrastructure is present but capability gaps persist across dimensions. Targeted improvements unlock meaningful progress.
  - **Ready** — Organization-wide readiness is strong. Adoption can proceed with a focused execution roadmap.
  - **Advanced** — Readiness indicators are mature across dimensions. The priority shifts from preparation to optimization and governance.
- **Per-dimension breakdown** — a score bar for each of the six dimensions, showing relative strength and gap across the framework, not just in aggregate.
- **Next-step guidance** — a narrative block specific to your band and dimension profile, identifying where to focus attention first.

Results appear on screen at the end of the assessment. There is no waiting period.

## 5. How it works section

**Eyebrow:** `THE PROCESS`
**Section headline:** Four steps from this page to your results.

1. **Submit your details below.** First name, last name, email, and company — the minimum needed to build your assessment record and deliver your results.
2. **Receive a magic link by email.** Prism AI Analytics creates a client record and sends a direct link to your assessment. The link is unique to your record and does not expire.
3. **Take the assessment when you're ready.** 12–15 minutes of structured self-evaluation across the six dimensions.
4. **See your score, band, and next steps immediately.** Results appear on screen at completion. Your score, band placement, per-dimension breakdown, and guidance block are all available on that page.

## 6. Lead-capture form

**Eyebrow:** `GET THE ASSESSMENT`
**Section headline:** Start with a score, not an assumption.
**Intro line:** Submit your details below. A magic link to the assessment will arrive by email — take it at your own pace.

**Form fields:** First Name · Last Name · Email · Company

**Hidden fields** (for `/api/leads` routing):
- `adoption_stage` = `assess` (canonical handshake field from Stream D)
- `source` = `ai_readiness_landing` (lets dashboard attribute leads from this page)

**Submit button copy** (Michele picks one):
- **Option A:** `Get the Assessment →` *(default; consistent with hero CTA)*
- **Option B:** `Send Me the Assessment Link →` *(more explicit about the email mechanic)*

## 7. Trust / credibility footer

> The assessment takes 12–15 minutes. The four fields above are used to create an assessment record and deliver your results link — they are not added to a marketing list. Prism AI Analytics will not initiate follow-up contact unless requested.

*Privacy + time-commitment combined paragraph. Recommended over a credibility-hook ("built by practitioners with X years…") because the credibility-hook approach risks sliding toward founder-warmth or boutique-signaling register. The privacy note directly addresses the barrier most likely to suppress form completion from mid-market operators and regulated-industry buyers.*

---

## Voice litmus self-check (agent + Cowork)

- **"No follow-up call required" (initial Section 4 headline)** — replaced with neutral "ready when the assessment is complete." Original framing positioned Prism relative to the standard consultant model in a way that edged toward "we're different from them" — not generic-consultancy bad, but unnecessary positioning baggage on a self-service page.
- **"No preparation required" (initial Step 3)** — replaced with simply naming the time commitment. The reassurance was redundant given Step 1 + Step 4 already imply zero prep.
- **"Uneven" (initial Developing band)** — replaced with "capability gaps persist across dimensions." More specific.
- **"Nothing follows unless a conversation is requested" (initial Section 7)** — replaced with active voice "Prism AI Analytics will not initiate follow-up contact unless requested."
- **Cross-page voice tension** — homepage `/#contact` says "the first conversation is free — both sides need to know it's a good fit" (implies a conversation follows). This page says no follow-up unless requested. Tension is correct given the different conversion contexts (general inquiry vs. self-service assessment), but the post-form behavior in `submission-created.js` should match each page's implied promise. Worth confirming during F6 implementation.
- **Hero eyebrow simplified** from "AI READINESS — 6-DIMENSION FRAMEWORK" to "AI READINESS ASSESSMENT" for consistency with other site eyebrows that don't use em-dash separators.
- **"AI adoption fails at predictable points"** — the strongest line on the page for institutional authority. No intervention needed.

## Decisions for Michele before Stream F6 build

1. **Pick one of three hero headlines** (Option A / B / C). All three are in scope.
2. **Submit button copy** — Option A (`Get the Assessment →`) or Option B (`Send Me the Assessment Link →`)?
3. **Trust footer wording** — accept the privacy+time paragraph as drafted, or want a credibility-hook variant?
4. **Charlotte-explicit framing** — earlier default was implicit (page reads as targeted at any SMB; Charlotte-area targeting goes in SEO/distribution side). Confirm or redirect.
5. **URL slug** — earlier default was `/ai-readiness/`. Confirm or redirect.
