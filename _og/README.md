# Open Graph card sources

Source HTML for the 1200x630 social cards rendered into `assets/img/`.
These files are NOT processed by Eleventy (only `.njk` is in `templateFormats`)
and are NOT passthrough-copied, so they stay out of `_site/`.

## Regenerate the homepage card

```bash
# from prism_website_project__release-v2/ (or any worktree)
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --hide-scrollbars --no-sandbox \
  --force-device-scale-factor=1 \
  --window-size=1200,630 \
  --virtual-time-budget=8000 \
  --screenshot="$(pwd -W)/assets/img/homepage-v2-og.png" \
  "file:///$(pwd -W)/_og/homepage-v2-og.html"
```

Verify dimensions:

```bash
py -c "from PIL import Image; im=Image.open('assets/img/homepage-v2-og.png'); print(im.size, im.mode)"
# expected: (1200, 630) RGB
```

## Brand notes (from CLAUDE.md / brand guidelines)

- Cream / offwhite ground (`--offwhite: #F4F7FB`)
- Honey accent (`--gold: #C8A45A`) — use sparingly: hairline, accent dots, eyebrow
- Italics carry voice (used on `"AI adoption,"`)
- No exclamation points
- No banned words: `unlock`, `revolutionize`, `AI-powered`, `game-changer`
- Firm-level positioning (Prism the firm), not product-level (CM-AI is one piece)

## Adding a new card

1. Copy `homepage-v2-og.html` to `<page>-og.html`, edit copy/layout
2. Run the chrome command with adjusted `--screenshot` path
3. Reference the new asset from the page frontmatter (override `site.ogImage` per page if needed)
