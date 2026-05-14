// GA4 event tracking for prismaianalytics.com (AN-001).
//
// Wires four user-action events plus scroll-depth quartiles into the GA4 tag
// that inject-analytics.js places in <head> at build time. Everything is gated
// on `window.gtag` being defined — pages built without GA_MEASUREMENT_ID will
// silently no-op instead of throwing.
//
// Event taxonomy (matches the SEO Project Brief 2026-04-29 + IM-006 close-out):
//   hero_cta_click         — homepage hero primary CTA
//   service_card_click     — /services card click, with service_name parameter
//   lead_magnet_submit     — /ai-readiness form submit
//   contact_form_submit    — homepage contact form submit
//   scroll_depth           — fires once each at 25/50/75/100% scroll
//
// Newsletter form does not exist yet — the matching event ships when the form
// does. Called out in Marketing/SEO_Audit_2026-05-14.md.

(function () {
  'use strict';

  function track(eventName, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params || {});
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function bindClickEvents() {
    // Hero CTA + any other element annotated with data-event. The data-event
    // attribute value is used directly as the gtag event name suffix; extra
    // parameters can be supplied as data-event-* attributes.
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-event]');
      if (!el) return;
      var name = el.getAttribute('data-event');
      if (!name) return;
      var params = collectDataParams(el);
      track(name + '_click', params);
    });

    // Service cards live on /services and use the .service-card class.
    // Delegated listener avoids editing 17 card markup blocks.
    document.addEventListener('click', function (e) {
      var card = e.target.closest('.service-card');
      if (!card) return;
      // Don't double-fire if a data-event annotation already handled it.
      if (card.hasAttribute('data-event')) return;
      var nameEl = card.querySelector('.service-name');
      var serviceName = nameEl ? nameEl.textContent.trim() : 'unknown';
      track('service_card_click', { service_name: serviceName });
    });
  }

  function bindSubmitEvents() {
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-event]');
      if (!form) return;
      var name = form.getAttribute('data-event');
      if (!name) return;
      track(name, collectDataParams(form));
    });
  }

  function collectDataParams(el) {
    var params = {};
    var attrs = el.attributes;
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      if (attr.name.indexOf('data-event-') !== 0) continue;
      var key = attr.name.slice('data-event-'.length).replace(/-/g, '_');
      params[key] = attr.value;
    }
    return params;
  }

  function bindScrollDepth() {
    var thresholds = [25, 50, 75, 100];
    var fired = new Set();
    var ticking = false;

    function check() {
      ticking = false;
      var doc = document.documentElement;
      var scrollTop = window.scrollY || doc.scrollTop;
      var height = doc.scrollHeight - window.innerHeight;
      if (height <= 0) return;
      var percent = Math.min(100, Math.round((scrollTop / height) * 100));
      thresholds.forEach(function (t) {
        if (percent >= t && !fired.has(t)) {
          fired.add(t);
          track('scroll_depth', { percent: t });
        }
      });
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(check);
    }, { passive: true });

    // Catch the 100% case for pages too short to scroll.
    onReady(check);
  }

  onReady(function () {
    bindClickEvents();
    bindSubmitEvents();
    bindScrollDepth();
  });
})();
