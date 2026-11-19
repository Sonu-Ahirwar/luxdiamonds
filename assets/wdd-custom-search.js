(function () {
  'use strict';

  const SKU_MAP_URL = 'https://weddingdaycustomform.demobw.com/wdd-sku-map.json';
  let skuMap = null;
  let loadPromise = null;
  const handleCache = new Map();

  async function loadSkuMap() {
    if (skuMap) return skuMap;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const r = await fetch(SKU_MAP_URL);
      skuMap = await r.json();
      console.log('[WDD Search] SKU map loaded:', Object.keys(skuMap).length);
      return skuMap;
    })();
    return loadPromise;
  }

  function imgUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://im.lgdus.co/Jwl/${path}`;
  }

  async function getShopifyHandle(configHandle, sku) {
    const key = configHandle + '|' + sku;
    if (handleCache.has(key)) return handleCache.get(key);
    handleCache.set(key, configHandle);
    return configHandle;
  }

  function renderResult(shopifyHandle, item, container) {
    const [url_key, , name, price, img] = item;
    const href = `/products/${shopifyHandle}?new_url=${encodeURIComponent(url_key)}`;
    const imgSrc = imgUrl(img);
    const priceStr = price ? `From $${parseInt(price).toLocaleString('en-US')}` : '';

    container.innerHTML = `
      <div class="predictive-search-results__inner" data-search-results>
        <div id="predictive-search-products" class="predictive-search-results__products">
          <ul class="predictive-search-results__list predictive-search-results__wrapper predictive-search-results__wrapper-products list-unstyled" role="listbox" aria-label="Products">
            <li class="predictive-search-results__card predictive-search-results__card--product" ref="resultsItems[]">
              <div class="resource-card" data-resource-type="product">
                <a class="resource-card__link" href="${href}" aria-label="${name}"></a>
                <a class="resource-card__link test" href="${href}" tabindex="-1" aria-hidden="true"></a>
                <div class="resource-card__media" style="--resource-card-aspect-ratio:1">
                  ${imgSrc ? `<img class="resource-card__image" src="${imgSrc}" alt="${name}" loading="lazy" style="width:100%;height:100%;object-fit:contain">` : ''}
                </div>
                <div class="resource-card__content">
                  <p class="resource-card__title paragraph">${name}</p>
                  ${priceStr ? `<p class="resource-card__subtext paragraph">${priceStr}</p>` : ''}
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>`;
  }

  // ── Search Modal Enhancement ───────────────────────────────
  window.wddEnhanceSearchResults = async function(query, container) {
    if (!query || query.length < 2) return;
    const q = query.trim().toUpperCase();
    const map = await loadSkuMap();
    const item = map[q];
    if (!item) return;

    const [url_key, configHandle] = item;
    if (!url_key) return;

    const cards = container.querySelectorAll('li[ref="resultsItems[]"]');
    for (const card of cards) {
      const link = card.querySelector('a[href*="/products/"]');
      if (!link) continue;
      const match = (link.getAttribute('href') || '').match(/\/products\/([^/?#]+)/);
      if (!match) continue;
      const handle = match[1];
      if (handle.includes(configHandle)) {
        card.querySelectorAll('a').forEach(a => {
          console.log("himanshu gupta")
          if ((a.href||'').includes('/products/')) {
            console.log("handle",handle)
            const cleanHandle = handle.replace(/\./g, '-');
            console.log("cleanhandle",cleanHandle)
            a.href = `/products/${cleanHandle}?new_url=${encodeURIComponent(url_key)}`;
          }
        });
        return;
      }
    }

    if (!cards.length) {
      const shopifyHandle = await getShopifyHandle(configHandle, q);
      if (shopifyHandle) renderResult(shopifyHandle, item, container);
    }
  };

  // ── Search Results Page ────────────────────────────────────
  if (location.pathname.includes('/search')) {
    async function enhanceSearchPage() {
      const params = new URLSearchParams(location.search);
      const q = (params.get('q') || '').trim().toUpperCase();
      if (!q) return;

      // Child redirect se aaye hain
      const childSku = params.get('wdd_child');
      const childUrl = params.get('wdd_url');
      if (childSku && childUrl) {
        const map = await loadSkuMap();
        const childItem = map[childSku];
        if (!childItem) return;
        const [child_url_key, , child_name, , child_img] = childItem;
        const childImgSrc = imgUrl(child_img);

        function updateCards() {
          document.querySelectorAll('product-card').forEach(card => {
            const handle = card.dataset.handle;
            if (!handle) return;

            // 1. Sab product links update karo
            card.querySelectorAll('a[href*="/products/"]').forEach(a => {
              const href = a.getAttribute('href') || '';
              if (href.includes('/products/') && !href.includes('cdn') && !href.includes('cloudfront')) {
                a.href = `/products/${handle}?new_url=${encodeURIComponent(child_url_key)}`;
              }
            });

            // 2. Title update — sirf card_productTitle
            const titleEl = card.querySelector('a.card_productTitle');
            if (titleEl && child_name) titleEl.textContent = child_name;

            // 3. h3 title update
            const h3El = card.querySelector('.product-grid-view-zoom-out--details h3');
            if (h3El && child_name) h3El.textContent = child_name;

            // 4. Sirf main product image update — shipping icon nahi, metal swatches nahi
            if (childImgSrc) {
              const mainImg = card.querySelector('img.product-media__image');
              if (mainImg) {
                mainImg.src = childImgSrc;
                mainImg.srcset = childImgSrc + ' 900w';
                mainImg.dataset.src = childImgSrc;
                mainImg.dataset.srcset = childImgSrc + ' 900w';
              }
              // card-gallery data update
              const gallery = card.querySelector('[data-initial-media1]');
              if (gallery) {
                gallery.dataset.initialMedia1 = childImgSrc;
                gallery.dataset.wddBaseMedia1 = childImgSrc;
              }
            }
          });
        }

        setTimeout(updateCards, 300);
        setTimeout(updateCards, 1000);
        return;
      }

      // Normal SKU search — child check
      const map = await loadSkuMap();
      const item = map[q];
      if (!item) return;

      const [url_key, configHandle] = item;
      if (!url_key || !configHandle) return;

      const shopifyHandle = await getShopifyHandle(configHandle, q);
      if (!shopifyHandle) return;

      const parentSku = shopifyHandle.split('-').pop().toUpperCase();
      window.location.replace(`/search?type=product&q=${encodeURIComponent(parentSku)}&wdd_child=${encodeURIComponent(q)}&wdd_url=${encodeURIComponent(url_key)}`);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enhanceSearchPage);
    } else {
      enhanceSearchPage();
    }
  }

  setTimeout(loadSkuMap, 1000);

})();