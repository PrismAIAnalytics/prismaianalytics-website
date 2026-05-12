// One-shot recovery: reconstruct clean markdown sources at blog-sources/<slug>.md
// from the Drive-synced vault files (which preserve body content but have lost
// their original frontmatter).
//
// Drive-sync output looks like:
//   ---
//   source: Google Drive
//   synced: ...
//   ---
//   <Title> | Prism AI Analytics
//   <CSS junk + nav rendered as text>
//   # <Original H1>
//   <date emoji> <Date>
//   <clock emoji> <Read time>
//   By Michele Fisher
//   [← Back to Blog](/blog/)
//   <BODY>
//   ### CTA Heading
//   <CTA paragraph>
//   [<CTA link text>](/url)
//   <footer / script junk>
//
// Recovery: find the "[← Back to Blog](/blog/)" marker. Everything before it is
// junk; everything after it through the last "(/url)" link in the CTA is the
// real body. We rebuild proper frontmatter from POSTS_META and write the
// reconstructed markdown to blog-sources/<slug>.md.

const fs = require('fs');
const path = require('path');

// One-shot recovery: set BLOG_VAULT_ROOT to the absolute path of the vault's
// prism_website_project/blog directory. The script exits if it's unset rather
// than guessing a developer-specific default.
const VAULT_ROOT = process.env.BLOG_VAULT_ROOT;
if (!VAULT_ROOT) {
  console.error('BLOG_VAULT_ROOT env var is required. Set it to the absolute path of PRISM-Vault/prism_website_project/blog and rerun.');
  process.exit(1);
}
const SOURCES_OUT = path.join(__dirname, 'blog-sources');

// Known frontmatter for each post — derived from yesterday's drafts plus
// the publish plan dates. Category updated from "Industry Insights" to the
// new "AI Agent Governance" section per 2026-05-11 review feedback.
const POSTS_META = {
  'observability-isnt-governance': {
    title: "Observability Isn't Governance: The Latency Gap in Agentic AI",
    date: '2026-05-21',
    read_time: '9 min',
    category: 'AI Agent Governance',
    series: 'Configuration Management for AI Agents',
    series_part: '1 of 6',
  },
  'configuration-management-for-ai-agents': {
    title: 'Configuration Management for AI Agents: The Missing Twin of Agentic Governance',
    date: '2026-05-28',
    read_time: '11 min',
    category: 'AI Agent Governance',
    series: 'Configuration Management for AI Agents',
    series_part: '2 of 6',
  },
  'kri-vs-kpi-for-ai-agents': {
    title: 'KRIs vs KPIs for Autonomous Agents: Borrowing 30 Years of Discipline from Financial Services',
    date: '2026-06-04',
    read_time: '12 min',
    category: 'AI Agent Governance',
    series: 'Configuration Management for AI Agents',
    series_part: '3 of 6',
  },
  'nist-ai-rmf-meets-configuration-management': {
    title: 'Mapping NIST AI RMF to Configuration Management: A Crosswalk for Compliance Teams',
    date: '2026-06-11',
    read_time: '11 min',
    category: 'AI Agent Governance',
    series: 'Configuration Management for AI Agents',
    series_part: '4 of 6',
  },
  'microsoft-agent-governance-toolkit-and-the-cm-layer-above-it': {
    title: "Microsoft's Agent Governance Toolkit Is the Kernel. Configuration Management Is the Layer Above It.",
    date: '2026-06-18',
    read_time: '9 min',
    category: 'AI Agent Governance',
    series: 'Configuration Management for AI Agents',
    series_part: 'Bonus',
  },
  'inside-the-prism-cm-ai-control-plane': {
    title: 'Inside the Prism Dashboard: A CM Control Plane in Production',
    date: '2026-06-25',
    read_time: '12 min',
    category: 'AI Agent Governance',
    series: 'Configuration Management for AI Agents',
    series_part: '5 of 6',
  },
  'configuration-management-and-the-aigp-body-of-knowledge': {
    title: 'Configuration Management and the AIGP Body of Knowledge: The Operational Layer the Curriculum Implies',
    date: '2026-07-02',
    read_time: '11 min',
    category: 'AI Agent Governance',
    series: 'Configuration Management for AI Agents',
    series_part: '6 of 6',
  },
};

function recoverOne(slug, meta) {
  const vaultPath = path.join(VAULT_ROOT, slug, 'index.md');
  if (!fs.existsSync(vaultPath)) {
    console.warn(`  -> SKIP ${slug}: vault file not found at ${vaultPath}`);
    return null;
  }
  let raw = fs.readFileSync(vaultPath, 'utf8');
  raw = raw.replace(/\r\n/g, '\n');

  // Find the "[← Back to Blog](/blog/)" marker. Body starts after it.
  // (Note: the build script also keys on this marker, so preserving it in
  // the reconstructed source means the build script's renderBody will strip
  // everything before it correctly.)
  const backMarker = '[← Back to Blog](/blog/)';
  const backIdx = raw.indexOf(backMarker);
  if (backIdx < 0) {
    console.warn(`  -> SKIP ${slug}: back-to-blog marker not found in vault file`);
    return null;
  }

  // Body = everything from immediately after the marker. Trim leading blank lines.
  let body = raw.substring(backIdx + backMarker.length).replace(/^\n+/, '');

  // Trim the trailing footer/script junk. The CTA section ends with a
  // markdown link line "[...](/url)". Strip everything after the LAST such
  // link that precedes the footer artifacts (logo, copyright, script).
  // Heuristic: strip everything from the first "![Prism AI Analytics Logo]"
  // (the footer logo) onward. That marker is consistently present.
  const footerIdx = body.indexOf('![Prism AI Analytics Logo]');
  if (footerIdx > 0) {
    body = body.substring(0, footerIdx).trimEnd();
  }

  // Reconstruct proper frontmatter + the original date/read-time/byline
  // header block + the back-to-blog marker + body.
  const dateRendered = (() => {
    const [y, m, d] = meta.date.split('-');
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  })();

  const reconstructed = [
    '---',
    'source: Recovered',
    'synced: 2026-05-11',
    'modified: 2026-05-11',
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `slug: ${slug}`,
    `date: ${meta.date}`,
    `read_time: ${meta.read_time}`,
    'author: Michele Fisher',
    `category: ${meta.category}`,
    `series: ${meta.series}`,
    `series_part: ${meta.series_part}`,
    '---',
    '',
    `# ${meta.title}`,
    '',
    `📅 ${dateRendered}`,
    `⏲ ${meta.read_time} read`,
    'By Michele Fisher',
    '',
    backMarker,
    '',
    body,
    '',
  ].join('\n');

  fs.mkdirSync(SOURCES_OUT, { recursive: true });
  const outPath = path.join(SOURCES_OUT, `${slug}.md`);
  fs.writeFileSync(outPath, reconstructed, 'utf8');
  console.log(`  -> ${path.relative(__dirname, outPath)} (${reconstructed.length} bytes)`);
  return { slug, bytes: reconstructed.length };
}

console.log('Recovering markdown sources from vault...');
const results = Object.entries(POSTS_META)
  .map(([slug, meta]) => recoverOne(slug, meta))
  .filter(Boolean);
console.log(`\nDone. Recovered ${results.length} of ${Object.keys(POSTS_META).length} sources.`);
