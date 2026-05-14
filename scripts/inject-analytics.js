// Post-build step: inject the GA4 gtag snippet into every HTML page in _site/.
//
// Single source of truth for the analytics tag. Runs after `eleventy` completes,
// so it covers templated pages (homepage) AND every passthrough HTML file
// (blog posts, /privacy, /login, hero widget). Without this, every new blog
// post added under blog/ would need the snippet pasted into its <head> by hand.
//
// Env contract:
//   GA_MEASUREMENT_ID  — required for the injection to run. Format: G-XXXXXXXXXX.
//                        If missing, the script logs a warning and exits 0 so
//                        local dev builds (no secret) don't fail. Netlify
//                        production builds must have this set.

const fs = require('node:fs');
const path = require('node:path');

const SITE_DIR = path.resolve(__dirname, '..', '_site');
const MARKER = 'googletagmanager.com/gtag/js?id=';

const measurementId = (process.env.GA_MEASUREMENT_ID || '').trim();

if (!measurementId) {
  console.warn('[inject-analytics] GA_MEASUREMENT_ID not set — skipping GA4 injection.');
  console.warn('[inject-analytics] Set it in Netlify env vars for production builds.');
  process.exit(0);
}

if (!/^G-[A-Z0-9]{6,}$/.test(measurementId)) {
  console.error(`[inject-analytics] GA_MEASUREMENT_ID "${measurementId}" does not look like a GA4 ID (expected G-XXXXXXXXXX).`);
  process.exit(1);
}

const snippet = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}');
</script>
`;

function listHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.html'))
    .map(e => path.join(e.parentPath || e.path, e.name));
}

if (!fs.existsSync(SITE_DIR)) {
  console.error(`[inject-analytics] _site/ not found at ${SITE_DIR}. Did eleventy run?`);
  process.exit(1);
}

const files = listHtmlFiles(SITE_DIR);
let injected = 0;
let skippedAlreadyTagged = 0;
let skippedNoHead = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');

  if (html.includes(MARKER)) {
    skippedAlreadyTagged += 1;
    continue;
  }

  const headOpenMatch = html.match(/<head(\s[^>]*)?>/i);
  if (!headOpenMatch) {
    skippedNoHead += 1;
    continue;
  }

  const insertAt = headOpenMatch.index + headOpenMatch[0].length;
  const next = html.slice(0, insertAt) + snippet + html.slice(insertAt);
  fs.writeFileSync(file, next, 'utf8');
  injected += 1;
}

console.log(`[inject-analytics] GA4 ${measurementId} injected into ${injected} file(s).`);
if (skippedAlreadyTagged > 0) console.log(`[inject-analytics] Skipped (already tagged): ${skippedAlreadyTagged}.`);
if (skippedNoHead > 0) console.log(`[inject-analytics] Skipped (no <head>): ${skippedNoHead}.`);
