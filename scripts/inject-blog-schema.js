// Post-build step: inject BlogPosting + BreadcrumbList JSON-LD into every blog
// post in _site/.
//
// Mirrors the inject-analytics.js pattern. Walks _site/blog/**/index.html, pulls
// title, canonical, description, hero image, publish + modified dates, and
// category from the markup, then injects schema blocks immediately after
// <head> so they sit alongside the Organization schema rendered by head.njk.
//
// Idempotent: skips files that already contain the BlogPosting marker. Safe on
// the blog index (/blog/) — that page is a listing, not a post, so it's skipped
// when no publish date is detectable.
//
// Runs as the final build step (eleventy → inject-analytics → inject-blog-schema)
// so it sees post-passthrough HTML in _site/blog/ rather than source HTML in blog/.

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
  return m[1].replace(/\s*[—–\-|]\s*Prism AI Analytics.*$/i, '').trim();
}

function extractCanonical(html) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractDescription(html) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractOgImage(html) {
  const m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractMetaContent(html, property) {
  const re = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

function extractCategory(html) {
  // Prefer the visible breadcrumb chip — the second-to-last <li> in the breadcrumb.
  // Fallback to scanning for an article:section meta tag (not currently emitted,
  // but a reasonable extension hook).
  const breadcrumbMatch = html.match(/<nav class="insights-breadcrumb"[\s\S]*?<\/nav>/i);
  if (breadcrumbMatch) {
    const lis = breadcrumbMatch[0].match(/<li[^>]*>[\s\S]*?<\/li>/gi) || [];
    // Format: Home › Insights › <Category> › <Title aria-current="page">
    if (lis.length >= 4) {
      const categoryLi = lis[lis.length - 2];
      const textMatch = categoryLi.match(/>([^<]+)</);
      if (textMatch) return textMatch[1].trim();
    }
  }
  return null;
}

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function extractPublishDate(html) {
  // Preferred: <time datetime="YYYY-MM-DD"> in the byline (Phase 1+).
  const dt = html.match(/<time[^>]*\bdatetime=["']([^"']+)["']/i);
  if (dt) return dt[1];

  // Legacy: human date inside `.article-meta` block.
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

function buildSchemaBlock({ title, url, description, image, datePublished, dateModified, category }) {
  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description || undefined,
    image: image || undefined,
    datePublished,
    dateModified: dateModified || datePublished,
    articleSection: category || undefined,
    author: { '@type': 'Person', name: AUTHOR_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Prism AI Analytics',
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE_URL}/blog/` },
      ...(category
        ? [{ '@type': 'ListItem', position: 3, name: category, item: `${SITE_URL}/blog/` }]
        : []),
      {
        '@type': 'ListItem',
        position: category ? 4 : 3,
        name: title,
        item: url,
      },
    ],
  };

  // Strip undefined fields from BlogPosting before serializing.
  for (const k of Object.keys(blogPosting)) {
    if (blogPosting[k] === undefined) delete blogPosting[k];
  }

  return `\n<script type="application/ld+json">${JSON.stringify(blogPosting)}</script>\n` +
         `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>\n`;
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
  const description = extractDescription(html);
  const image = extractOgImage(html);
  const datePublished = extractPublishDate(html);
  const dateModified = extractMetaContent(html, 'article:modified_time') || datePublished;
  const category = extractCategory(html);

  if (!title || !datePublished) {
    skippedNoData += 1;
    continue;
  }

  const schemaBlock = buildSchemaBlock({
    title, url, description, image, datePublished, dateModified, category,
  });
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

console.log(`[inject-blog-schema] BlogPosting + BreadcrumbList injected into ${injected} post(s).`);
if (skippedAlreadyTagged > 0) console.log(`[inject-blog-schema] Skipped (already tagged): ${skippedAlreadyTagged}.`);
if (skippedNoData > 0) console.log(`[inject-blog-schema] Skipped (missing title or publish date): ${skippedNoData}.`);
