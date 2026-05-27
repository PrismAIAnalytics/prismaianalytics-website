// Smoke test for the blog publish gate.
//
// Asserts the gate semantics in _lib/publishGate.js — the logic that decides
// whether a post renders as a "Coming Soon" stub or as a full article.
// Per the unstub-PR-merge-timing incident, silent gate regressions have wiped
// already-published posts back to stubs. This test catches that pre-push.
//
// Phase 0: bidirectional unit assertions on the gate module itself.
// Phase 1: extended to assert full-build behavior (CSS link present in both
//          branches, JSON-LD survives post-build injection).
//
// Usage: node scripts/verify-stub.js
// Exit 0 on success, 1 on any failed assertion.

'use strict';

const { parsePostDate, isFuture } = require('../_lib/publishGate');

let failed = 0;

function assert(label, actual, expected) {
  const ok = actual === expected;
  const status = ok ? 'PASS' : 'FAIL';
  const detail = ok ? '' : `  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`;
  console.log(`  [${status}] ${label}`);
  if (!ok) {
    console.log(detail);
    failed += 1;
  }
}

console.log('verify-stub: publish gate semantics\n');

// parsePostDate: ISO passthrough
assert(
  'parsePostDate: ISO date is returned unchanged',
  parsePostDate('2026-05-27'),
  '2026-05-27'
);

// parsePostDate: human-readable normalization
assert(
  'parsePostDate: "May 27, 2026" normalizes to ISO',
  parsePostDate('May 27, 2026'),
  '2026-05-27'
);

// parsePostDate: unparseable returns null
assert(
  'parsePostDate: "Date TBD" returns null',
  parsePostDate('Date TBD'),
  null
);

assert(
  'parsePostDate: empty string returns null',
  parsePostDate(''),
  null
);

assert(
  'parsePostDate: undefined returns null',
  parsePostDate(undefined),
  null
);

// isFuture: future date is gated
assert(
  'isFuture: 2099-01-01 with asOf=2026-05-27 is future (gated)',
  isFuture('2099-01-01', '2026-05-27'),
  true
);

// isFuture: past date is not gated
assert(
  'isFuture: 2026-01-01 with asOf=2026-05-27 is past (published)',
  isFuture('2026-01-01', '2026-05-27'),
  false
);

// isFuture: same day is not gated (publish day = live)
assert(
  'isFuture: 2026-05-27 with asOf=2026-05-27 is today (published)',
  isFuture('2026-05-27', '2026-05-27'),
  false
);

// isFuture: unparseable date is gated (safe default — keeps slug stubbed
// until the source gets a real date)
assert(
  'isFuture: "Date TBD" is gated regardless of asOf',
  isFuture('Date TBD', '2099-01-01'),
  true
);

// isFuture: empty date is gated
assert(
  'isFuture: empty date is gated',
  isFuture('', '2026-05-27'),
  true
);

// isFuture: human-readable date is parsed and compared
assert(
  'isFuture: "June 8, 2026" with asOf=2026-05-27 is future',
  isFuture('June 8, 2026', '2026-05-27'),
  true
);

assert(
  'isFuture: "January 1, 2026" with asOf=2026-05-27 is past',
  isFuture('January 1, 2026', '2026-05-27'),
  false
);

console.log(`\n${failed === 0 ? 'OK' : 'FAILED'}: ${failed} failure(s)`);
process.exit(failed === 0 ? 0 : 1);
