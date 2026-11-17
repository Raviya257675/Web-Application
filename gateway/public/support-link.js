// Adds one unobtrusive entry point without changing the existing compiled React application.
(() => {
  if (document.getElementById('meridian-support-link')) return;
  const a = document.createElement('a');
  a.id = 'meridian-support-link';
  a.href = '/support';
  a.textContent = 'Help & feedback';
  a.setAttribute('aria-label', 'Open feedback and support');
  a.style.cssText = 'position:fixed;z-index:1000;bottom:17px;right:17px;display:block;padding:10px 15px;background:#115f9d;color:#fff;text-decoration:none;border-radius:40px;font:600 13px system-ui,sans-serif;box-shadow:0 6px 20px #142e4b44';
  document.body.appendChild(a);
})();
