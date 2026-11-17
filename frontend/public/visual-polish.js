/* Optional visual enhancement only. Does not modify routing, business data, forms or APIs. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealObserver = (!reducedMotion && 'IntersectionObserver' in window) ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('polish-reveal--shown');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px 25px 0px' }) : null;

  function enhance() {
    const lpPanel = document.querySelector('.lp-hero .lp-panel');
    if (lpPanel && !lpPanel.querySelector('.polish-healthcare-art') && !document.querySelector('.hero-visual')) {
      const illustration = document.createElement('img');
      illustration.className = 'polish-healthcare-art';
      illustration.src = '/visuals/healthcare-team.svg';
      illustration.alt = '';
      illustration.setAttribute('aria-hidden', 'true');
      illustration.width = 920;
      illustration.height = 470;
      lpPanel.prepend(illustration);
    }

    const aside = document.querySelector('.auth__aside');
    if (aside && !aside.querySelector('.auth-illustration') && !aside.querySelector('.polish-auth-decoration')) {
      const illustration = document.createElement('div');
      illustration.className = 'polish-auth-decoration';
      illustration.setAttribute('aria-hidden', 'true');
      const intro = aside.querySelector('ul.auth__aside-list');
      if (intro) aside.insertBefore(illustration, intro);
    }

    if (revealObserver) {
      document.querySelectorAll('.lp-section__head, .lp-card, .lp-role, .lp-step, .lp-stat, .hospital-purpose > div, .contact-grid > div, .lp-final__inner > div').forEach(el => {
        if (el.dataset.polishObserved) return;
        el.dataset.polishObserved = '1';
        el.classList.add('polish-reveal');
        revealObserver.observe(el);
      });
    }
  }

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; enhance(); });
  }
  document.addEventListener('DOMContentLoaded', () => {
    enhance();
    const root = document.getElementById('root');
    if (root) new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  });

  document.addEventListener('pointerdown', event => {
    if (reducedMotion) return;
    const btn = event.target.closest?.('.btn');
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'polish-ripple';
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    ripple.style.width = ripple.style.height = '42px';
    btn.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }, { passive: true });
})();
