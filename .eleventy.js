// Eleventy config — Prism AI Analytics website (prismaianalytics.com)
//
// Stream F1 (2026-05-08): introduces Eleventy as the SSG so shared chrome
// (nav, footer, head/meta, fonts, brand assets) lives in one source and gets
// rendered into every page. F1's scope is the scaffold + a single migrated
// page (index.njk). All other existing files (blog/, privacy.html, login/,
// hero/, brand assets) are passthrough-copied unchanged into _site/ — they
// get migrated into the SSG layout pattern in subsequent F-sub-streams.
//
// Build output: _site/
// Netlify publish dir: _site/ (configured in netlify.toml)

module.exports = function (eleventyConfig) {
  // Pass-through: existing pages we are not migrating yet
  eleventyConfig.addPassthroughCopy('blog');
  eleventyConfig.addPassthroughCopy('login');
  eleventyConfig.addPassthroughCopy('hero');
  eleventyConfig.addPassthroughCopy('privacy.html');

  // Pass-through: shared CSS (extracted from inline styles in v2 index.html)
  eleventyConfig.addPassthroughCopy('assets');

  // Pass-through: brand + media assets used by index.njk and the future pages
  eleventyConfig.addPassthroughCopy('PRISM_Logo.png');
  eleventyConfig.addPassthroughCopy('Michele Website Photo.png');
  eleventyConfig.addPassthroughCopy('iStock-2153051604.mp4');

  // Pass-through: Netlify functions directory must end up in publish dir
  // for Netlify to detect serverless functions on deploy.
  eleventyConfig.addPassthroughCopy({ 'netlify/functions': 'netlify/functions' });

  return {
    dir: {
      input: '.',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    // Only process .njk files as templates. .html files in blog/, login/,
    // hero/ ride through via addPassthroughCopy above (untouched). .md files
    // (README, PR bodies, copy docs) are working docs — not pages — so they
    // are intentionally not in templateFormats. Add an .eleventyignore later
    // if more exclusions are needed.
    templateFormats: ['njk'],
  };
};
