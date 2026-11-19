(function () {
  const ROOT = '[data-wdd-full-plp]';
  const ENGINE = '.wdd-engagement-wishlist-engine';
  const ACTIVE_COLOR = '#c47881';
  const LOCAL_PREFIX = 'wdd_engagement_wishlist_active_';
  const PENDING_MS = 15000;
  const pending = new Map();

  function refreshHeaderWishlistCount() {
    try {
      document.dispatchEvent(new CustomEvent('wishlist:updated'));
      document.dispatchEvent(new CustomEvent('wdd:engagement-wishlist-updated'));
      if (typeof window.updateHeaderWishlistCount === 'function') {
        setTimeout(() => window.updateHeaderWishlistCount(), 60);
        setTimeout(() => window.updateHeaderWishlistCount(), 450);
      }
    } catch (e) {}
  }

  function getWishlistCustomerId() {
    if (window.__CUSTOMER_ID__) return String(window.__CUSTOMER_ID__);
    let id = localStorage.getItem('wishlist_browser_id');
    if (!id) {
      id = 'browser_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('wishlist_browser_id', id);
    }
    return id;
  }

  function getProductId(engine) {
    return engine && (
      engine.dataset.product_id ||
      engine.dataset.productId ||
      engine.getAttribute('data-product_id') ||
      engine.getAttribute('data-product-id') ||
      ''
    );
  }

  function storageKey(productId) {
    return LOCAL_PREFIX + getWishlistCustomerId() + '_' + String(productId || '');
  }

  function getLocalState(productId) {
    try {
      const raw = localStorage.getItem(storageKey(productId));
      if (!raw) return null;
      const data = JSON.parse(raw);
      return typeof data.active === 'boolean' ? data : null;
    } catch (e) { return null; }
  }

  function setLocalState(productId, active) {
    try { localStorage.setItem(storageKey(productId), JSON.stringify({ active: !!active, t: Date.now() })); } catch (e) {}
  }

  function parseMoney(value) {
    const n = Number(String(value || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function parseMetafields(engine) {
    try { return JSON.parse(engine.dataset.metafields || '{}'); } catch (e) { return {}; }
  }

  function enginesByProductId(productId) {
    return Array.from(document.querySelectorAll(`${ROOT} ${ENGINE}`)).filter(el => getProductId(el) === String(productId));
  }

  function forceIconSize(engine) {
    if (!engine) return;
    engine.style.width = '32px';
    engine.style.height = '32px';
    engine.style.minWidth = '32px';
    engine.style.minHeight = '32px';
    engine.style.maxWidth = '32px';
    engine.style.maxHeight = '32px';
    engine.style.display = 'inline-flex';
    engine.style.alignItems = 'center';
    engine.style.justifyContent = 'center';
    engine.style.cursor = 'pointer';
    engine.querySelectorAll('svg').forEach(svg => {
      svg.setAttribute('width', '22');
      svg.setAttribute('height', '22');
      Object.assign(svg.style, { width: '22px', height: '22px', minWidth: '22px', minHeight: '22px', maxWidth: '22px', maxHeight: '22px', display: 'block' });
    });
    engine.querySelectorAll('i').forEach(icon => {
      Object.assign(icon.style, { fontSize: '22px', lineHeight: '22px', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' });
    });
  }

  function setHeartUi(productId, active) {
    enginesByProductId(productId).forEach(engine => {
      engine.dataset.wishlistActive = active ? 'true' : 'false';
      engine.classList.toggle('is-active', !!active);
      engine.classList.toggle('active', !!active);
      engine.setAttribute('aria-pressed', active ? 'true' : 'false');
      forceIconSize(engine);
      engine.querySelectorAll('svg').forEach(svg => {
        svg.style.fill = active ? ACTIVE_COLOR : 'none';
        svg.style.stroke = active ? ACTIVE_COLOR : 'currentColor';
      });
      engine.querySelectorAll('svg path').forEach(path => {
        path.style.fill = active ? ACTIVE_COLOR : 'none';
        path.style.stroke = active ? ACTIVE_COLOR : 'currentColor';
      });
      engine.querySelectorAll('i').forEach(icon => { icon.style.color = active ? ACTIVE_COLOR : ''; });
    });
  }

  function refreshEngineFromCard(engine) {
    const card = engine.closest('.wdd-card');
    if (!card) return;
    const title = card.querySelector('.wdd-card__title a, .wdd-card__title');
    const link = card.querySelector('.wdd-card__title a, .wdd-card__media');
    const img = card.querySelector('.wdd-card__img--primary, img');
    const priceEl = card.querySelector('.js-card-price, [data-price-wrap] .price, .wdd-card__price');

    if (title && title.textContent.trim()) engine.dataset.title = title.textContent.trim();
    if (link && link.getAttribute('href')) engine.dataset.url = link.getAttribute('href');
    if (img && (img.currentSrc || img.src)) engine.dataset.image = img.currentSrc || img.src;

    const price = parseMoney(engine.dataset.rawPrice) || parseMoney(engine.dataset.amount) || parseMoney(engine.dataset.price) || parseMoney(priceEl && priceEl.textContent);
    if (price > 0) {
      engine.dataset.rawPrice = String(price);
      engine.dataset.amount = String(price);
      engine.dataset.price = String(price);
    }
  }

  function getCurrentPrice(engine) {
    refreshEngineFromCard(engine);
    const price = parseMoney(engine.dataset.rawPrice) || parseMoney(engine.dataset.amount) || parseMoney(engine.dataset.price);
    return price > 0 ? price : 0;
  }

  function buildPayload(engine) {
    refreshEngineFromCard(engine);
    const productId = getProductId(engine);
    const handle = engine.dataset.product_handle || engine.dataset.productHandle || '';
    return {
      customerId: getWishlistCustomerId(),
      productId: productId,
      productHandle: handle,
      snapshot: {
        id: productId,
        handle: handle,
        title: engine.dataset.title || '',
        url: engine.dataset.url || '',
        image: engine.dataset.image || '',
        price: getCurrentPrice(engine),
        sku: engine.dataset.sku || '',
        variant_id: engine.dataset.variant_id || engine.dataset.variantId || '',
        metafields_data: parseMetafields(engine)
      }
    };
  }

  async function checkWishlist(productId) {
    const url = new URL('/apps/custom-forms/wishlist/check', window.location.origin);
    url.searchParams.set('customerId', getWishlistCustomerId());
    url.searchParams.set('productId', productId);
    const res = await fetch(url.toString(), { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    return !!(data && data.success && data.exists);
  }

  async function addWishlist(engine) {
    const productId = getProductId(engine);
    setLocalState(productId, true);
    pending.set(productId, Date.now());
    setHeartUi(productId, true);
    const payload = buildPayload(engine);
    const res = await fetch('/apps/custom-forms/wishlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!(res.ok && data.success)) console.warn('[WDD wishlist] add error:', data);
    refreshHeaderWishlistCount();
  }

  async function removeWishlist(engine) {
    const productId = getProductId(engine);
    setLocalState(productId, false);
    pending.set(productId, Date.now());
    setHeartUi(productId, false);
    const res = await fetch('/apps/custom-forms/wishlist/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: getWishlistCustomerId(), productId: productId })
    });
    const data = await res.json().catch(() => ({}));
    if (!(res.ok && data.success)) console.warn('[WDD wishlist] remove error:', data);
    refreshHeaderWishlistCount();
  }

  async function toggleWishlist(engine) {
    const productId = getProductId(engine);
    if (!productId || engine.dataset.wishlistBusy === 'true') return;
    engine.dataset.wishlistBusy = 'true';
    try {
      const local = getLocalState(productId);
      const activeNow = local ? !!local.active : engine.classList.contains('is-active') || engine.dataset.wishlistActive === 'true';
      if (activeNow) await removeWishlist(engine);
      else await addWishlist(engine);
      refreshHeaderWishlistCount();
    } finally {
      setTimeout(() => { engine.dataset.wishlistBusy = 'false'; }, 250);
    }
  }

  function syncOne(engine, index) {
    const productId = getProductId(engine);
    if (!productId) return;
    forceIconSize(engine);
    refreshEngineFromCard(engine);
    const local = getLocalState(productId);
    if (local) {
      setHeartUi(productId, local.active);
      // User ne isi browser me add kiya hai to revisit par heart filled hi rahe.
      // Server check kabhi-kabhi late/false aa jata hai, isliye local active ko override nahi karte.
      if (local.active === true) return;
    }
    setTimeout(async () => {
      const latestLocal = getLocalState(productId);
      const lastPending = pending.get(productId) || (latestLocal && latestLocal.t) || 0;
      if (Date.now() - lastPending < PENDING_MS) return;
      try {
        const exists = await checkWishlist(productId);
        const freshLocal = getLocalState(productId);
        if (freshLocal && freshLocal.active === true) { setHeartUi(productId, true); return; }
        if (freshLocal && Date.now() - freshLocal.t < PENDING_MS) return;
        setLocalState(productId, exists);
        setHeartUi(productId, exists);
      } catch (e) {}
    }, 250 + (index || 0) * 40);
  }

  function bind(scope) {
    const root = scope && scope.querySelector ? scope : document;
    root.querySelectorAll(`${ROOT} ${ENGINE}`).forEach((engine, index) => {
      forceIconSize(engine);
      refreshEngineFromCard(engine);
      if (engine.dataset.wddEngagementWishlistBound !== 'true') {
        engine.dataset.wddEngagementWishlistBound = 'true';
        engine.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          toggleWishlist(engine);
        }, true);
      }
      syncOne(engine, index);
    });
  }

  document.addEventListener('DOMContentLoaded', () => bind(document));
  document.addEventListener('shopify:section:load', e => bind(e.target));
  document.addEventListener('wdd:plp-rendered', () => bind(document));
  document.addEventListener('wdd:card-updated', e => bind(e.target || document));

  const observer = new MutationObserver(mutations => {
    let found = false;
    for (const m of mutations) {
      if ([...m.addedNodes].some(n => n.nodeType === 1 && (n.matches?.(`${ROOT} ${ENGINE}`) || n.querySelector?.(`${ROOT} ${ENGINE}`)))) {
        found = true;
        break;
      }
    }
    if (found) bind(document);
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
})();
