// Post-build step: inject BlogPosting JSON-LD into every blog post in _site/.
//
// Mirrors the inject-analytics.js pattern. Walks _site/blog/**/index.html, pulls
// the post's <title>, canonical URL, and <time datetime="..."> publish date from
// the existing markup, then injects a BlogPosting schema block immediately after
// <head> so it lives alongside the Organization schema rendered by head.njk.
//
// Idempotent: skips files that already contain the BlogPosting marker. Safe on
// the blog index (/blog/) — that page is a listing, not a post, so it's skipped
// when no publish date is detectable.
//
// Runs as the final build step (eleventy → inject-analytics → inject-blog-schema)
// so it sees the post-passthrough HTML in _site/blog/ rather than the source
// HTML in blog/.

const fs = require('node:fs');
const path = require('node:path');

const SITE_DIR = path.resolve(__dirname, '..', '_site');
const BLOG_DIR = path.join(SITE_DIR, 'blog');
const MARKER = '"@type":"BlogPosting"';
const AUTHOR_NAME = 'Michele Fisher';
const SITE_URL = 'https://prismaianalytics.com';
const LOGO_URL = `${SITE_URL}/PRISM_Logo.png`;

if (!fs.existsSync(BLOG_DIR)) {
  console.warn(`[inject-blog-schema] ${BLOG_DIR} not found — skipping.`);
  process.exit(0);
}

function listPosts(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const posts = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(dir, entry.name, 'index.html');
    if (fs.existsSync(indexPath)) posts.push(indexPath);
  }
  return posts;
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  if (!m) return null;
  // Strip a trailing " — Prism AI Analytics" or similar site suffix.
  return m[1].replace(/\s*[—–\-|]\s*Prism AI Analytics.*$/i, '').trim();
}

function extractCanonical(html) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function extractPublishDate(html) {
  // Preferred: a <time datetime="YYYY-MM-DD"> tag if the source ever adds one.
  const dt = html.match(/<time[^>]*\bdatetime=["']([^"']+)["']/i);
  if (dt) return dt[1];

  // Current pre-build output renders dates as a human string inside the
  // article-meta span, e.g. "May 14, 2026". Match scoped to the article-meta
  // block so we don't grab the footer copyright year by accident.
  const metaBlock = html.match(/<div class="article-meta">[\s\S]*?<\/div>/i);
  const scope = metaBlock ? metaBlock[0] : html;
  const human = scope.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})/i);
  if (human) {
    const mm = MONTHS[human[1].toLowerCase()];
    const dd = human[2].padStart(2, '0');
    return `${human[3]}-${mm}-${dd}`;
  }

  // Last-resort: a bare YYYY-MM-DD anywhere in the page (avoids footer year).
  const iso = html.match(/(20\d{2}-[01]\d-[0-3]\d)/);
  return iso ? iso[1] : null;
}

function buildSchema({ title, url, datePublished }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    datePublished,
    author: { '@type': 'Person', name: AUTHOR_NAME },
    publisher: {
      '@type': 'Organization',
      name: 'Prism AI Analytics',
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  return `\n<script type="application/ld+json">${JSON.stringify(schema)}</script>\n`;
}

const posts = listPosts(BLOG_DIR);
let injected = 0;
let skippedAlreadyTagged = 0;
let skippedNoData = 0;

for (const file of posts) {
  const html = fs.readFileSync(file, 'utf8');

  if (html.includes(MARKER)) {
    skippedAlreadyTagged += 1;
    continue;
  }

  const title = extractTitle(html);
  const url = extractCanonical(html) || `${SITE_URL}/blog/${path.basename(path.dirname(file))}/`;
  const datePublished = extractPublishDate(html);

  if (!title || !datePublished) {
    skippedNoData += 1;
    continue;
  }

  const schemaBlock = buildSchema({ title, url, datePublished });
  const headOpen = html.match(/<head(\s[^>]*)?>/i);
  if (!headOpen) {
    skippedNoData += 1;
    continue;
  }

  const insertAt = headOpen.index + headOpen[0].length;
  const next = html.slice(0, insertAt) + schemaBlock + html.slice(insertAt);
  fs.writeFileSync(file, next, 'utf8');
  injected += 1;
}

console.log(`[inject-blog-schema] BlogPosting schema injected into ${injected} post(s).`);
if (skippedAlreadyTagged > 0) console.log(`[inject-blog-schema] Skipped (already tagged): ${skippedAlreadyTagged}.`);
if (skippedNoData > 0) console.log(`[inject-blog-schema] Skipped (missing title or publish date): ${skippedNoData}.`);
