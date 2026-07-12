// Lightweight cookie/privacy notice. The site uses only a strictly-necessary
// sign-in token (no tracking/advertising cookies), so this is a dismissible
// NOTICE — not a consent gate. Self-contained (inline styles), works on any page.
(function () {
  try { if (localStorage.getItem('cps_cookie_ok')) return; } catch (e) {}

  var bar = document.createElement('div');
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Cookie notice');
  bar.style.cssText = [
    'position:fixed', 'left:12px', 'right:12px', 'bottom:12px', 'z-index:9999',
    'max-width:760px', 'margin:0 auto', 'background:#0f172a', 'color:#e2e8f0',
    'border:1px solid #1e293b', 'border-radius:12px', 'padding:14px 16px',
    'box-shadow:0 12px 34px rgba(0,0,0,.28)', 'font-family:Inter,system-ui,sans-serif',
    'font-size:14px', 'display:flex', 'gap:12px', 'align-items:center', 'flex-wrap:wrap'
  ].join(';');

  var txt = document.createElement('div');
  txt.style.cssText = 'flex:1;min-width:220px;line-height:1.5';
  txt.innerHTML = 'We use only a strictly-necessary sign-in cookie to keep you logged in — ' +
    'no tracking or advertising cookies. See our ' +
    '<a href="/privacy.html" style="color:#93c5fd;text-decoration:underline">Privacy Policy</a>.';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Got it';
  btn.style.cssText = 'background:#2563eb;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:600;font-size:14px;cursor:pointer';
  btn.addEventListener('click', function () {
    try { localStorage.setItem('cps_cookie_ok', '1'); } catch (e) {}
    bar.remove();
  });

  bar.appendChild(txt);
  bar.appendChild(btn);
  function mount() { document.body.appendChild(bar); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
