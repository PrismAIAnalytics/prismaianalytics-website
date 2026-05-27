// Single source of truth for the blog publish gate.
//
// A post with frontmatter `date: YYYY-MM-DD` later than PUBLISH_AS_OF
// (default: today, UTC) is "future" and must render as a "Coming Soon" stub.
// An unparseable date (e.g. "Date TBD", empty) is also treated as future so
// the slug stays gated until the source gets a real date.
//
// PUBLISH_AS_OF lets tests force a date (e.g. "2099-01-01" to unstub everything).
//
// Consumed by:
//   - _build_blog_html.js   (per-post conversion)
//   - _data/posts.js        (Eleventy collection — Phase 2)
//   - scripts/verify-stub.js (smoke test)
//
// History: prior to extraction, gate logic lived inline in _build_blog_html.js
// as isoDate() + an inline comparison. Centralized here after the
// unstub-PR-merge-timing incident — keep semantics identical to that version
// unless intentionally changing them.

'use strict';

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

// Normalize a frontmatter date string to ISO YYYY-MM-DD.
// Returns null if the date is unparseable.
function parsePostDate(raw) {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

// True if the post is future-dated (or has an unparseable date).
// `asOf` defaults to process.env.PUBLISH_AS_OF, then today (UTC).
function isFuture(rawDate, asOf) {
  const cutoff = asOf || process.env.PUBLISH_AS_OF || todayIsoUtc();
  const iso = parsePostDate(rawDate);
  return !iso || iso > cutoff;
}

module.exports = {
  parsePostDate,
  isFuture,
  todayIsoUtc,
};
