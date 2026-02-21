/* ═══════════════════════════════════════════════
   ENERGY CONTROL — Landing Page Scripts
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Scroll reveal (IntersectionObserver) ───
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // ─── Nav scroll effect ───
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  // ─── OS-aware hero download button ───
  const heroBtn = document.querySelector('.hero-actions .btn-primary');
  if (heroBtn) {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) {
      heroBtn.href =
        'https://github.com/latenight-dev/energy-control-releases/releases/latest';
    } else if (ua.includes('mac')) {
      heroBtn.href =
        'https://github.com/latenight-dev/energy-control-releases/releases/latest';
    } else if (ua.includes('linux')) {
      heroBtn.href =
        'https://github.com/latenight-dev/energy-control-releases/releases/latest';
    } else {
      heroBtn.href = '#download';
    }
  }

  // ─── Lightweight analytics (privacy-friendly) ───
  // Sends anonymous page-view & click events to our own backend.
  // No cookies, no PII, no fingerprinting.
  const ANALYTICS_ENDPOINT = '/api/landing/events';

  /**
   * Detect the visitor's OS from their user-agent string.
   * Returns one of: windows, macos, linux, android, ios, other
   */
  function detectOS() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux') && !ua.includes('android')) return 'linux';
    if (ua.includes('android')) return 'android';
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    return 'other';
  }

  /**
   * Fire-and-forget: send an analytics event.
   */
  function trackEvent(eventName, extra) {
    try {
      const payload = {
        event: eventName,
        os: detectOS(),
        referrer: document.referrer || null,
        path: location.pathname,
        screen: window.innerWidth + 'x' + window.innerHeight,
        ts: new Date().toISOString(),
      };
      if (extra) Object.assign(payload, extra);

      // Use sendBeacon when available (works even during page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ANALYTICS_ENDPOINT, JSON.stringify(payload));
      } else {
        fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (_) {
      // Analytics should never break the page
    }
  }

  // Track page view
  trackEvent('page_view');

  // Track download clicks
  document.querySelectorAll('.download-card .btn, .download-card .btn-alt').forEach((btn) => {
    btn.addEventListener('click', function () {
      const card = this.closest('.download-card');
      const osName = card ? card.querySelector('.os-name')?.textContent?.trim() : 'unknown';
      const variant = this.classList.contains('btn-alt') ? 'alt' : 'primary';
      trackEvent('download_click', { download_os: osName.toLowerCase(), variant });
    });
  });

  // Track hero CTA click
  if (heroBtn) {
    heroBtn.addEventListener('click', function () {
      trackEvent('hero_download_click', { download_os: detectOS() });
    });
  }

  // Track nav link clicks
  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', function () {
      trackEvent('nav_click', { target: this.textContent.trim().toLowerCase() });
    });
  });

  // Track section visibility (time-on-page engagement)
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          trackEvent('section_view', { section: entry.target.id || entry.target.className.split(' ')[0] });
          sectionObserver.unobserve(entry.target); // only fire once per section
        }
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll('section[id]').forEach((el) => sectionObserver.observe(el));
})();
