// Smoke test for the blog publish gate AND the Phase 1 editorial template.
//
// Asserts:
//   A. Gate semantics in _lib/publishGate.js (bidirectional unit assertions).
//   B. Full-build behavior — both stub and published branches emit the
//      shared insights.css link; future-dated synthetic posts stay gated;
//      JSON-LD survives post-build schema injection (when _site/ exists).
//
// Per the unstub-PR-merge-timing incident, silent gate regressions have wiped
// already-published posts back to stubs. This test catches that pre-push.
//
// Usage: node scripts/verify-stub.js
// Exit 0 on success, 1 on any failed assertion.

'use strict';

const fs = require('fs');
const path = require('path');
const { parsePostDate, isFuture } = require('../_lib/publishGate');
const { convertOne, loadAllPosts } = require('../_build_blog_html');

let failed = 0;

function assert(label, actual, expected) {
  const ok = actual === expected;
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${label}`);
  if (!ok) {
    console.log(`    expected: ${JSON.stringify(expected)}`);
    console.log(`    actual:   ${JSON.stringify(actual)}`);
    failed += 1;
  }
}

function assertContains(label, haystack, needle) {
  const ok = haystack.includes(needle);
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${label}`);
  if (!ok) {
    console.log(`    needle: ${JSON.stringify(needle)} not found`);
    failed += 1;
  }
}

function assertNotContains(label, haystack, needle) {
  const ok = !haystack.includes(needle);
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${label}`);
  if (!ok) {
    console.log(`    needle: ${JSON.stringify(needle)} should not be present`);
    failed += 1;
  }
}

// ============================================================================
// A. Gate semantics
// ============================================================================

console.log('verify-stub A: publish gate semantics\n');

assert('parsePostDate: ISO date is returned unchanged', parsePostDate('2026-05-27'), '2026-05-27');
assert('parsePostDate: "May 27, 2026" normalizes to ISO', parsePostDate('May 27, 2026'), '2026-05-27');
assert('parsePostDate: "Date TBD" returns null', parsePostDate('Date TBD'), null);
assert('parsePostDate: empty string returns null', parsePostDate(''), null);
assert('parsePostDate: undefined returns null', parsePostDate(undefined), null);
assert('isFuture: 2099-01-01 with asOf=2026-05-27 is future (gated)', isFuture('2099-01-01', '2026-05-27'), true);
assert('isFuture: 2026-01-01 with asOf=2026-05-27 is past (published)', isFuture('2026-01-01', '2026-05-27'), false);
assert('isFuture: 2026-05-27 with asOf=2026-05-27 is today (published)', isFuture('2026-05-27', '2026-05-27'), false);
assert('isFuture: "Date TBD" is gated regardless of asOf', isFuture('Date TBD', '2099-01-01'), true);
assert('isFuture: empty date is gated', isFuture('', '2026-05-27'), true);
assert('isFuture: "June 8, 2026" with asOf=2026-05-27 is future', isFuture('June 8, 2026', '2026-05-27'), true);
assert('isFuture: "January 1, 2026" with asOf=2026-05-27 is past', isFuture('January 1, 2026', '2026-05-27'), false);

// ============================================================================
// B. Full-build behavior
// ============================================================================

console.log('\nverify-stub B: full-build behavior\n');

// Build a synthetic future-dated post in a temp slug and read back the result.
const SYNTHETIC_SLUG = '__verify_stub_synthetic';
const SYNTHETIC_SRC = path.resolve(__dirname, '..', 'blog-sources', `${SYNTHETIC_SLUG}.md`);
const SYNTHETIC_OUT = path.resolve(__dirname, '..', 'blog', SYNTHETIC_SLUG, 'index.html');

function cleanupSynthetic() {
  try { fs.unlinkSync(SYNTHETIC_SRC); } catch (_) {}
  try { fs.unlinkSync(SYNTHETIC_OUT); } catch (_) {}
  try { fs.rmdirSync(path.dirname(SYNTHETIC_OUT)); } catch (_) {}
}

cleanupSynthetic(); // start clean

const SYNTHETIC_MD = `---
title: "Synthetic verification post"
slug: ${SYNTHETIC_SLUG}
date: 2099-01-01
category: Verification
dek: "A synthetic post used by scripts/verify-stub.js. Should always be stubbed."
read_time: 1 min
author: Michele Fisher
---

# Synthetic verification post

📅 January 1, 2099
⏲ 1 min read
By Michele Fisher

[← Back to Blog](/blog/)

This file is generated and removed by scripts/verify-stub.js. If you see it
committed to the repo, something went wrong with the smoke test cleanup.

## A heading
Body paragraph one.

## Another heading
Body paragraph two.

## Third heading
Body paragraph three.
`;

try {
  // ----- Stub branch: future date, default PUBLISH_AS_OF (today) -----
  fs.writeFileSync(SYNTHETIC_SRC, SYNTHETIC_MD, 'utf8');
  const allPosts = loadAllPosts();
  // loadAllPosts() reads only POSTS array (not the synthetic), so pass minimal allPosts for related selection.
  convertOne(SYNTHETIC_SLUG, allPosts);
  const stubHtml = fs.readFileSync(SYNTHETIC_OUT, 'utf8');

  assertContains('stub branch: contains "Coming Soon" badge', stubHtml, 'Coming Soon');
  assertContains('stub branch: emits noindex robots meta', stubHtml, 'noindex');
  assertContains('stub branch: includes /assets/css/insights.css link', stubHtml, '/assets/css/insights.css');
  assertContains('stub branch: includes /assets/css/main.css link', stubHtml, '/assets/css/main.css');
  // Stub has no byline (no <time> tag), but the head still emits article:published_time
  // for the schema injector to pick up via its fallback path.
  assertContains('stub branch: emits article:published_time meta', stubHtml, 'article:published_time');
  assertContains('stub branch: emits canonical URL', stubHtml, 'rel="canonical"');
  assertNotContains('stub branch: does NOT contain .insights-body (no article body)', stubHtml, '<article class="insights-body">');

  // ----- Published branch: same post, override gate via PUBLISH_AS_OF=2099-02-01 -----
  process.env.PUBLISH_AS_OF = '2099-02-01';
  convertOne(SYNTHETIC_SLUG, allPosts);
  const fullHtml = fs.readFileSync(SYNTHETIC_OUT, 'utf8');
  delete process.env.PUBLISH_AS_OF;

  assertContains('published branch: contains <article class="insights-body">', fullHtml, '<article class="insights-body">');
  assertContains('published branch: includes /assets/css/insights.css link', fullHtml, '/assets/css/insights.css');
  assertContains('published branch: includes /assets/css/main.css link', fullHtml, '/assets/css/main.css');
  assertContains('published branch: emits og:image meta', fullHtml, 'property="og:image"');
  assertContains('published branch: emits <time datetime="2099-01-01">', fullHtml, 'datetime="2099-01-01"');
  assertContains('published branch: emits article:modified_time', fullHtml, 'article:modified_time');
  assertContains('published branch: emits canonical URL', fullHtml, 'rel="canonical"');
  assertContains('published branch: emits breadcrumb nav', fullHtml, 'class="insights-breadcrumb"');
  assertContains('published branch: emits sticky rail', fullHtml, 'class="insights-rail"');
  assertContains('published branch: emits author bio card', fullHtml, 'class="insights-author-card"');
  assertContains('published branch: emits newsletter band', fullHtml, 'class="insights-newsletter"');
  assertContains('published branch: emits TOC (≥3 H2s)', fullHtml, 'class="insights-toc"');
  assertContains('published branch: h2 has id attribute', fullHtml, '<h2 id="a-heading">');
  assertNotContains('published branch: does NOT emit noindex', fullHtml, 'noindex');
} finally {
  cleanupSynthetic();
}

// ----- Unparseable date stays gated -----
fs.writeFileSync(SYNTHETIC_SRC, SYNTHETIC_MD.replace('date: 2099-01-01', 'date: Date TBD'), 'utf8');
try {
  convertOne(SYNTHETIC_SLUG, []);
  const tbdHtml = fs.readFileSync(SYNTHETIC_OUT, 'utf8');
  assertContains('unparseable date: stays gated (contains stub badge)', tbdHtml, 'Coming Soon');
} finally {
  cleanupSynthetic();
}

// ----- JSON-LD survival check (only if _site/ exists from a recent build) -----
const SITE_ROOT = path.resolve(__dirname, '..', '_site', 'blog');
if (fs.existsSync(SITE_ROOT)) {
  console.log('\nverify-stub B (extended): JSON-LD survival in _site/\n');
  // Pick the most recent published post for the check.
  const dirs = fs.readdirSync(SITE_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory());
  let found = false;
  for (const dir of dirs) {
    const indexPath = path.join(SITE_ROOT, dir.name, 'index.html');
    if (!fs.existsSync(indexPath)) continue;
    const html = fs.readFileSync(indexPath, 'utf8');
    if (html.includes('"@type":"BlogPosting"')) {
      assertContains(`_site/blog/${dir.name}/: contains BlogPosting schema`, html, '"@type":"BlogPosting"');
      assertContains(`_site/blog/${dir.name}/: contains BreadcrumbList schema`, html, '"@type":"BreadcrumbList"');
      assertContains(`_site/blog/${dir.name}/: schema has non-empty datePublished`, html, '"datePublished":"20');
      found = true;
      break;
    }
  }
  if (!found) {
    console.log('  [SKIP] No published post with BlogPosting schema found in _site/. Run `npm run build` first.');
  }
} else {
  console.log('\nverify-stub B (extended): _site/ not found — skipping JSON-LD survival check. Run `npm run build` to enable.');
}

console.log(`\n${failed === 0 ? 'OK' : 'FAILED'}: ${failed} failure(s)`);
process.exit(failed === 0 ? 0 : 1);
