// netlify/functions/submission-created.js
//
// Fires automatically on every Netlify Forms submission-created event.
// Forwards the submission payload to the Prism Dashboard /api/leads endpoint.
//
// Required environment variables (set these in Netlify → Site settings → Env vars):
//   DASHBOARD_API_URL          e.g. https://portal.prismaianalytics.com
//   DASHBOARD_LEADS_SECRET     shared secret sent as X-Lead-Forwarder header (optional but recommended)
//
// Why this file is named "submission-created.js":
//   Netlify fires functions named after event hooks automatically. The name must
//   match the event exactly — no routes, no additional setup needed.
//
// What this function does NOT do:
//   - No retries. If the dashboard is down, the lead is lost. For now acceptable
//     because Netlify retains the submission in its own dashboard as a backup.
//     When ready, replace with a queue or retry loop.

'use strict';

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}');
    const form = payload.payload || {};
    const data = form.data || {};

    // Filter to known form only (don't forward honeypot pings, other forms, etc.)
    if (form.form_name !== 'contact') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'not contact form' }) };
    }

    // Map website field names → dashboard API field names.
    // adoption_stage is the canonical handshake field with /api/leads (homepage v2,
    // 2026-05-07): values are exploring | assess | architect | operate | compliance.
    const body = {
      first_name:          data.first_name      || '',
      last_name:           data.last_name       || '',
      email:               data.email           || '',
      company:             data.company         || '',
      adoption_stage:      data.adoption_stage  || '',
      message:             data.message         || '',
      // Honor source from the form when present (lets dedicated landing pages
      // attribute their leads, e.g. ai_readiness_landing from /ai-readiness/).
      // Default to website_contact_form for the homepage form which has no
      // source field on the markup.
      source:              data.source || 'website_contact_form',
    };

    const url = process.env.DASHBOARD_API_URL;
    if (!url) {
      console.error('[submission-created] DASHBOARD_API_URL is not set — lead NOT forwarded:', body);
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'DASHBOARD_API_URL not set' }) };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (process.env.DASHBOARD_LEADS_SECRET) {
      headers['X-Lead-Forwarder'] = process.env.DASHBOARD_LEADS_SECRET;
    }

    const res = await fetch(`${url.replace(/\/$/, '')}/api/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[submission-created] Dashboard returned ${res.status}:`, text);
      // Still return 200 to Netlify — we don't want Netlify to retry and
      // double-submit. The submission is safely in the Netlify dashboard.
      return { statusCode: 200, body: JSON.stringify({ ok: false, dashboard_status: res.status }) };
    }

    const result = await res.json().catch(() => ({}));
    console.log(`[submission-created] Forwarded lead for ${body.email} → client_id=${result.client_id || 'unknown'}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, client_id: result.client_id }) };
  } catch (e) {
    console.error('[submission-created] Error:', e);
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
