/**
 * app.js
 * ---------------------------------------------------------
 * Two jobs:
 *  1. Site-wide chrome that every page needs: the mobile nav
 *     drawer and the header search forms.
 *  2. Homepage-only content: category strip, featured products,
 *     and the popular products grid. Guarded so this file can be
 *     safely included on every page without erroring elsewhere.
 * ---------------------------------------------------------
 */

initMobileNav();
initHeaderSearch();
initHomepage();
initHeroCarousel();

function initMobileNav() {
  const menuBtn = document.querySelector('.site-header__menu-btn');
  const nav = document.querySelector('.mobile-nav');
  if (!menuBtn || !nav) return;

  const closeBtn = nav.querySelector('.mobile-nav__close');
  const backdrop = nav.querySelector('.mobile-nav__backdrop');

  function open() {
    nav.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function initHeaderSearch() {
  const inPagesFolder = window.location.pathname.includes('/pages/');
  const searchTarget = inPagesFolder ? 'search.html' : 'pages/search.html';

  document.querySelectorAll('[data-search-form]').forEach((form) => {
    form.setAttribute('action', searchTarget);
    form.addEventListener('submit', (event) => {
      const input = form.querySelector('input[name="q"]');
      if (!input || !input.value.trim()) {
        event.preventDefault();
      }
    });
  });
}

function initHomepage() {
  const root = document.querySelector('[data-page="home"]');
  if (!root) return;

  loadCategories();
  loadFeatured();
  loadPopular();

  async function loadCategories() {
    const strip = root.querySelector('#home-category-strip');
    Categories.renderSkeletons(strip, 8);
    try {
      const categories = await API.getCategories();
      Categories.renderStrip(strip, categories);
    } catch (err) {
      strip.innerHTML = `<p class="error-state__title">${I18N.t('common.couldntLoadCategories')}</p>`;
    }
  }

  async function loadFeatured() {
    const rail = root.querySelector('#home-featured-rail');
    Products.renderSkeletons(rail, 4);
    try {
      const [featured, categories] = await Promise.all([API.getFeaturedProducts(), API.getCategories()]);
      const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, I18N.categoryName(c)]));
      Products.renderList(rail, featured, { categoryNameById, emptyMessage: I18N.t('common.noFeaturedProducts') });
    } catch (err) {
      Products.renderError(rail);
    }
  }

  async function loadPopular() {
    const grid = root.querySelector('#home-popular-grid');
    Products.renderSkeletons(grid, 8);
    try {
      const [products, categories] = await Promise.all([API.getProducts(), API.getCategories()]);
      const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, I18N.categoryName(c)]));
      Products.renderList(grid, products.slice(0, 8), { categoryNameById });
    } catch (err) {
      Products.renderError(grid);
    }
  }
}


function initHeroCarousel() {
  const root = document.getElementById('hero-carousel');
  if (!root) return;

  const track = root.querySelector('.hero-carousel__track');
  const slides = root.querySelectorAll('.hero-carousel__slide');
  const dots = root.querySelectorAll('.hero-carousel__dot');
  const AUTOPLAY_MS = 3500;      // time per slide, in milliseconds
  const SWIPE_THRESHOLD = 0.15;  // how far you must drag to change slide

  let index = 0;
  let timer = null;
  let dragging = false;
  let startX = 0;
  let deltaX = 0;

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, di) => dot.setAttribute('aria-selected', String(di === index)));
  }

  function stopAutoplay() {
    clearInterval(timer);
    timer = null;
  }

  function startAutoplay() {
    stopAutoplay();
    if (slides.length < 2) return;
    timer = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goTo(i);
      startAutoplay();
    });
  });

  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hero-carousel__dot')) return;
    dragging = true;
    startX = e.clientX;
    deltaX = 0;
    root.classList.add('is-dragging');
    track.style.transition = 'none';
    stopAutoplay();
  });

  root.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    deltaX = e.clientX - startX;
    const percent = (deltaX / root.clientWidth) * 100;
    track.style.transform = `translateX(calc(-${index * 100}% + ${percent}%))`;
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
    track.style.transition = '';
    const limit = root.clientWidth * SWIPE_THRESHOLD;
    if (deltaX > limit) goTo(index - 1);
    else if (deltaX < -limit) goTo(index + 1);
    else goTo(index);
    startAutoplay();
  }

  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  root.addEventListener('pointerleave', endDrag);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  goTo(0);
  startAutoplay();
}