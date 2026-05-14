# Open Graph card sources

Source HTML for the 1200x630 social cards rendered into `assets/img/`.
These files are NOT processed by Eleventy (only `.njk` is in `templateFormats`)
and are NOT passthrough-copied, so they stay out of `_site/`.

## Regenerate the homepage card

```bash
# from prism_website_project/ (or any worktree)
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

## Brand notes (verified against live `#home` hero in `assets/css/main.css`)

OG cards should read as the same world as the homepage hero — not a separate visual system. Earlier iterations used a cream/offwhite ground; that was wrong. Cream/honey is an accent, never a background.

- **Ground:** dark navy gradient — `linear-gradient(165deg, #17135C 0%, #1E1A6E 40%, #2A2580 70%, #3A5998 100%)`. Mirrors production `#home`.
- **Ambient layers:** subtle 60px grid in `rgba(189,201,221,0.05)` + soft conic prism glow at upper-right (mirrors `.hero-prism-glow`).
- **Type colors:**
  - Headline: white `#FFFFFF`; italicized portion uses sky→blue gradient `linear-gradient(135deg, #BDC9DD, #4A6DB5)` (matches `.hero-subhead` treatment)
  - Eyebrow: sky `#BDC9DD` with a 36×2 gold hairline before it (matches `.hero-eyebrow::before`)
  - Subhead / body: sky `#BDC9DD`
  - Gold accents (hairline, dot dividers, prism mark): `#C8A45A`
- **Italics carry voice** — used on "*AI adoption,*". Production hero uses gold-styled `<em>` in `.hero-tagline`; italics-as-voice in the headline is a card-specific treatment that reads well at OG scale.
- No exclamation points.
- No banned words: `unlock`, `revolutionize`, `AI-powered`, `game-changer`.
- Firm-level positioning (Prism the firm), not product-level.

## Adding a new card

1. Copy `homepage-v2-og.html` to `<page>-og.html`, edit copy/layout
2. Run the chrome command with adjusted `--screenshot` path
3. Reference the new asset from the page frontmatter (override `site.ogImage` per page if needed)
