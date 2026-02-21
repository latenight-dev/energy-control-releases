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

  // ─── Resolve direct-download URLs from the latest GitHub release ───
  const GH_REPO = 'latenight-dev/energy-control-releases';
  const GH_API  = `https://api.github.com/repos/${GH_REPO}/releases/latest`;
  const RELEASES_FALLBACK = `https://github.com/${GH_REPO}/releases/latest`;

  /**
   * Match a GitHub release asset to one of our named download slots.
   * Returns the slot key (e.g. 'win-setup') or null.
   */
  function classifyAsset(name) {
    const n = name.toLowerCase();
    // Windows
    if (n.endsWith('.exe') && (n.includes('setup') || n.includes('install'))) return 'win-setup';
    // macOS ARM
    if ((n.endsWith('.dmg') || n.endsWith('.zip')) && n.includes('arm64'))    return 'mac-arm64';
    // macOS Intel (dmg/zip without arm64)
    if ((n.endsWith('.dmg') || n.endsWith('.zip')) && !n.includes('arm64') && !n.includes('appimage')) return 'mac-x64';
    // Linux AppImage
    if (n.endsWith('.appimage'))                                              return 'linux-appimage';
    // Linux .deb
    if (n.endsWith('.deb'))                                                   return 'linux-deb';
    return null;
  }

  /**
   * Fetch latest release from GitHub API, resolve direct download URLs,
   * and patch every [data-asset] link + the hero CTA.
   */
  (async function resolveDownloadLinks() {
    try {
      const res  = await fetch(GH_API);
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();

      // Build a map: slot -> browser_download_url
      const urlMap = {};
      (data.assets || []).forEach(function (a) {
        const slot = classifyAsset(a.name);
        if (slot && !urlMap[slot]) urlMap[slot] = a.browser_download_url;
      });

      // Patch every card button that has a data-asset attribute
      document.querySelectorAll('[data-asset]').forEach(function (el) {
        const slot = el.getAttribute('data-asset');
        if (urlMap[slot]) el.href = urlMap[slot];
      });

      // Patch hero CTA — pick the right asset for the visitor's OS
      if (heroBtn) {
        const os = detectOS();
        let heroSlot = null;
        if (os === 'windows')                      heroSlot = 'win-setup';
        else if (os === 'macos')                   heroSlot = 'mac-arm64';
        else if (os === 'linux')                   heroSlot = 'linux-appimage';
        heroBtn.href = (heroSlot && urlMap[heroSlot]) || RELEASES_FALLBACK;
      }

      // Show version badge if available
      var tag = data.tag_name || data.name;
      if (tag) {
        var note = document.querySelector('.download-note');
        if (note) note.textContent = tag.replace(/^v/, '') + ' — Windows 10+, macOS 11+, Ubuntu 20.04+';
      }
    } catch (_) {
      // On failure the links remain pointed at the releases page (fallback)
      if (heroBtn) heroBtn.href = RELEASES_FALLBACK;
    }
  })();

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
