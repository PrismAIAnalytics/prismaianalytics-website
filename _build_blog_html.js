// Markdown -> HTML converter for the Prism Insights blog.
//
// Reads each post's markdown source from blog-sources/ (workspace-local,
// preferred) with fallback to the vault path. Emits a deployable index.html
// at blog/<slug>/index.html using the Insights editorial template.
//
// Source resolution order:
//   1. ./blog-sources/<slug>.md  (workspace-local; safe from Drive sync)
//   2. <VAULT_ROOT>/<slug>/index.md  (legacy vault path)
//
// Sources whose frontmatter declares `source: Google Drive` are skipped with
// a warning — those are the synced HTML form, not the original markdown.
//
// Architecture (Phase 1):
//   - Per-post styles live in /assets/css/insights.css (shared).
//   - The publish gate (future-dated -> stub) is in _lib/publishGate.js.
//   - Author metadata is a single-author constant block (Michele Fisher) —
//     no _data/authors.json until a second author exists.
//   - Phase 4 will retire this script entirely in favor of Eleventy partials.
//
// Usage: node _build_blog_html.js
// Exports: { convertOne, POSTS, loadAllPosts } for tests and tooling.

const fs = require('fs');
const path = require('path');
const { isFuture } = require('./_lib/publishGate');

// Vault fallback is developer-machine specific. Set BLOG_VAULT_ROOT in the
// environment to enable it. When unset, the script reads only from blog-sources/.
const VAULT_ROOT = process.env.BLOG_VAULT_ROOT || '';
const LOCAL_ROOT = path.join(__dirname, 'blog-sources');
const SITE_ROOT = path.join(__dirname, 'blog');
const SITE_URL = 'https://prismaianalytics.com';

// Cache-bust the shared stylesheet on each release. Bump when insights.css changes.
const CSS_VERSION = '3';

const POSTS = [
  'what-is-ai-agent-governance',
  'a-hallucination-on-our-own-stack',
  'observability-isnt-governance',
  'configuration-management-for-ai-agents',
  'kri-vs-kpi-for-ai-agents',
  'nist-ai-rmf-meets-configuration-management',
  'inside-the-prism-cm-ai-control-plane',
  'configuration-management-and-the-aigp-body-of-knowledge',
  'microsoft-agent-governance-toolkit-and-the-cm-layer-above-it',
  'from-chaos-to-cadence-claude-operating-system',
];

// Single-author defaults. Frontmatter may override. When a second author exists,
// move this to _data/authors.json keyed by name.
const AUTHOR_DEFAULTS = {
  name: 'Michele Fisher',
  role: 'Founder, Prism AI Analytics',
  bio: 'Founder of Prism AI Analytics. BI and data-engineering background, currently focused on configuration management for AI agents in regulated enterprise environments.',
  photo: '/assets/img/authors/michele-fisher.jpg',
  linkedin: 'https://www.linkedin.com/in/michelefisher/',
};

// Default OG image used when a post has no hero_image of its own.
const DEFAULT_OG_IMAGE = `${SITE_URL}/PRISM_Logo.png`;

// ============================================================================
// SVG icons — inlined to avoid extra HTTP requests
// ============================================================================

const ICON_LINKEDIN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.732a1.764 1.764 0 110-3.527 1.764 1.764 0 010 3.527zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>';
const ICON_EMAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7L12 13 2 7"/></svg>';
const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';

// ============================================================================
// Markdown helpers
// ============================================================================

function resolveSource(slug) {
  const localPath = path.join(LOCAL_ROOT, `${slug}.md`);
  if (fs.existsSync(localPath)) return localPath;
  if (VAULT_ROOT) {
    const vaultPath = path.join(VAULT_ROOT, slug, 'index.md');
    if (fs.existsSync(vaultPath)) return vaultPath;
  }
  return null;
}

function parseFrontmatter(md) {
  // Normalize line endings before regex matching. Drive sync produces CRLF
  // which would otherwise break the regex anchoring on \n.
  md = md.replace(/\r\n/g, '\n');
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: md };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([^:]+):\s*(.*)$/);
    if (kv) {
      let val = kv[2].trim().replace(/\r$/, '');
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      fm[kv[1].trim()] = val;
    }
  }
  return { fm, body: m[2] };
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(s) {
  return escHtml(s).replace(/'/g, '&#39;');
}

// Slugify a heading's raw text for use as an id. Stable, ASCII-only.
function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Decode the small set of HTML entities that appear in the source markdown
// (e.g. "&mdash;", "&rsquo;") to their Unicode characters. Without this,
// escHtml below turns "&mdash;" into "&amp;mdash;" which the browser then
// renders as literal text. Order matters: &amp; must be last so we don't
// re-decode already-decoded ampersands.
function decodeCommonEntities(text) {
  return text
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rdquo;/g, '”')
    .replace(/&ldquo;/g, '“')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// Convert inline markdown formatting to HTML.
// Handles **bold**, *italic*, `code`, [text](url).
function renderInline(text) {
  text = decodeCommonEntities(text);
  const codes = [];
  text = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return ` CODE${codes.length - 1} `;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, url) => {
    return `<a href="${escHtml(url)}">${escHtml(t)}</a>`;
  });
  const parts = text.split(/(<a [^>]*>[^<]*<\/a>)/);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('<a ')) continue;
    let s = parts[i];
    s = s.replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
    parts[i] = s;
  }
  text = parts.join('');
  text = text.replace(/ CODE(\d+) /g, (_, i) => `<code>${escHtml(codes[+i])}</code>`);
  text = text.replace(/(\w)'(\w)/g, '$1&rsquo;$2');
  text = text.replace(/&amp;rsquo;/g, '&rsquo;');
  return text;
}

function renderBody(md) {
  // Strip the leading H1 + meta block + back-to-blog (those go in the hero).
  const idx = md.indexOf('[← Back to Blog](/blog/)');
  if (idx >= 0) {
    md = md.substring(idx + '[← Back to Blog](/blog/)'.length).trimStart();
  } else {
    md = md.replace(/^#\s[^\n]*\n+/, '');
  }

  const lines = md.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trim = line.trim();

    if (/^---+\s*$/.test(trim)) { i++; continue; }

    if (line.startsWith('### ')) {
      out.push(`<h3>${renderInline(line.substring(4).trim())}</h3>`);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      const raw = line.substring(3).trim();
      const id = slugifyHeading(raw);
      out.push(`<h2 id="${id}">${renderInline(raw)}</h2>`);
      i++; continue;
    }
    if (line.startsWith('#### ')) {
      out.push(`<h4>${renderInline(line.substring(5).trim())}</h4>`);
      i++; continue;
    }

    const imageMatch = trim.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imageMatch) {
      const altText = imageMatch[1];
      const imgPath = imageMatch[2];
      out.push(
        `<figure class="post-figure">\n` +
        `    <img src="${escHtml(imgPath)}" alt="${escHtml(altText)}" loading="lazy" />\n` +
        (altText ? `    <figcaption>${escHtml(altText)}</figcaption>\n` : '') +
        `  </figure>`
      );
      i++; continue;
    }

    if (trim.startsWith('|') && line.includes('|', 2)) {
      const tlines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tlines.push(lines[i]); i++;
      }
      out.push(renderTable(tlines));
      continue;
    }

    if (trim.startsWith('> ')) {
      const qlines = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        qlines.push(lines[i].trim().substring(2)); i++;
      }
      out.push(`<blockquote>${renderInline(qlines.join(' '))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(trim)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInline(lines[i].trim().replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trim)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInline(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (trim === '') { i++; continue; }

    const plines = [trim];
    i++;
    while (i < lines.length && lines[i].trim() !== '' &&
           !lines[i].startsWith('#') &&
           !lines[i].trim().startsWith('|') &&
           !/^[-*]\s+/.test(lines[i].trim()) &&
           !/^\d+\.\s+/.test(lines[i].trim()) &&
           !lines[i].trim().startsWith('> ') &&
           !/^---+\s*$/.test(lines[i].trim())) {
      plines.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${renderInline(plines.join(' '))}</p>`);
  }

  return out.join('\n\n  ');
}

function renderTable(lines) {
  const rows = [];
  for (const line of lines) {
    const trim = line.trim();
    if (/^\|[\s|:-]+\|?$/.test(trim)) continue;
    const cells = trim.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    rows.push(cells);
  }
  if (rows.length === 0) return '';
  let html = '<table class="article-table">';
  html += `<thead><tr>${rows[0].map(c => `<th>${renderInline(c)}</th>`).join('')}</tr></thead>`;
  html += '<tbody>';
  for (let r = 1; r < rows.length; r++) {
    html += `<tr>${rows[r].map(c => `<td>${renderInline(c)}</td>`).join('')}</tr>`;
  }
  html += '</tbody></table>';
  return html;
}

// Detect the closing CTA block in body output and convert to .article-cta div.
// Preserved from the pre-Phase-1 builder so legacy post conventions still work.
function extractCta(bodyHtml) {
  const ctaMarkers = ['<h3>Need', '<h3>Want', '<h3>Already', '<h3>Concerned',
                      '<h3>Schedule', '<h3>Working', '<h3>Studying', '<h3>Implementing'];
  let cutIdx = -1;
  for (const marker of ctaMarkers) {
    const k = bodyHtml.lastIndexOf(marker);
    if (k > cutIdx) cutIdx = k;
  }
  if (cutIdx < 0) return { body: bodyHtml, cta: null };

  const ctaHtml = bodyHtml.substring(cutIdx);
  const bodyOnly = bodyHtml.substring(0, cutIdx).trimEnd();

  const titleMatch = ctaHtml.match(/<h3>([^<]+)<\/h3>/);
  const linkMatch = ctaHtml.match(/<a href="([^"]+)">([^<]+)<\/a>/);
  if (!titleMatch || !linkMatch) return { body: bodyHtml, cta: null };

  const title = titleMatch[1];
  const linkUrl = linkMatch[1];
  const linkText = linkMatch[2];

  const middle = ctaHtml
    .substring(titleMatch.index + titleMatch[0].length, linkMatch.index)
    .replace(/<a href="[^"]+">[^<]+<\/a>/g, '')
    .replace(/<p>\s*<\/p>/g, '')
    .trim();

  const description = middle.replace(/<p>/g, '').replace(/<\/p>/g, ' ').trim();

  const cta = `
  <div class="article-cta">
    <h3>${title}</h3>
    <p>${description}</p>
    <a href="${linkUrl}">${linkText}</a>
  </div>`;

  return { body: bodyOnly, cta };
}

// Count body words and convert to "N min read" (225 wpm reading rate).
function computeReadTime(markdown) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_\-|!\[\]()]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 225));
  return `${minutes} min read`;
}

// Format ISO date "2026-05-27" as "May 27, 2026".
function formatPublishDate(date) {
  if (!date) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-');
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  }
  return date;
}

// Initials fallback when an author has no photo file yet.
function getInitials(name) {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// True if the post's hero_image is the same file as the first <img> in the
// rendered body. When the deck slides do double duty (hero + inline figure
// with caption), the body's caption is the better surface — so we suppress
// the hero figure and let the inline image carry the visual + caption.
// og:image still uses heroImage; only the visible page hero is suppressed.
function firstBodyImageMatchesHero(bodyHtml, heroImage) {
  if (!heroImage) return false;
  const m = bodyHtml.match(/<img\s+[^>]*src="([^"]+)"/i);
  if (!m) return false;
  const norm = s => s.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '').replace(/^\/+/, '/');
  return norm(m[1]) === norm(heroImage);
}

// Extract <h2 id="..."> headings from rendered body for the TOC.
function extractTocItems(bodyHtml) {
  const items = [];
  const re = /<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = re.exec(bodyHtml)) !== null) {
    const id = m[1];
    const label = m[2].replace(/<[^>]+>/g, '');
    items.push({ id, label });
  }
  return items;
}

// ============================================================================
// Posts inventory (used by related-posts selector)
// ============================================================================

function loadAllPosts() {
  const out = [];
  for (const slug of POSTS) {
    const src = resolveSource(slug);
    if (!src) continue;
    const { fm } = parseFrontmatter(fs.readFileSync(src, 'utf8'));
    if (fm.source === 'Google Drive') continue;
    out.push({
      slug,
      title: fm.title || slug,
      dek: fm.dek || '',
      date: fm.date || '',
      category: fm.category || '',
      heroImage: fm.hero_image || '',
      readTime: fm.read_time || '',
      isFuture: isFuture(fm.date),
    });
  }
  return out;
}

function selectRelatedPosts(currentSlug, allPosts, n = 3) {
  const current = allPosts.find(p => p.slug === currentSlug);
  const published = allPosts.filter(p => !p.isFuture && p.slug !== currentSlug);
  const byDate = (a, b) => (a.date < b.date ? 1 : -1);
  const sameCategory = current
    ? published.filter(p => p.category === current.category).sort(byDate)
    : [];
  const others = published.filter(p => !sameCategory.includes(p)).sort(byDate);
  return [...sameCategory, ...others].slice(0, n);
}

// ============================================================================
// HTML partials
// ============================================================================

function renderHead({ title, description, canonicalUrl, ogImage, datePublished, dateModified, isStub }) {
  const ogTitle = title.replace(/\s\|\s.*$/, '');
  const ogImageAbs = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escHtml(title)} | Prism AI Analytics</title>
  <meta name="description" content="${escAttr(description)}"/>
  ${isStub ? '<meta name="robots" content="noindex, follow"/>' : ''}
  <link rel="canonical" href="${escAttr(canonicalUrl)}"/>
  <meta property="og:title" content="${escAttr(ogTitle)} | Prism AI Analytics"/>
  <meta property="og:description" content="${escAttr(description)}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:url" content="${escAttr(canonicalUrl)}"/>
  <meta property="og:image" content="${escAttr(ogImageAbs)}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:site_name" content="Prism AI Analytics"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escAttr(ogTitle)}"/>
  <meta name="twitter:description" content="${escAttr(description)}"/>
  <meta name="twitter:image" content="${escAttr(ogImageAbs)}"/>
  ${datePublished ? `<meta property="article:published_time" content="${escAttr(datePublished)}"/>` : ''}
  ${dateModified ? `<meta property="article:modified_time" content="${escAttr(dateModified)}"/>` : ''}
  <link rel="icon" type="image/png" href="/PRISM_Logo.png"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/assets/css/main.css"/>
  <link rel="stylesheet" href="/assets/css/insights.css?v=${CSS_VERSION}"/>
</head>`;
}

function renderNav() {
  return `<nav id="topnav">
  <a href="/" class="nav-logo">
    <img src="/PRISM_Logo.png" alt="Prism AI Analytics Logo" onerror="this.style.display='none'"/>
    <div class="nav-logo-text">Prism AI Analytics<span>Illuminating Data. Empowering Decisions.</span></div>
  </a>
  <ul class="nav-links">
    <li><a href="/">Home</a></li>
    <li><a href="/about/">About</a></li>
    <li><a href="/services/">Services</a></li>
    <li><a href="/blog/" class="active">Blog</a></li>
    <li><a href="/#contact">Contact</a></li>
  </ul>
  <button class="hamburger" id="hamburger" aria-label="Toggle navigation"><span></span><span></span><span></span></button>
  <a href="/login/" class="nav-login">Client Login</a>
  <a href="/#contact" class="nav-cta">Work With Us</a>
</nav>
<div class="mobile-nav" id="mobileNav">
  <a href="/">Home</a><a href="/about/">About</a><a href="/services/">Services</a><a href="/blog/">Blog</a><a href="/#contact">Contact</a>
  <a href="/login/">Client Login</a>
  <a href="/#contact" style="color:var(--gold);font-weight:700;">Work With Us</a>
</div>`;
}

function renderFooter() {
  return `<footer>
  <div class="footer-brand">
    <img src="/PRISM_Logo.png" alt="Prism AI Analytics Logo" onerror="this.style.display='none'"/>
    <div class="footer-brand-text">Prism AI Analytics<span>Illuminating Data. Empowering Decisions.</span></div>
  </div>
  <div class="footer-copy">&copy; 2026 Prism AI Analytics. All rights reserved.</div>
  <div class="footer-links">
    <a href="/">Home</a><a href="/about/">About</a><a href="/services/">Services</a><a href="/blog/">Blog</a><a href="/#contact">Contact</a><a href="/login/">Client Login</a>
  </div>
</footer>`;
}

function renderBreadcrumb({ category, title }) {
  return `<nav class="insights-breadcrumb" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/blog/">Insights</a></li>
    <li><a href="/blog/">${escHtml(category || 'Article')}</a></li>
    <li aria-current="page">${escHtml(title)}</li>
  </ol>
</nav>`;
}

function renderAuthorPhoto(photoUrl, authorName, sizeClass) {
  const initials = getInitials(authorName);
  return `<div class="${sizeClass}" aria-hidden="true">` +
    `<img src="${escAttr(photoUrl)}" alt="" onerror="this.parentNode.textContent='${escAttr(initials)}'"/>` +
    `</div>`;
}

function renderHero({ category, title, dek, author, role, photo, dateIso, dateFormatted, readTime, heroImage }) {
  const heroFigureHtml = heroImage
    ? `<div class="insights-hero-figure"><img src="${escAttr(heroImage)}" alt="" loading="eager"/></div>`
    : '';
  return `<header class="insights-hero">
  <div class="insights-hero-inner">
    ${category ? `<div class="insights-chip">${escHtml(category)}</div>` : ''}
    <h1>${escHtml(title)}</h1>
    ${dek ? `<p class="insights-dek">${escHtml(dek)}</p>` : ''}
    <div class="insights-meta">
      <div class="insights-byline-author">
        ${renderAuthorPhoto(photo, author, 'insights-byline-photo')}
        <span>By <a href="${escAttr(AUTHOR_DEFAULTS.linkedin)}" rel="author">${escHtml(author)}</a></span>
      </div>
      <span class="meta-sep" aria-hidden="true"></span>
      <span class="insights-byline-role">${escHtml(role)}</span>
      <span class="meta-sep" aria-hidden="true"></span>
      <time datetime="${escAttr(dateIso)}">${escHtml(dateFormatted)}</time>
      ${readTime ? `<span class="meta-sep" aria-hidden="true"></span><span>${escHtml(readTime)}</span>` : ''}
    </div>
  </div>
</header>
${heroFigureHtml}`;
}

function renderShareRail({ title, canonicalUrl, tocItems }) {
  const encodedUrl = encodeURIComponent(canonicalUrl);
  const encodedTitle = encodeURIComponent(title);
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const xUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const mailUrl = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;

  const tocHtml = tocItems.length >= 3 ? `
    <div class="insights-rail-label">On this page</div>
    <nav class="insights-toc" aria-label="Table of contents">
      <ol>
        ${tocItems.map(item =>
          `<li class="insights-toc-item" data-toc-id="${escAttr(item.id)}"><a href="#${escAttr(item.id)}">${escHtml(item.label)}</a></li>`
        ).join('\n        ')}
      </ol>
    </nav>
  ` : '';

  return `<aside class="insights-rail">
    <div class="insights-rail-label">Share</div>
    <div class="insights-share">
      <a class="insights-share-btn" href="${escAttr(linkedinUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">${ICON_LINKEDIN}</a>
      <a class="insights-share-btn" href="${escAttr(xUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Share on X">${ICON_X}</a>
      <a class="insights-share-btn" href="${escAttr(mailUrl)}" aria-label="Share by email">${ICON_EMAIL}</a>
      <button type="button" class="insights-share-btn" id="copyLinkBtn" data-url="${escAttr(canonicalUrl)}" aria-label="Copy link">${ICON_COPY}</button>
    </div>
    ${tocHtml}
  </aside>`;
}

function renderAuthorCard({ author, role, bio, photo, linkedin }) {
  return `<aside class="insights-author-card">
    ${renderAuthorPhoto(photo, author, 'insights-author-photo')}
    <div>
      <p class="insights-author-name">${escHtml(author)}</p>
      <p class="insights-author-role">${escHtml(role)}</p>
      <p class="insights-author-bio">${escHtml(bio)}</p>
      <a class="insights-author-link" href="${escAttr(linkedin)}" target="_blank" rel="noopener noreferrer">Connect on LinkedIn →</a>
    </div>
  </aside>`;
}

function renderNewsletter() {
  return `<section class="insights-newsletter">
  <div class="insights-newsletter-inner">
    <div>
      <p class="insights-newsletter-eyebrow">Stay in the loop</p>
      <h2>New Insights, straight to your inbox.</h2>
      <p>Get the next post on enterprise AI governance the morning it publishes. No noise, one signal per week.</p>
    </div>
    <form class="insights-newsletter-form" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="contact"/>
      <input type="hidden" name="source" value="blog-newsletter"/>
      <input type="hidden" name="name" value="Newsletter subscriber"/>
      <input type="hidden" name="message" value="Blog newsletter signup"/>
      <div class="hp-field"><label>Do not fill: <input name="bot-field"/></label></div>
      <label class="hp-field" for="newsletter-email">Email address</label>
      <input id="newsletter-email" type="email" name="email" placeholder="you@company.com" required autocomplete="email"/>
      <button type="submit">Subscribe</button>
    </form>
  </div>
</section>`;
}

function renderRelatedGrid(posts) {
  if (posts.length === 0) return '';
  const cards = posts.map(p => {
    const heroBg = p.heroImage
      ? `<img src="${escAttr(p.heroImage)}" alt="" loading="lazy"/>`
      : `<div class="insights-card-image-placeholder" aria-hidden="true">PRISM</div>`;
    const formatted = formatPublishDate(p.date);
    return `<a class="insights-card" href="/blog/${escAttr(p.slug)}/">
      <div class="insights-card-image">${heroBg}</div>
      <div class="insights-card-body">
        ${p.category ? `<span class="insights-chip">${escHtml(p.category)}</span>` : ''}
        <h3 class="insights-card-title">${escHtml(p.title)}</h3>
        <div class="insights-card-meta">
          <time datetime="${escAttr(p.date)}">${escHtml(formatted)}</time>
          ${p.readTime ? `<span class="meta-sep" aria-hidden="true"></span><span>${escHtml(p.readTime)}</span>` : ''}
        </div>
      </div>
    </a>`;
  }).join('\n    ');

  return `<section class="insights-related" aria-label="Related insights">
    <h2 class="insights-related-heading">Related Insights</h2>
    <div class="insights-related-grid">
    ${cards}
    </div>
  </section>`;
}

function renderClientScript() {
  return `<script>
  // Nav scroll + mobile menu
  window.addEventListener('scroll', () => {
    document.getElementById('topnav').classList.toggle('scrolled', window.scrollY > 60);
  });
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('hamburger').classList.toggle('active');
    document.getElementById('mobileNav').classList.toggle('active');
  });

  // Copy-link share button — clipboard + toast
  (function () {
    var btn = document.getElementById('copyLinkBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-url') || window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(showToast).catch(function () { showToast('Press Ctrl+C to copy'); });
      } else {
        showToast('Press Ctrl+C to copy');
      }
    });
    function showToast(msg) {
      var t = document.getElementById('insightsToast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'insightsToast';
        t.className = 'insights-toast';
        document.body.appendChild(t);
      }
      t.textContent = msg || 'Link copied to clipboard';
      t.classList.add('visible');
      setTimeout(function () { t.classList.remove('visible'); }, 2000);
    }
  })();

  // TOC active-item highlight via IntersectionObserver
  (function () {
    var items = document.querySelectorAll('.insights-toc-item');
    if (items.length === 0 || !('IntersectionObserver' in window)) return;
    var byId = {};
    items.forEach(function (li) { byId[li.getAttribute('data-toc-id')] = li; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          items.forEach(function (li) { li.classList.remove('insights-toc-item--active'); });
          var li = byId[entry.target.id];
          if (li) li.classList.add('insights-toc-item--active');
        }
      });
    }, { rootMargin: '-96px 0px -65% 0px', threshold: 0 });
    document.querySelectorAll('.insights-body h2[id]').forEach(function (h) { observer.observe(h); });
  })();
</script>`;
}

// ============================================================================
// Top-level renderers
// ============================================================================

function renderPublishedPost(opts) {
  const {
    title, dek, description, canonicalUrl, ogImage,
    dateIso, dateFormatted, dateModified, readTime,
    author, role, authorBio, authorPhoto, authorLinkedin,
    category, heroImage,
    bodyHtml, ctaHtml, tocItems, relatedPosts,
  } = opts;

  return `${renderHead({
    title, description, canonicalUrl, ogImage,
    datePublished: dateIso, dateModified, isStub: false,
  })}
<body>

${renderNav()}

${renderBreadcrumb({ category, title })}

${renderHero({
  category, title, dek, author, role,
  photo: authorPhoto, dateIso, dateFormatted, readTime, heroImage,
})}

<div class="insights-article">
  <article class="insights-body">
    ${bodyHtml}
    ${ctaHtml || ''}
  </article>
  ${renderShareRail({ title, canonicalUrl, tocItems })}
</div>

<div style="max-width:1040px;margin:0 auto;padding:0 2rem;">
  ${renderAuthorCard({ author, role, bio: authorBio, photo: authorPhoto, linkedin: authorLinkedin })}
</div>

${renderNewsletter()}

${renderRelatedGrid(relatedPosts)}

${renderFooter()}

${renderClientScript()}
</body>
</html>
`;
}

function renderStubPost(opts) {
  const {
    title, description, dek, canonicalUrl, ogImage,
    dateIso, dateFormatted, dateModified, category,
  } = opts;

  return `${renderHead({
    title, description, canonicalUrl, ogImage,
    datePublished: dateIso, dateModified, isStub: true,
  })}
<body>

${renderNav()}

${renderBreadcrumb({ category, title })}

<header class="insights-hero">
  <div class="insights-hero-inner">
    ${category ? `<div class="insights-chip">${escHtml(category)}</div>` : ''}
    <h1>${escHtml(title)}</h1>
    ${dek ? `<p class="insights-dek">${escHtml(dek)}</p>` : ''}
  </div>
</header>

<section class="insights-stub">
  <div class="insights-stub-badge">Coming Soon</div>
  <p class="insights-stub-eyebrow">Publishing</p>
  <p class="insights-stub-date">${escHtml(dateFormatted || 'Date TBD')}</p>
  <p>${escHtml(description)}</p>
  <p style="font-size:0.92rem;">Check back on the publish date for the full article.</p>
</section>

${renderFooter()}

<script>
  window.addEventListener('scroll', () => {
    document.getElementById('topnav').classList.toggle('scrolled', window.scrollY > 60);
  });
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('hamburger').classList.toggle('active');
    document.getElementById('mobileNav').classList.toggle('active');
  });
</script>
</body>
</html>
`;
}

// ============================================================================
// Per-post conversion
// ============================================================================

function convertOne(slug, allPosts) {
  const srcPath = resolveSource(slug);
  if (!srcPath) {
    console.warn(`  -> SKIP ${slug}: no source markdown found (checked local + vault)`);
    return null;
  }
  const md = fs.readFileSync(srcPath, 'utf8');
  const { fm, body } = parseFrontmatter(md);

  if (fm.source === 'Google Drive') {
    console.warn(`  -> SKIP ${slug}: source at ${srcPath} is synced HTML, not markdown. Re-author into blog-sources/${slug}.md to rebuild.`);
    return null;
  }

  const title = fm.title || slug;
  const date = fm.date || '';
  const modified = fm.modified || date;
  const readTime = fm.read_time || computeReadTime(body);
  const author = fm.author || AUTHOR_DEFAULTS.name;
  const role = fm.role || AUTHOR_DEFAULTS.role;
  const authorBio = fm.author_bio || AUTHOR_DEFAULTS.bio;
  const authorPhoto = fm.author_photo || AUTHOR_DEFAULTS.photo;
  const authorLinkedin = fm.author_linkedin || AUTHOR_DEFAULTS.linkedin;
  const category = fm.category || 'Industry Insights';
  const heroImage = fm.hero_image || '';
  const canonicalUrl = `${SITE_URL}/blog/${slug}/`;
  // og:image must be a raster format — Facebook rejects SVG and some Twitter
  // / LinkedIn previewers fall back to nothing. SVG heroes still render on
  // the site itself; the social preview falls back to the global PNG logo.
  const heroIsRaster = /\.(png|jpg|jpeg|webp)$/i.test(heroImage);
  const ogImage = heroIsRaster
    ? (heroImage.startsWith('http') ? heroImage : `${SITE_URL}${heroImage}`)
    : DEFAULT_OG_IMAGE;

  // Dek: required for the editorial template. Fall back to frontmatter `excerpt`
  // (legacy) or to the first body paragraph truncated. Backfilled to all posts
  // in this PR, so the fallback should rarely fire.
  let dek = fm.dek || fm.excerpt || '';
  if (!dek) {
    const afterBack = body.split('[← Back to Blog](/blog/)')[1] || body;
    const firstPara = afterBack
      .split('\n\n')
      .find(p => {
        const t = p.trim();
        return t && !t.startsWith('#') && !t.startsWith('---') &&
               !t.startsWith('📅') && !t.startsWith('⏲') && !t.startsWith('By ');
      });
    if (firstPara) {
      dek = firstPara.trim().replace(/\s+/g, ' ').slice(0, 200);
      if (dek.length === 200) dek += '...';
    }
  }
  const description = dek.slice(0, 200);

  const fullBody = renderBody(body);
  const { body: bodyOnly, cta } = extractCta(fullBody);
  const tocItems = extractTocItems(bodyOnly);

  // Suppress the hero figure when it would duplicate the body's first inline
  // image. og:image still uses heroImage for social previews.
  const heroFigureImage = firstBodyImageMatchesHero(bodyOnly, heroImage) ? '' : heroImage;

  const dateFormatted = formatPublishDate(date);
  const future = isFuture(date);

  const relatedPosts = future ? [] : selectRelatedPosts(slug, allPosts || [], 3);

  const html = future
    ? renderStubPost({
        title, description, dek, canonicalUrl, ogImage,
        dateIso: date, dateFormatted: dateFormatted || 'Date TBD',
        dateModified: modified, category,
      })
    : renderPublishedPost({
        title, dek, description, canonicalUrl, ogImage,
        dateIso: date, dateFormatted, dateModified: modified, readTime,
        author, role, authorBio, authorPhoto, authorLinkedin,
        category, heroImage: heroFigureImage,
        bodyHtml: bodyOnly, ctaHtml: cta, tocItems, relatedPosts,
      });

  const outDir = path.join(SITE_ROOT, slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  const kind = future ? 'STUB' : 'FULL';
  console.log(`  -> [${kind}] ${path.relative(__dirname, outPath)} (${html.length} bytes)`);

  return {
    slug, title, date: dateFormatted, readTime, description,
    status: future ? 'stub' : 'published',
  };
}

// ============================================================================
// Main
// ============================================================================

if (require.main === module) {
  console.log('Converting blog posts...');
  const allPosts = loadAllPosts();
  const results = POSTS.map(slug => convertOne(slug, allPosts)).filter(Boolean);
  console.log('\nDone. Converted', results.length, 'of', POSTS.length, 'posts.');
  fs.writeFileSync(
    path.join(__dirname, '_blog_build_summary.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log('Summary written to _blog_build_summary.json');
}

module.exports = { convertOne, POSTS, loadAllPosts, selectRelatedPosts, computeReadTime, slugifyHeading };
