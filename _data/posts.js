// Eleventy data file — single source of truth for "what's published on the blog."
//
// Combines two sources:
//   1. blog-sources/*.md  — builder-managed posts. Future-dated entries are
//      filtered out using the same _lib/publishGate.js the per-post builder
//      uses, so the listing and the post pages can not disagree.
//   2. LEGACY_POSTS       — hardcoded entries for the 8 pre-Phase-1 posts that
//      live as static HTML at blog/<slug>/index.html with no markdown source.
//      Migrate to markdown when their content is next touched; until then,
//      this preserves the legacy entries on the listing.
//
// Returned shape:
//   {
//     featured:    { slug, title, dek, category, date, dateFormatted, ... },
//     categories:  [{ name, dek, posts: [...] }, ...],
//     all:         [...flat list, sorted by date desc],
//   }
//
// Consumed by blog/index.njk (listing surface) and sitemap.njk.

'use strict';

const fs = require('fs');
const path = require('path');
const { isFuture } = require('../_lib/publishGate');

const BLOG_SOURCES = path.join(__dirname, '..', 'blog-sources');

// Category metadata. Order in this array is the order on the listing page.
// `dek` is the section copy preserved from the pre-Phase-2 listing.
const CATEGORIES = [
  {
    name: 'AI Agent Governance',
    dek: 'Configuration management discipline and KRI tier model for AI agents, applied through the Prism CM-AI Framework. A six-part series plus two bonus posts, written for practitioners shipping autonomous AI in production.',
  },
  {
    name: 'Claude for Business',
    dek: 'How a small consultancy actually runs AI inside the business — the systems, agents, and rituals that make Claude useful at work, not just impressive in a demo.',
  },
  {
    name: 'Industry Insights',
    dek: 'What the regulation, certification, and compliance landscape means for small businesses.',
  },
  {
    name: 'Data Demystified',
    dek: 'Making sense of the data and analytics decisions every small business eventually faces.',
  },
  {
    name: 'Actionable Tips',
    dek: 'Practical, do-it-tomorrow guidance for small business operators.',
  },
  {
    name: 'Small Biz AI Wins',
    dek: 'Where AI is actually helping small businesses today, with concrete examples.',
  },
];

// Pre-Phase-1 posts. These live as static HTML in blog/<slug>/index.html with
// no markdown source. Keep them on the listing until they're rewritten.
// heroImage is the generated SVG from scripts/generate-hero-svgs.js.
const LEGACY_POSTS = [
  {
    slug: 'the-2026-ai-regulation-clock-is-ticking',
    title: 'The 2026 AI Regulation Clock Is Ticking — What Small Businesses Need to Know Right Now',
    category: 'Industry Insights',
    date: '2026-04-23',
    readTime: '9 min',
    dek: 'The EU AI Act, state AI laws, and new governance standards all have concrete 2026 deadlines. Here\'s the timeline every small business using AI should have on their calendar.',
    heroImage: '/assets/img/blog/the-2026-ai-regulation-clock-is-ticking/hero.svg',
  },
  {
    slug: 'why-im-pursuing-the-claude-certified-architect',
    title: 'Why I\'m Pursuing the Claude Certified Architect Credential — And Why It Matters for Small Business',
    category: 'Industry Insights',
    date: '2026-04-23',
    readTime: '7 min',
    dek: 'A look at the new Claude Certified Architect certification, what it covers, and why credentialed AI expertise is about to matter for every business buying AI services.',
    heroImage: '/assets/img/blog/why-im-pursuing-the-claude-certified-architect/hero.svg',
  },
  {
    slug: 'why-most-small-businesses-are-behind-on-data',
    title: 'Why Most Small Businesses Are Behind on Data — And How to Catch Up',
    category: 'Industry Insights',
    date: '2026-04-06',
    readTime: '8 min',
    dek: 'Most small businesses know data matters but struggle to use it effectively. Learn the common barriers and practical steps to build a strong data foundation.',
    heroImage: '/assets/img/blog/why-most-small-businesses-are-behind-on-data/hero.svg',
  },
  {
    slug: 'configuration-drift-the-silent-security-risk',
    title: 'Configuration Drift: The Silent Security Risk Most Businesses Ignore',
    category: 'Industry Insights',
    date: '2026-04-06',
    readTime: '8 min',
    dek: 'Configuration drift quietly undermines your security posture. Learn what it is, why it matters, and how small businesses can detect and prevent compliance gaps.',
    heroImage: '/assets/img/blog/configuration-drift-the-silent-security-risk/hero.svg',
  },
  {
    slug: 'what-is-an-ai-readiness-assessment',
    title: 'What Is an AI Readiness Assessment — And Why Your Business Needs One',
    category: 'Data Demystified',
    date: '2026-04-06',
    readTime: '7 min',
    dek: 'Learn what an AI readiness assessment covers, why it matters for small businesses, and how to determine if your organization is prepared to adopt AI successfully.',
    heroImage: '/assets/img/blog/what-is-an-ai-readiness-assessment/hero.png',
  },
  {
    slug: 'five-signs-your-business-is-ready-for-ai',
    title: '5 Signs Your Small Business Is Ready for AI',
    category: 'Actionable Tips',
    date: '2026-04-06',
    readTime: '6 min',
    dek: 'Not sure if your business is ready to adopt AI? Here are five clear signals that your organization is primed to benefit from artificial intelligence.',
    heroImage: '/assets/img/blog/five-signs-your-business-is-ready-for-ai/hero.png',
  },
  {
    slug: 'from-spreadsheets-to-dashboards',
    title: 'From Spreadsheets to Dashboards — Modernizing Your Business Reporting',
    category: 'Actionable Tips',
    date: '2026-04-06',
    readTime: '7 min',
    dek: 'Still relying on spreadsheets for business reporting? Learn how to transition to interactive dashboards that save time and improve decision-making.',
    heroImage: '/assets/img/blog/from-spreadsheets-to-dashboards/hero.png',
  },
  {
    slug: 'how-a-fractional-ai-advisor-can-transform-your-business',
    title: 'How a Fractional AI Advisor Can Transform Your Business',
    category: 'Small Biz AI Wins',
    date: '2026-04-06',
    readTime: '7 min',
    dek: 'Discover how a fractional AI advisor gives small businesses access to enterprise-level AI strategy and implementation without the full-time cost.',
    heroImage: '/assets/img/blog/how-a-fractional-ai-advisor-can-transform-your-business/hero.png',
  },
];

function parseFrontmatter(md) {
  md = md.replace(/\r\n/g, '\n');
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([^:]+):\s*(.*)$/);
    if (kv) {
      let val = kv[2].trim().replace(/\r$/, '');
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      fm[kv[1].trim()] = val;
    }
  }
  return fm;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

function formatPublishDate(date) {
  if (!date) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-');
    return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  }
  return date;
}

function loadMarkdownPosts() {
  if (!fs.existsSync(BLOG_SOURCES)) return [];
  return fs.readdirSync(BLOG_SOURCES)
    .filter(name => name.endsWith('.md'))
    .map(name => {
      const slug = name.replace(/\.md$/, '');
      const fm = parseFrontmatter(fs.readFileSync(path.join(BLOG_SOURCES, name), 'utf8'));
      if (fm.source === 'Google Drive') return null;
      // Drop future-dated posts from the listing. They render as stubs at their
      // direct URL but stay off the index until the publish date arrives.
      if (isFuture(fm.date)) return null;
      return {
        slug,
        title: fm.title || slug,
        dek: fm.dek || fm.excerpt || '',
        category: fm.category || 'Industry Insights',
        date: fm.date || '',
        dateFormatted: formatPublishDate(fm.date || ''),
        readTime: fm.read_time || '',
        heroImage: fm.hero_image || '',
        series: fm.series || '',
        seriesPart: fm.series_part || '',
        url: `/blog/${slug}/`,
        source: 'markdown',
      };
    })
    .filter(Boolean);
}

function loadLegacyPosts() {
  return LEGACY_POSTS.map(p => ({
    slug: p.slug,
    title: p.title,
    dek: p.dek,
    category: p.category,
    date: p.date,
    dateFormatted: formatPublishDate(p.date),
    readTime: p.readTime,
    heroImage: p.heroImage || '',
    series: '',
    seriesPart: '',
    url: `/blog/${p.slug}/`,
    source: 'legacy',
  }));
}

module.exports = function () {
  const markdownPosts = loadMarkdownPosts();
  const legacyPosts = loadLegacyPosts();
  const all = [...markdownPosts, ...legacyPosts]
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const categories = CATEGORIES.map(cat => ({
    name: cat.name,
    dek: cat.dek,
    posts: all.filter(p => p.category === cat.name),
  })).filter(cat => cat.posts.length > 0);

  const featured = all[0] || null;

  return { featured, categories, all };
};
