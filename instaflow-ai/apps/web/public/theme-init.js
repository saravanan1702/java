// Apply the saved theme before first paint (dark-first default).
// External file (not inline) so the Content-Security-Policy can forbid inline scripts.
try {
  var t = localStorage.getItem('instaflow.theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
