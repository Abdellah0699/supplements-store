/**
 * layout.js — admin shell: sidebar, header, mobile drawer, auth guard.
 * Depends on: utils.js, admin-api.js, components.js.
 *
 * Usage on a page:
 *   const content = AdminLayout.init({
 *     active: 'dashboard',          // nav key
 *     title: 'Dashboard',           // header + document title
 *     subtitle: '…',                // page-head description (optional)                 <span class="nav-icon" aria-hidden="true">${item.icon}</span>
 *     actionsHtml: '…',            // page-head action buttons (optional)
 *     showPageHead: true,
 *   });
 *   content.innerHTML = …           // page renders into #page-content
 */
(function () {
  'use strict';

  const NAV = [
    {
      section: 'Manage',
      items: [
        { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html'},
        { key: 'orders', label: 'Orders', href: 'orders.html'},
        { key: 'products', label: 'Products', href: 'products.html'},
        { key: 'categories', label: 'Categories', href: 'categories.html',},
      ],
    },
    {
      section: 'Settings',
      items: [
        { key: 'delivery', label: 'Delivery fees', href: 'delivery.html', icon: '🚚' },
        { key: 'locations', label: 'Locations', href: 'locations.html', icon: '📍' },
      ],
    },
  ];

  function esc(v) { return window.AdminUtils.escapeHtml(v); }

  function buildSidebar(active) {
    const sections = NAV.map((s) => {
      const links = s.items
        .map((item) => {
          const isActive = item.key === active;
          return `
            <a href="${item.href}" class="admin-nav-link${isActive ? ' active' : ''}"${
            isActive ? ' aria-current="page"' : ''
          }>
              ${item.icon ? `<span class="nav-icon" aria-hidden="true">${item.icon}</span>` : ''}
              ${esc(item.label)}
            </a>`;
        })
        .join('');
      return `<div class="admin-nav-section">${esc(s.section)}</div>${links}`;
    }).join('');

    return `
      <aside class="admin-sidebar" id="admin-sidebar" aria-label="Admin navigation">
        <a class="admin-brand" href="dashboard.html">
          <span class="admin-brand-mark" aria-hidden="true">S</span>
          <span>
            <span class="admin-brand-name">Supplement Store</span>
            <span class="admin-brand-sub">Admin panel</span>
          </span>
        </a>
        <nav class="admin-nav">${sections}</nav>
        <div class="admin-sidebar-footer">
          Live data · PostgreSQL
        </div>
      </aside>`;
  }

  async function init({ active, title, subtitle, actionsHtml, showPageHead = true } = {}) {
    // Auth guard: the backend is the authority. A cached session lets us
    // render instantly; otherwise we verify with the server first.
    // (Any 401 on a later data call also bounces to the login page.)
    let session = window.AdminAPI.getSession();
    if (session) {
      window.AdminAPI.getSessionAsync().then((s) => {
        if (!s) window.location.replace('index.html');
      });
    } else {
      session = await window.AdminAPI.getSessionAsync();
      if (!session) {
        window.location.replace('index.html');
        return document.createElement('div'); // never rendered; redirect wins
      }
    }

    document.title = `${title || 'Admin'} — Store Admin`;

    const root = document.getElementById('admin-root');
    root.className = 'admin-shell';
    root.innerHTML = `
      ${buildSidebar(active)}
      <div class="admin-scrim" id="admin-scrim" aria-hidden="true"></div>
      <div class="admin-main">
        <header class="admin-header">
          <button type="button" class="admin-menu-btn" id="admin-menu-btn"
                  aria-label="Open navigation" aria-expanded="false" aria-controls="admin-sidebar">☰</button>
          <h1 class="admin-header-title">${esc(title || 'Admin')}</h1>
          <div class="admin-header-spacer"></div>
          <div class="admin-header-meta">
            <span class="meta-hide-mobile">Signed in as <strong>${esc(session.displayName || session.username)}</strong></span>
            <button type="button" class="btn btn-sm" id="admin-logout-btn">Log out</button>
          </div>
        </header>
        <main class="admin-content" id="page-content" tabindex="-1">
          ${showPageHead ? `
          <div class="page-head">
            <div>
              <h1>${esc(title || '')}</h1>
              ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
            </div>
            ${actionsHtml ? `<div class="page-head-actions">${actionsHtml}</div>` : ''}
          </div>` : ''}
          <div id="page-body"></div>
        </main>
      </div>`;

    // mobile drawer
    const menuBtn = document.getElementById('admin-menu-btn');
    const scrim = document.getElementById('admin-scrim');
    function setNav(open) {
      document.body.classList.toggle('nav-open', open);
      scrim.classList.toggle('visible', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }
    menuBtn.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
    scrim.addEventListener('click', () => setNav(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) setNav(false);
    });
    root.querySelectorAll('.admin-nav-link').forEach((a) =>
      a.addEventListener('click', () => setNav(false))
    );

    // logout
    document.getElementById('admin-logout-btn').addEventListener('click', async () => {
      const ok = await window.Components.confirm({
        title: 'Log out?',
        message: 'You will be signed out of the admin panel.',
        confirmLabel: 'Log out',
      });
      if (!ok) return;
      await window.AdminAPI.logout();
      window.location.replace('index.html');
    });

    return document.getElementById('page-body');
  }

  window.AdminLayout = { init, NAV };
})();
