// Generate editorial SVG hero images for blog posts that don't have their
// own imagery. Deterministic — same slug always produces the same SVG.
// Output: assets/img/blog/<slug>/hero.svg (1376×768, matches the deck-slide
// dimensions so the listing-card aspect ratio is identical across all posts).
//
// Visual language: layered geometric abstractions in the Prism brand palette
// (navy/royal/sky/gold/charcoal). One subtle Prism triangle silhouette per
// composition as a watermark. Five composition templates rotate by slug hash
// so the listing reads as varied without bespoke art direction per post.
//
// Usage: node scripts/generate-hero-svgs.js
//
// Adding a new post: extend POSTS_NEEDING_HEROES with { slug, category }.
// Re-running is safe — file overwrites are deterministic.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT_ROOT = path.resolve(__dirname, '..', 'assets', 'img', 'blog');

// Brand palette (sourced from main.css :root).
const COLORS = {
  navy: '#17135C',
  navyDeep: '#0F0C44',
  royal: '#3A5998',
  blue: '#4A6DB5',
  sky: '#BDC9DD',
  gold: '#C8A45A',
  goldDark: '#A8883A',
  offwhite: '#F4F7FB',
  charcoal: '#1A1A2E',
};

// Posts that need a generated hero. The 6 posts that already reference
// deck slides as inline images are excluded — their frontmatter wires the
// deck slide directly as hero_image.
const POSTS_NEEDING_HEROES = [
  // Markdown posts without deck slides
  { slug: 'a-hallucination-on-our-own-stack',                            category: 'AI Agent Governance' },
  { slug: 'inside-the-prism-cm-ai-control-plane',                        category: 'AI Agent Governance' },
  { slug: 'microsoft-agent-governance-toolkit-and-the-cm-layer-above-it',category: 'AI Agent Governance' },
  { slug: 'from-chaos-to-cadence-claude-operating-system',               category: 'Claude for Business' },
  // Legacy posts (static HTML, hero_image lives in _data/posts.js)
  { slug: 'the-2026-ai-regulation-clock-is-ticking',                     category: 'Industry Insights' },
  { slug: 'why-im-pursuing-the-claude-certified-architect',              category: 'Industry Insights' },
  { slug: 'why-most-small-businesses-are-behind-on-data',                category: 'Industry Insights' },
  { slug: 'configuration-drift-the-silent-security-risk',                category: 'Industry Insights' },
  { slug: 'what-is-an-ai-readiness-assessment',                          category: 'Data Demystified' },
  { slug: 'five-signs-your-business-is-ready-for-ai',                    category: 'Actionable Tips' },
  { slug: 'from-spreadsheets-to-dashboards',                             category: 'Actionable Tips' },
  { slug: 'how-a-fractional-ai-advisor-can-transform-your-business',     category: 'Small Biz AI Wins' },
];

// Width/height match the deck slides (1376×768) so listing-card cropping
// is identical regardless of which posts use which hero type.
const W = 1376;
const H = 768;

// Stable seed from slug — first 4 hex chars of sha-256 → 0–65535.
function slugSeed(slug) {
  const h = crypto.createHash('sha256').update(slug).digest('hex');
  return parseInt(h.slice(0, 4), 16);
}

// Prism triangle silhouette — subtle watermark common to every hero.
// Drawn very low-opacity on top of the composition. Anchored at a position
// derived from the slug so it varies across cards.
function prismWatermark(seed) {
  const cx = 200 + (seed % 900);
  const cy = 200 + ((seed >> 4) % 360);
  const size = 240;
  const points = [
    [cx, cy - size / 2],
    [cx - (size * Math.sqrt(3)) / 4, cy + size / 4],
    [cx + (size * Math.sqrt(3)) / 4, cy + size / 4],
  ].map(p => p.join(',')).join(' ');
  return `<polygon points="${points}" fill="none" stroke="${COLORS.gold}" stroke-width="2" opacity="0.18"/>`;
}

// Subtle grid overlay — quiet texture, matches the homepage hero grid pattern.
function gridOverlay() {
  return `
    <defs>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${COLORS.sky}" stroke-width="0.5" opacity="0.08"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)"/>`;
}

// ============================================================================
// Composition templates — five distinct layouts, one is chosen per slug.
// ============================================================================

function compConcentric(seed) {
  // Concentric rounded squares with gold accent at the visual focus.
  const cx = W / 2 + ((seed % 200) - 100);
  const cy = H / 2;
  const layers = 5;
  let svg = '';
  for (let i = 0; i < layers; i++) {
    const size = 480 - i * 70;
    const opacity = 0.06 + i * 0.04;
    const color = i === layers - 1 ? COLORS.gold : COLORS.sky;
    svg += `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="${size * 0.05}" fill="none" stroke="${color}" stroke-width="${i === layers - 1 ? 3 : 1.5}" opacity="${opacity * 4}"/>`;
  }
  return svg;
}

function compLayeredCircles(seed) {
  // Two overlapping discs (one navy, one royal), with a gold accent ring.
  const x1 = 380 + (seed % 200);
  const x2 = W - 380 - ((seed >> 4) % 200);
  const r = 280;
  return `
    <circle cx="${x1}" cy="${H / 2}" r="${r}" fill="${COLORS.royal}" opacity="0.35"/>
    <circle cx="${x2}" cy="${H / 2}" r="${r}" fill="${COLORS.blue}" opacity="0.35"/>
    <circle cx="${(x1 + x2) / 2}" cy="${H / 2}" r="${r * 0.7}" fill="none" stroke="${COLORS.gold}" stroke-width="2.5" opacity="0.7"/>`;
}

function compDiagonalBars(seed) {
  // Repeating diagonal bars suggesting motion / drift. Gold accent on one bar.
  const accentIndex = seed % 5;
  let svg = '';
  for (let i = 0; i < 5; i++) {
    const x = -200 + i * 360;
    const isAccent = i === accentIndex;
    const color = isAccent ? COLORS.gold : COLORS.sky;
    const opacity = isAccent ? 0.6 : 0.12;
    svg += `<polygon points="${x},${H} ${x + 200},${H} ${x + 600},0 ${x + 400},0" fill="${color}" opacity="${opacity}"/>`;
  }
  return svg;
}

function compGridDots(seed) {
  // Grid of small dots with one cluster highlighted — suggests data/observability.
  const accentCol = 6 + (seed % 8);
  const accentRow = 3 + ((seed >> 4) % 4);
  let svg = '';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 20; c++) {
      const cx = 80 + c * 64;
      const cy = 80 + r * 64;
      const isAccent = Math.abs(c - accentCol) <= 1 && Math.abs(r - accentRow) <= 1;
      const color = isAccent ? COLORS.gold : COLORS.sky;
      const opacity = isAccent ? 0.85 : 0.18;
      const radius = isAccent ? 5 : 3;
      svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" opacity="${opacity}"/>`;
    }
  }
  return svg;
}

function compHorizonLines(seed) {
  // Horizontal lines at varying weights — suggests architecture, structure.
  const accentY = 200 + ((seed % 5) * 80);
  let svg = '';
  for (let y = 100; y < H; y += 60) {
    const isAccent = Math.abs(y - accentY) < 30;
    const color = isAccent ? COLORS.gold : COLORS.sky;
    const opacity = isAccent ? 0.7 : 0.1;
    const width = isAccent ? 3 : 1;
    svg += `<line x1="100" y1="${y}" x2="${W - 100}" y2="${y}" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
  }
  // One vertical accent dividing the composition
  const xDivide = 400 + ((seed >> 8) % 600);
  svg += `<line x1="${xDivide}" y1="40" x2="${xDivide}" y2="${H - 40}" stroke="${COLORS.gold}" stroke-width="1.5" opacity="0.4"/>`;
  return svg;
}

const COMPOSITIONS = [compConcentric, compLayeredCircles, compDiagonalBars, compGridDots, compHorizonLines];

function generateHero(slug) {
  const seed = slugSeed(slug);
  const composer = COMPOSITIONS[seed % COMPOSITIONS.length];
  const composition = composer(seed);
  // Subtle gradient direction varies by slug too
  const gradStops = (seed >> 8) % 3;
  const gradients = [
    `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.navy}"/>
      <stop offset="50%" stop-color="${COLORS.navyDeep}"/>
      <stop offset="100%" stop-color="${COLORS.royal}"/>
    </linearGradient>`,
    `<linearGradient id="bg" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${COLORS.navyDeep}"/>
      <stop offset="60%" stop-color="${COLORS.navy}"/>
      <stop offset="100%" stop-color="${COLORS.charcoal}"/>
    </linearGradient>`,
    `<radialGradient id="bg" cx="30%" cy="40%" r="80%">
      <stop offset="0%" stop-color="${COLORS.royal}"/>
      <stop offset="60%" stop-color="${COLORS.navy}"/>
      <stop offset="100%" stop-color="${COLORS.navyDeep}"/>
    </radialGradient>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-hidden="true">
  <defs>
    ${gradients[gradStops]}
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${COLORS.sky}" stroke-width="0.5" opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  ${composition}
  ${prismWatermark(seed)}
</svg>
`;
}

function main() {
  let written = 0;
  for (const post of POSTS_NEEDING_HEROES) {
    const dir = path.join(OUT_ROOT, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, 'hero.svg');
    fs.writeFileSync(outPath, generateHero(post.slug), 'utf8');
    console.log(`  -> ${path.relative(path.resolve(__dirname, '..'), outPath)}`);
    written += 1;
  }
  console.log(`\nGenerated ${written} SVG hero(s).`);
}

if (require.main === module) main();

module.exports = { generateHero, POSTS_NEEDING_HEROES };
