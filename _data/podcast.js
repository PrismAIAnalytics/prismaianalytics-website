// Single source of truth for the podcast surface — show metadata, platform
// listings, and episode entries. Consumed by podcast/index.njk.
//
// Adding a new episode: prepend to EPISODES (newest first). The first 2
// render in the "Latest" grid; everything below 2 falls into the "All
// episodes" row list. URL conventions match the existing Substack slugs.

'use strict';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function formatDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

const SUBSTACK_HOME = 'https://micheleprismai.substack.com';
const SUBSTACK_FEED = `${SUBSTACK_HOME}/feed`;

const SHOW = {
  title: 'The Prism Podcast',
  eyebrow: 'The Prism Podcast',
  h1: 'Conversations on enterprise AI',
  dek: 'AI-generated audio companions to the Prism Configuration Management for AI Agents series. One episode per post, building toward the white paper finale.',
  rssUrl: SUBSTACK_FEED,
  // Platforms not yet configured render no pill (kept null until you submit
  // the show to that directory). Substack and RSS are always available.
  platforms: {
    substack:  { url: SUBSTACK_HOME, label: 'Substack' },
    rss:       { url: SUBSTACK_FEED, label: 'RSS' },
    spotify:   { url: null,          label: 'Spotify' },
    apple:     { url: null,          label: 'Apple Podcasts' },
  },
};

// Episodes — newest first. Each entry's substackSlug is the path segment
// after /p/ on the Substack URL; we build the embed and listen-on links
// from that. relatedPostSlug links the episode card to its companion post.
const EPISODES = [
  {
    number: 'EP 04',
    title: 'From Chaos to Cadence: How We Built Prism\'s Claude Operating System',
    date: '2026-06-01',
    duration: '',
    substackSlug: 'from-chaos-to-cadence-how-we-built',
    relatedPostSlug: 'from-chaos-to-cadence-claude-operating-system',
    relatedPostLabel: 'From Chaos to Cadence: How We Built Prism\'s Claude Operating System',
    brief: 'The operational record behind the post — the four-phase build that turned Claude from present-but-unused into staff: map the work into Claude zones and human zones, write the rules every session inherits, wire a control plane the agents read at session start, then measure what works and prune what does not.',
    tags: ['Claude for Business'],
  },
  {
    number: 'EP 03',
    title: 'Configuration Management for AI Agents',
    date: '2026-05-28',
    duration: '',
    substackSlug: 'configuration-management-for-ai-agent',
    relatedPostSlug: 'configuration-management-for-ai-agents',
    relatedPostLabel: 'Configuration Management for AI Agents (Part 2)',
    brief: 'The missing twin of agentic governance. Four disciplines ported from enterprise IT and financial-services operational risk — Baseline, Change Control, Drift Detection, Audit and Remediation — and the Key Risk Indicator tier model that lets governance run at the speed of the agent.',
    tags: ['CM-AI Series'],
  },
  {
    number: 'EP 02',
    title: 'AI Observability Is Not Governance',
    date: '2026-05-21',
    duration: '',
    substackSlug: 'ai-observability-is-not-governance',
    relatedPostSlug: 'observability-isnt-governance',
    relatedPostLabel: 'Observability Isn\'t Governance (Part 1)',
    brief: 'The latency-gap argument and the observability-theater framing — why the disciplines that close the gap already exist in financial-services KRIs and enterprise IT configuration management.',
    tags: ['CM-AI Series'],
  },
  {
    number: 'EP 01',
    title: 'A Hallucination on Our Own Stack: What Configuration Management Would Have Caught',
    date: '2026-05-15',
    duration: '',
    substackSlug: 'a-hallucination-on-our-own-stack',
    relatedPostSlug: 'a-hallucination-on-our-own-stack',
    relatedPostLabel: 'A Hallucination on Our Own Stack (Bonus)',
    brief: 'A first-person field case — how a self-imposed, fabricated constraint moved the Prism Chief of Staff agent outside its baseline for a full session with no governance signal.',
    tags: ['CM-AI Series'],
  },
  {
    number: 'INTRO',
    title: 'Closing the AI Agent Latency Gap',
    date: '2026-05-15',
    duration: '',
    substackSlug: 'closing-the-ai-agent-latency-gap',
    relatedPostSlug: null,
    relatedPostLabel: null,
    brief: 'Orientation for the series. The central problem in agentic AI and why configuration management discipline is the operational layer that closes it. Start here if the CM-AI Framework is new to you.',
    tags: ['Series Introduction'],
  },
];

module.exports = function () {
  const enriched = EPISODES.map((ep, i) => ({
    ...ep,
    dateFormatted: formatDate(ep.date),
    embedUrl: `${SUBSTACK_HOME}/embed/p/${ep.substackSlug}`,
    listenUrl: `${SUBSTACK_HOME}/p/${ep.substackSlug}`,
    relatedPostUrl: ep.relatedPostSlug ? `/blog/${ep.relatedPostSlug}/` : null,
    isLatest: i < 2,
  }));
  // Only include platforms that have a real URL — Spotify/Apple stay hidden
  // until the show is submitted to those directories.
  const platformsActive = Object.entries(SHOW.platforms)
    .filter(([, p]) => p.url)
    .map(([key, p]) => ({ key, ...p }));

  return {
    show: SHOW,
    platformsActive,
    episodes: enriched,
    latest: enriched.filter(e => e.isLatest),
    rest: enriched.filter(e => !e.isLatest),
  };
};
