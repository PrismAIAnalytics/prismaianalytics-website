# prismaianalytics-website

Marketing site for [prismaianalytics.com](https://prismaianalytics.com) — Prism AI Analytics.

## Structure

- `index.html` — homepage
- `blog/` — Industry Insights posts
- `privacy.html` — privacy policy (served at `/privacy` via redirect)
- `hero/` — hero animation assets
- `login/` — entry point to the dashboard auth flow
- `netlify/functions/submission-created.js` — forwards contact-form submissions to the dashboard API
- `netlify.toml` — Netlify build config + redirect rules

## Local dev

```sh
node serve.js
```

Static server on port 3000. Override with `PORT=5000 node serve.js`.

## Deploy

Hosted on Netlify (site_id `d02e1d67-cde7-49bd-8173-e72ec2ec8aa5`). Auto-deploys on push to `main`.

Required Netlify environment variables (set in the Netlify UI, not in this repo):

- `DASHBOARD_API_URL` — Railway URL of the dashboard, no trailing slash
- `DASHBOARD_LEADS_SECRET` — optional shared secret for the `X-Lead-Forwarder` header
