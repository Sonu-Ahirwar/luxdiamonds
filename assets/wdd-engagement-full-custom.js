(() => {
  const root = document.querySelector('[data-wdd-full-plp]');
  if (!root) return;

  const CDN_MEDIA_PREFIX = 'https://im.lgdus.co/Jwl/';
  const cfg = {
    handle: root.dataset.collectionHandle || 'engagement-rings',
    perPage: Math.max(1, Number(root.dataset.productsPerPage || 28)),
    skuView: root.dataset.skuView || '',
    moneyFormat: root.dataset.moneyFormat || '${{amount}}'
  };

  const CACHE_KEY = `wdd_engagement_plp_${cfg.handle}_v59`; // v57: complete carat/collection option cache + speed safe
  const CACHE_TTL = 30 * 60 * 1000;
  const SKU_LOCAL_CACHE_PREFIX = `wdd_sku_payload_${cfg.skuView}_${cfg.handle}_`;
  const SKU_LOCAL_CACHE_TTL = 24 * 60 * 60 * 1000;
  const FILTER_OPTION_CACHE_KEY = `wdd_filter_options_${cfg.handle}_v58`;
  const FILTER_OPTION_CACHE_TTL = 24 * 60 * 60 * 1000;
  let filterOptionSaveTimer = null;

  const els = {
    grid: root.querySelector('[data-wdd-grid]'), status: root.querySelector('[data-wdd-status]'), count: root.querySelector('[data-wdd-count]'),
    loadMore: root.querySelector('[data-wdd-load-more]'), sort: root.querySelector('[data-wdd-sort]'), filters: root.querySelector('[data-wdd-filters]'),
    clear: root.querySelector('[data-wdd-clear]'), active: root.querySelector('[data-wdd-active-filters]'), shapeBox: root.querySelector('[data-filter-options="shape"]'),
    metalBox: root.querySelector('[data-filter-options="metal"]'), caratBox: root.querySelector('[data-filter-options="carat"]'), styleBox: root.querySelector('[data-filter-options="style"]'), collectionBox: root.querySelector('[data-filter-options="collection"]'), quickShipBox: root.querySelector('[data-filter-options="quick_ship"]'), priceMin: root.querySelector('[data-price-min]'), priceMax: root.querySelector('[data-price-max]'), priceMinLabel: root.querySelector('[data-price-min-label]'), priceMaxLabel: root.querySelector('[data-price-max-label]'),
    priceApply: root.querySelector('[data-price-apply]'), filterToggle: root.querySelector('[data-wdd-filter-toggle]')
  };


  const state = { products: [], cards: [], filtered: [], shown: 0, filters: { shape: new Set(), metal: new Set(), carat: new Set(), style: new Set(), collection: new Set(), quick_ship: new Set(), priceMin: null, priceMax: null }, collectionOptions: { shape: [], metal: [], carat: [], style: [], collection: [], quick_ship: [] }, styleImages: {}, skuCache: new Map(), skuPromises: new Map(), loadingSku: new Set(), renderTimer: null, filterHydratePromise: null, backgroundSkuPromise: null, filterRunId: 0, backSnapshotProtectedUntil: 0 };
  const norm = (v) => String(v ?? '').trim();
  const key = (v) => norm(v).toLowerCase().replace(/&amp;/g,'&').replace(/[\s_-]+/g, ' ');
  const handleize = (v) => key(v).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const uniq = (arr) => [...new Set(arr.flatMap(v => Array.isArray(v) ? v : splitVals(v)).map(norm).filter(Boolean))];

  function filterSetHas(type, value) {
    const set = state.filters[type];
    if (!set) return false;
    const wantKey = type === 'style' ? styleKey(value) : (type === 'metal' ? metalKey(value) : key(value));
    const wantHandle = handleize(value);
    return [...set].some(v => {
      const vk = type === 'style' ? styleKey(v) : (type === 'metal' ? metalKey(v) : key(v));
      return vk === wantKey || handleize(v) === wantHandle;
    });
  }
  function filterSetDelete(type, value) {
    const set = state.filters[type];
    if (!set) return;
    const wantKey = type === 'style' ? styleKey(value) : (type === 'metal' ? metalKey(value) : key(value));
    const wantHandle = handleize(value);
    [...set].forEach(v => {
      const vk = type === 'style' ? styleKey(v) : (type === 'metal' ? metalKey(v) : key(v));
      if (vk === wantKey || handleize(v) === wantHandle) set.delete(v);
    });
  }
  function filterSetAdd(type, value) {
    const set = state.filters[type];
    if (!set || !norm(value)) return;
    filterSetDelete(type, value);
    set.add(value);
  }

  

  const orderedShapes = ['oval', 'round', 'marquise', 'long cushion', 'emerald', 'pear', 'radiant', 'princess', 'asscher', 'cushion'];
  const orderedMetals = ['white','yellow','rose','platinum'];
  const orderedStyles = ['solitaire','hidden accent','nature','celtic','halo','three stone','side stone','vintage','modern','luxury'];
  const defaultFilterOptions = {
    shape: ["Oval", "Round", "Marquise", "Elongated Cushion", "Emerald", "Pear", "Radiant", "Princess", "Asscher", "Cushion"],
    metal: ['White Gold','Yellow Gold','Rose Gold','Platinum'],
    style: ['Solitaire','Hidden Accent','Nature','Celtic','Halo','Three Stone','Side Stone','Vintage','Modern','Luxury']
  };

  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const escapeAttr = (s) => escapeHtml(s).replace(/'/g, '&#39;');
  const pick = (obj, names) => {
    if (!obj) return '';
    for (const n of names) {
      if (obj[n] !== undefined && obj[n] !== null && String(obj[n]).trim() !== '') return obj[n];
      const found = Object.keys(obj).find(k => k.toLowerCase() === n.toLowerCase());
      if (found && obj[found] !== undefined && obj[found] !== null && String(obj[found]).trim() !== '') return obj[found];
    }
    return '';
  };

  const skuShape = (s) => pick(s, ['center_stone_shape','center_stone_shape_filter','shape','shape_filter','diamond_shape','diamond_shape_filter','center_shape','stone_shape','stone_shape_filter','Shape']);
  const skuMetal = (s) => pick(s, ['metal_color','metal_color_filter','metal','metal_filter','metal_type','metal_type_filter','Metal']);
  const skuTitle = (s) => pick(s, ['pdp_name','product_name','product_title','title','name','sku_name']);
  const skuName = (s) => pick(s, ['name','pdp_name','product_name','product_title','title']);
  const skuRowNameOnly = (s) => pick(s, ['name','Name']);
  const skuUrlKey = (s) => pick(s, ['url_key','new_url','product_url','url']);
  const skuCarat = (s) => pick(s, ['center_stone_size_filter','center_stone_carat_weight','diamond_carat_weight','carat','carat_weight']);
  const skuStyle = (s) => pick(s, ['style_filter','style','product_style','ring_style','ring_style_filter','setting_style','setting_style_filter','style_name','style_filter_name','filter_style','filter_styles','product_style_filter']);
  const skuCollection = (s) => pick(s, ['collection_filter','collection','product_collection','collection_name','collection_item','collection_items']);
  const skuQuickShip = (s) => pick(s, ['quick_ship','quickship','quick_ship_filter','shipping','shipping_filter','ships_fast']);
  const skuBadgeName = (s) => pick(s, ['card_badge_name','badge_name','product_badge','tag','plp_tag','label']);
  const skuBadgeType = (s) => pick(s, ['badge_design_type','badge_type','label_type']);
  const skuGemstone = (s) => pick(s, ['gemstone_type','gemstone_type_filter','stone_type']);
  const skuPriceRaw = (s) => pick(s, ['price','regular_price','product_price']);
  const skuSpecialRaw = (s) => pick(s, ['special_price','discount','discount_percentage']);
  const skuRank = (s) => Number(pick(s, ['product_rank_category','rank','sort_order']) || 999999);
  const skuShow = (s) => key(pick(s, ['show_on_plp','plp','show'])) === 'yes';
  const rowSku = (s) => norm(pick(s, ['sku','SKU','variant_sku']));
  function tagBadge(tags) {
    const arr = Array.isArray(tags) ? tags : splitVals(tags);
    return arr.find(t => ['top pick','new style'].includes(key(t))) || '';
  }
  function tagQuickShip(tags) {
    const arr = Array.isArray(tags) ? tags : splitVals(tags);
    return arr.some(t => key(t).includes('quick') && key(t).includes('ship'));
  }

  function metalLabel(v) {
    const k = key(v);
    if (k.includes('yellow')) return 'Yellow Gold';
    if (k.includes('white')) return 'White Gold';
    if (k.includes('rose')) return 'Rose Gold';
    if (k.includes('platinum')) return 'Platinum';
    return norm(v);
  }
  function metalKey(v) {
    return key(metalLabel(v));
  }
  function metalClass(v) {
    const k = metalKey(v).replace(/\s+/g, '-');
    return k ? `metal-swatch--${k}` : 'metal-swatch--default';
  }

function moneyFromDollars(value) {
  const n = Number(String(value || 0).replace(/[^0-9.]/g, '')) || 0;

  const amount = n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return cfg.moneyFormat
    .replace(/\{\{\s*amount_no_decimals\s*\}\}/, amount)
    .replace(/\{\{\s*amount\s*\}\}/, amount);
}
console.log(cfg.moneyFormat);
  function rowPrice(row, fallbackDollars) {
    const base = Number(String(skuPriceRaw(row) || fallbackDollars || 0).replace(/[^0-9.]/g, '')) || 0;
    const sp = Number(String(skuSpecialRaw(row) || '').replace(/[^0-9.]/g, '')) || 0;
    if (sp > 0 && sp <= 100 && base > 0) return { compare: base, final: Math.round((base - (base * sp / 100)) * 100) / 100 };
    if (sp > 100 && sp < base) return { compare: base, final: sp };
    return { compare: null, final: base };
  }
  function mediaUrl(row, hover = false, fallback = '') {
    const fields = hover ? ['hover_image1','hover_image','media2','image2'] : ['media1','image','image_url','featured_image','plp_image'];
    let v = norm(pick(row, fields));
    if (!v) return fallback || '';
    if (/^https?:\/\//i.test(v) || v.startsWith('//')) return v;
    return CDN_MEDIA_PREFIX + v.replace(/^\/+/, '');
  }
  function rowUrl(card, row) {
    const parent = norm(card.parentHandle) || card.handle;
    const v = norm(skuUrlKey(row));
    if (!v) return `/products/${parent}`;
    if (v.startsWith('/')) return v;
    if (/^https?:\/\//i.test(v)) return v;
    return `/products/${parent}?new_url=${encodeURIComponent(v)}`;
  }

  async function fetchCollectionProducts() {
    const fetchPage = async (url, attempt = 0) => {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.status === 429) {
        if (attempt < 3) {
          const wait = Number(res.headers.get('Retry-After') || 1) * 1000;
          await new Promise(r => setTimeout(r, Math.min(wait, 3000)));
          return fetchPage(url, attempt + 1);
        }
        throw new Error('Rate limited');
      }
      if (!res.ok) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
          return fetchPage(url, attempt + 1);
        }
        throw new Error(`Products JSON failed: ${res.status}`);
      }
      return res;
    };
    const all = [];
    for (let page = 1; page < 50; page++) {
      const res = await fetchPage(`/collections/${encodeURIComponent(cfg.handle)}/products.json?limit=250&page=${page}`);
      const products = (await res.json()).products || [];
      all.push(...products);
      if (products.length < 250) break;
    }
    return all;
  }
  function baseCard(product) {
    const variant = product.variants && product.variants[0] ? product.variants[0] : {};
    const img = product.images && product.images[0] ? product.images[0].src : '';
    return { product, handle: product.handle, productId: product.id, variantId: variant.id || '', parentHandle: '', baseTitle: product.title, defaultProductName: product.title, defaultRowName: '', defaultSku: norm(variant.sku), defaultMetal: '', defaultShape: '', title: product.title, url: `/products/${product.handle}`, image: img, hoverImage: '', priceFinal: Number(variant.price || 0), priceCompare: null, shapes: new Set(), metals: new Set(), carats: new Set(), styles: new Set(), collections: new Set(), quickShips: new Set(), styleKeys: new Set(), badges: [], cardBadgeName: tagBadge(product.tags), badgeDesignType: '', quickShip: tagQuickShip(product.tags), sku: [], selectedShape: '', selectedMetal: '', ready: false, userSelected: false, currentRow: null };
  }

  function skuLocalCacheKey(handle) {
    return SKU_LOCAL_CACHE_PREFIX + String(handle || '').replace(/[^a-z0-9_-]/gi, '_');
  }
  function readSkuLocalCache(handle) {
    try {
      const raw = localStorage.getItem(skuLocalCacheKey(handle));
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || !cached.t || Date.now() - cached.t > SKU_LOCAL_CACHE_TTL) return null;
      if (!cached.payload || !Array.isArray(cached.payload.items)) return null;
      return cached.payload;
    } catch (e) { return null; }
  }
  function writeSkuLocalCache(handle, payload) {
    try {
      if (!payload || !Array.isArray(payload.items) || !payload.items.length) return;
      localStorage.setItem(skuLocalCacheKey(handle), JSON.stringify({ t: Date.now(), payload }));
    } catch (e) { /* localStorage can be full/private */ }
  }

  async function fetchSku(card) {
    if (state.skuCache.has(card.handle)) return state.skuCache.get(card.handle);
    const localPayload = readSkuLocalCache(card.handle);
    if (localPayload) {
      state.skuCache.set(card.handle, localPayload);
      return localPayload;
    }
    if (state.skuPromises.has(card.handle)) return state.skuPromises.get(card.handle);

    const promise = (async () => {
      state.loadingSku.add(card.handle);
      try {
        let res, delay = 300;
        for (let attempt = 0; attempt < 4; attempt++) {
          res = await fetch(`/products/${card.handle}?view=${encodeURIComponent(cfg.skuView)}`, { credentials: 'same-origin' });
          if (res.status !== 429) break;
          const wait = Number(res.headers.get('Retry-After') || 0) * 1000 || delay;
          await new Promise(r => setTimeout(r, Math.min(wait, 2000)));
          delay = Math.min(delay * 2, 2000);
        }
        if (!res.ok) throw new Error(`SKU JSON failed: ${res.status}`);
        const data = await res.json();
        const payload = Array.isArray(data) ? { product: {}, items: data } : { product: data.product || {}, items: data.items || data.skus || [] };
        state.skuCache.set(card.handle, payload);
        writeSkuLocalCache(card.handle, payload);
        return payload;
      } catch (e) {
        console.warn('[WDD PLP] SKU load failed for', card.handle, e);
        const payload = { product: {}, items: [] };
        state.skuCache.set(card.handle, payload);
        writeSkuLocalCache(card.handle, payload);
        return payload;
      } finally {
        state.loadingSku.delete(card.handle);
        state.skuPromises.delete(card.handle);
      }
    })();

    state.skuPromises.set(card.handle, promise);
    return promise;
  }
  function splitVals(v) {
    if (Array.isArray(v)) return v.flatMap(splitVals);
    if (v && typeof v === 'object') return Object.values(v).flatMap(splitVals);
    return String(v ?? '').split(/[,|]/).map(x => x.trim()).filter(Boolean);
  }
  function readFilterOptionCache() {
    try {
      const raw = localStorage.getItem(FILTER_OPTION_CACHE_KEY);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || !payload.t || Date.now() - payload.t > FILTER_OPTION_CACHE_TTL) return null;
      return payload.options || null;
    } catch (e) { return null; }
  }
  function mergeFilterOptionValues(type, values) {
    if (!state.collectionOptions[type]) state.collectionOptions[type] = [];
    const incoming = uniq(values).filter(Boolean);
    if (!incoming.length) return;
    const existingKeys = new Set(state.collectionOptions[type].map(v => type === 'style' ? styleKey(v) : (type === 'metal' ? metalKey(v) : key(v))));
    incoming.forEach(v => {
      const k = type === 'style' ? styleKey(v) : (type === 'metal' ? metalKey(v) : key(v));
      if (k && !existingKeys.has(k)) {
        state.collectionOptions[type].push(v);
        existingKeys.add(k);
      }
    });
  }
  function mergeCachedFilterOptions(options) {
    if (!options || typeof options !== 'object') return;
    ['shape','metal','carat','style','collection','quick_ship'].forEach(type => {
      mergeFilterOptionValues(type, options[type] || []);
    });
  }
  function saveFilterOptionsSoon() {
    clearTimeout(filterOptionSaveTimer);
    filterOptionSaveTimer = setTimeout(() => {
      try {
        const payload = { t: Date.now(), options: state.collectionOptions };
        localStorage.setItem(FILTER_OPTION_CACHE_KEY, JSON.stringify(payload));
      } catch (e) { /* localStorage may be full/private */ }
    }, 250);
  }
  function updateGlobalFilterOptionsFromCard(card) {
    if (!card) return;
    mergeFilterOptionValues('shape', [...(card.shapes || [])]);
    mergeFilterOptionValues('metal', [...(card.metals || [])].map(metalLabel));
    mergeFilterOptionValues('carat', [...(card.carats || [])]);
    mergeFilterOptionValues('style', [...(card.styles || [])].map(styleLabel));
    mergeFilterOptionValues('collection', [...(card.collections || [])]);
    if (card.quickShip || (card.quickShips && card.quickShips.size)) mergeFilterOptionValues('quick_ship', ['Quick Ship']);
    saveFilterOptionsSoon();
  }

  function readCollectionFilterOptions() {
    const node = root.querySelector('[data-wdd-collection-filters-json]');
    if (!node) return;
    try {
      const data = JSON.parse(node.textContent || '{}');
      // Old theme keeps filter icons in shop.metafields.custom.filter_style_images_data.
      // Section outputs those real file_url values here so JS never guesses /cdn/shop/files/*.png.
      state.styleImages = {};
      const rawStyleImages = data.style_images || data.styleImages || data.style_icons || {};
      if (rawStyleImages && typeof rawStyleImages === 'object') {
        Object.keys(rawStyleImages).forEach(k => {
          const val = norm(rawStyleImages[k]);
          if (!val) return;
          state.styleImages[handleize(k)] = val;
          state.styleImages[styleKey(k)] = val;
        });
      }
      const buckets = [data, data.filters, data.filter_options, data.options].filter(Boolean);
      const aliases = {
        shape: ['shape','shapes','center_stone_shape','diamond_shape','shape_filter','filter_shape','filter_shapes','center_stone_shape_filter'],
        metal: ['metal','metals','metal_color','metal_type','metal_filter','filter_metal','filter_metals','metal_color_filter'],
        carat: ['carat','carats','center_stone_size_filter','center_stone_carat_weight','diamond_carat_weight'],
        style: ['style','styles','style_filter','product_style','filter_style','filter_styles','ring_style'],
        collection: ['collection','collections','collection_filter','collection_name','product_collection','collection_item','collection_items'],
        quick_ship: ['quick_ship','quickship','quick_ship_filter','shipping','ships_fast']
      };
      for (const type of Object.keys(aliases)) {
        const vals = [];
        for (const bucket of buckets) {
          if (!bucket || typeof bucket !== 'object') continue;
          for (const a of aliases[type]) {
            if (bucket[a] !== undefined) vals.push(bucket[a]);
            const found = Object.keys(bucket).find(k => key(k) === key(a));
            if (found && bucket[found] !== undefined) vals.push(bucket[found]);
          }
        }
        state.collectionOptions[type] = type === 'style' ? uniq(vals.map(registerStyleOption)) : uniq(vals);
      }
      // Render the main visual filters immediately, before product/SKU JSON finishes loading.
      ['shape','metal','style'].forEach(type => {
        if (!state.collectionOptions[type] || !state.collectionOptions[type].length) {
          state.collectionOptions[type] = [...(defaultFilterOptions[type] || [])];
        }
      });
      mergeCachedFilterOptions(readFilterOptionCache());
    } catch (e) {
      ['shape','metal','style'].forEach(type => {
        if (!state.collectionOptions[type] || !state.collectionOptions[type].length) {
          state.collectionOptions[type] = [...(defaultFilterOptions[type] || [])];
        }
      });
      mergeCachedFilterOptions(readFilterOptionCache());
      console.warn('[WDD PLP] collection filter metafield JSON invalid', e);
    }
  }
  function isTruthy(v) {
    const k = key(v);
    return !!k && !['no','false','0','none','blank','n/a'].includes(k);
  }
  function fieldHas(row, getter, selectedSet) {
    if (!selectedSet || selectedSet.size === 0) return true;
    const rowVals = splitVals(getter(row)).map(key).filter(Boolean);
    return [...selectedSet].some(want => {
      const wk = key(want);
      if (!wk) return false;
      return rowVals.includes(wk) || rowVals.some(rv => rv.includes(wk) || wk.includes(rv));
    });
  }
  function optionLabel(v) {
    if (v && typeof v === 'object') return norm(v.label || v.name || v.value || v.title || '');
    return norm(v);
  }
  function optionImage(v) {
    if (v && typeof v === 'object') return norm(v.image || v.icon || v.src || v.url || '');
    return '';
  }
  function registerStyleOption(v) {
    const label = optionLabel(v);
    const img = optionImage(v);
    if (label && img) state.styleImages[handleize(label)] = img;
    return label;
  }
  function lowestSize(rows) {
    const withSize = rows.filter(r => Number(String(pick(r, ['center_stone_size_filter','center_stone_carat_weight','carat']) || '').replace(/[^0-9.]/g, '')) > 0);
    if (!withSize.length) return rows[0] || null;
    return withSize.reduce((a,b) => {
      const na = Number(String(pick(a, ['center_stone_size_filter','center_stone_carat_weight','carat']) || '').replace(/[^0-9.]/g, '')) || 999999;
      const nb = Number(String(pick(b, ['center_stone_size_filter','center_stone_carat_weight','carat']) || '').replace(/[^0-9.]/g, '')) || 999999;
      return nb < na ? b : a;
    });
  }
  function defaultNameRows(card, rows) {
    // IMPORTANT for PLP clones:
    // Use JSON row.name as the card identity. Do NOT use pdp_title for this grouping.
    // Some product handles contain multiple PLP rows/products. A style from another row
    // under the same handle must not make the current card pass the style filter.
    const wantRowName = key(card.defaultRowName || '');
    if (wantRowName) {
      const byExactName = rows.filter(r => key(skuRowNameOnly(r)) === wantRowName || handleize(skuRowNameOnly(r)) === handleize(wantRowName));
      if (byExactName.length) return byExactName;
    }

    // Fallback only for cards not yet fully hydrated / older cache.
    const wantName = key(card.defaultProductName || card.baseTitle || '');
    if (!wantName) return rows;
    const byName = rows.filter(r => key(skuRowNameOnly(r)) === wantName || handleize(skuRowNameOnly(r)) === handleize(wantName));
    return byName.length ? byName : rows;
  }
  function styleRowsForCurrentCard(card) {
    if (!card || !card.sku || !card.sku.length) return [];
    return defaultNameRows(card, card.sku);
  }
  function rowHasStyle(row, want) {
    const wk = styleKey(want);
    if (!wk) return true;
    const vals = splitVals(skuStyle(row));
    return vals.some(v => styleKey(v) === wk || sameValue(v, want));
  }
  function chooseRow(card, opts = {}) {
    if (!card.sku.length) return null;
    const includeGlobal = opts.includeGlobal !== false;
    const wantShape = norm(opts.shape ?? card.selectedShape ?? card.defaultShape);
    const wantMetal = norm(opts.metal ?? card.selectedMetal ?? card.defaultMetal);
    let rows = [...card.sku];

    rows = defaultNameRows(card, rows);

    if (includeGlobal && state.filters.metal.size) {
      const byMetal = rows.filter(r => [...state.filters.metal].some(v => metalKey(skuMetal(r)) === metalKey(v)));
      if (byMetal.length) rows = byMetal;
    } else if (wantMetal) {
      const byMetal = rows.filter(r => metalKey(skuMetal(r)) === metalKey(wantMetal));
      if (byMetal.length) rows = byMetal;
    }

    if (includeGlobal && state.filters.shape.size) {
      const byShape = rows.filter(r => [...state.filters.shape].some(v => key(skuShape(r)) === key(v)));
      if (byShape.length) rows = byShape;
    } else if (wantShape) {
      const byShape = rows.filter(r => key(skuShape(r)) === key(wantShape));
      if (byShape.length) rows = byShape;
    }

    if (includeGlobal) {
      rows = rows.filter(r => fieldHas(r, skuCarat, state.filters.carat));
      rows = rows.filter(r => fieldHas(r, skuStyle, state.filters.style));
      rows = rows.filter(r => fieldHas(r, skuCollection, state.filters.collection));
      if (state.filters.quick_ship.size) rows = rows.filter(r => isTruthy(skuQuickShip(r)) || card.quickShip);
    }

    if (opts.useDefaultSku && card.defaultSku) {
      const bySku = rows.filter(r => rowSku(r) === card.defaultSku);
      if (bySku.length) rows = bySku;
    }

    const yesRows = rows.filter(skuShow);
    if (yesRows.length) rows = yesRows;
    rows.sort((a,b) => skuRank(a) - skuRank(b));
    return lowestSize(rows) || null;
  }
  function hydrateCardFromSku(card, payload) {
    const meta = payload.product || {};
    const sku = payload.items || [];
    card.sku = sku;
    card.parentHandle = norm(meta.parent_handle) || card.parentHandle;
    card.defaultProductName = norm(meta.pdp_title) || card.defaultProductName || card.baseTitle;
    card.defaultSku = norm(meta.default_sku) || card.defaultSku;
    card.defaultMetal = norm(meta.default_metal) || card.defaultMetal;
    card.defaultShape = norm(meta.default_shape) || card.defaultShape;
    card.cardBadgeName = norm(meta.card_badge_name) || card.cardBadgeName;
    card.badgeDesignType = norm(meta.badge_design_type) || card.badgeDesignType;
    card.quickShip = isTruthy(meta.quick_ship) || card.quickShip;
    splitVals(meta.style_filter).forEach(v => card.styles.add(v));
    splitVals(meta.collection_filter).forEach(v => card.collections.add(v));

    sku.forEach(s => {
      const sh = norm(skuShape(s)); const mt = norm(skuMetal(s));
      if (sh) card.shapes.add(sh); if (mt) card.metals.add(mt);
      splitVals(skuCarat(s)).forEach(v => card.carats.add(v));
      splitVals(skuStyle(s)).forEach(v => card.styles.add(v));
      splitVals(skuCollection(s)).forEach(v => card.collections.add(v));
      splitVals(skuQuickShip(s)).forEach(v => card.quickShips.add(v));
      if (isTruthy(skuQuickShip(s))) card.quickShip = true;
    });
    card.styleKeys = new Set([...card.styles].map(styleKey).filter(Boolean));
    splitVals(meta.available_shapes).forEach(v => card.shapes.add(v));
    splitVals(meta.available_metals).forEach(v => card.metals.add(v));
    updateGlobalFilterOptionsFromCard(card);

    const d = chooseRow(card, { shape: card.defaultShape, metal: card.defaultMetal, includeGlobal: false, useDefaultSku: true }) || chooseRow(card, { includeGlobal: false }) || card.sku[0];
    card.defaultRow = d || null;
    card.defaultRowName = norm(skuRowNameOnly(d)) || card.defaultRowName || '';
    card.selectedShape = norm(skuShape(d)) || card.defaultShape || [...card.shapes][0] || '';
    card.selectedMetal = norm(skuMetal(d)) || card.defaultMetal || [...card.metals][0] || '';
    applySkuSelection(card, d); card.ready = true;
  }
  function sameValue(a, b) {
    const ka = key(a), kb = key(b);
    if (!ka || !kb) return false;
    return ka === kb || ka.includes(kb) || kb.includes(ka);
  }

  function styleKey(v) {
    let k = key(v).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!k) return '';
    if (k.includes('hidden') && (k.includes('accent') || k.includes('halo'))) return 'hidden-accent';
    if (k.includes('three')) return 'three-stone';
    if (k.includes('side')) return 'side-stone';
    if (k.includes('nature')) return 'nature';
    if (k.includes('celtic')) return 'celtic';
    if (k.includes('vintage')) return 'vintage';
    if (k.includes('modern')) return 'modern';
    if (k.includes('luxury')) return 'luxury';
    if (k.includes('halo')) return 'halo';
    if (k.includes('solitaire')) return 'solitaire';
    return handleize(k);
  }
  function styleLabel(v) {
    const map = {
      'hidden-accent':'Hidden Accent', 'hidden-halo':'Hidden Accent',
      'three-stone':'Three Stone', 'side-stone':'Side Stone',
      'solitaire':'Solitaire', 'nature':'Nature', 'celtic':'Celtic', 'halo':'Halo',
      'vintage':'Vintage', 'modern':'Modern', 'luxury':'Luxury'
    };
    return map[styleKey(v)] || optionLabel(v);
  }
  function styleMatches(card, want) {
    // Style filter must match only inside the current card's JSON row.name group.
    // Do not use product-level union of styles; that causes wrong matches when one handle
    // has multiple PLP rows and only a different row has Hidden Accent / Three Stone etc.
    const wk = styleKey(want);
    if (!wk) return true;
    const rows = styleRowsForCurrentCard(card);
    return rows.some(r => rowHasStyle(r, want));
  }
  function bestRow(rows) {
    if (!rows.length) return null;
    const yes = rows.filter(skuShow);
    const pool = yes.length ? yes : rows;
    pool.sort((a,b) => skuRank(a) - skuRank(b));
    return lowestSize(pool) || pool[0] || null;
  }
  function matchSku(card) {
    let rows = defaultNameRows(card, card.sku);
    const strictRows = rows.filter(s => sameValue(skuShape(s), card.selectedShape) && sameValue(skuMetal(s), card.selectedMetal));
    if (strictRows.length) return bestRow(strictRows);
    const byShapeRows = rows.filter(s => sameValue(skuShape(s), card.selectedShape));
    if (byShapeRows.length) return bestRow(byShapeRows);
    const byMetalRows = rows.filter(s => sameValue(skuMetal(s), card.selectedMetal));
    if (byMetalRows.length) return bestRow(byMetalRows);
    return chooseRow(card, { includeGlobal: false }) || card.sku[0];
  }
  function rowsForClickedOption(card, type, value) {
    // Shape/metal icon click MUST be driven by the clicked value first.
    // Old code was filtering by default/name first, so many shape rows were removed
    // before the clicked shape could match. That made the card fall back to default.
    const allRows = [...card.sku];
    const namedRows = defaultNameRows(card, allRows);
    const pools = [];
    if (namedRows.length && namedRows.length !== allRows.length) pools.push(namedRows);
    pools.push(allRows);

    if (type === 'shape') {
      const currentMetal = card.selectedMetal;
      for (const rows of pools) {
        const strict = rows.filter(r => sameValue(skuShape(r), value) && (!currentMetal || sameValue(skuMetal(r), currentMetal)));
        if (strict.length) return bestRow(strict);
      }
      for (const rows of pools) {
        const byShape = rows.filter(r => sameValue(skuShape(r), value));
        if (byShape.length) return bestRow(byShape);
      }
    }

    if (type === 'metal') {
      const currentShape = card.selectedShape;
      for (const rows of pools) {
        const strict = rows.filter(r => sameValue(skuMetal(r), value) && (!currentShape || sameValue(skuShape(r), currentShape)));
        if (strict.length) return bestRow(strict);
      }
      for (const rows of pools) {
        const byMetal = rows.filter(r => sameValue(skuMetal(r), value));
        if (byMetal.length) return bestRow(byMetal);
      }
    }
    return null;
  }
  function selectCardOption(card, type, value) {
    card.userSelected = true;
    if (!card.sku.length) return null;
    value = norm(value);
    if (!value) return null;

    const clickedRow = rowsForClickedOption(card, type, value);
    if (clickedRow) {
      card.selectedShape = norm(skuShape(clickedRow)) || (type === 'shape' ? value : card.selectedShape);
      card.selectedMetal = norm(skuMetal(clickedRow)) || (type === 'metal' ? value : card.selectedMetal);
      return clickedRow;
    }

    if (type === 'shape') card.selectedShape = value;
    if (type === 'metal') card.selectedMetal = value;
    return matchSku(card);
  }
  function applySkuSelection(card, forcedRow) {
    const row = forcedRow || matchSku(card); if (!row) return;
    card.currentRow = row;
    card.selectedShape = norm(skuShape(row)) || card.selectedShape;
    card.selectedMetal = norm(skuMetal(row)) || card.selectedMetal;
    // PLP title should stay default product title unless JSON has pdp_name/title for same default product.
    card.title = norm(pick(row, ['name','Name'])) || norm(pick(row, ['pdp_name','product_name','product_title','title'])) || card.defaultProductName || card.baseTitle;
    card.url = rowUrl(card, row);
    card.image = mediaUrl(row, false, card.product?.images?.[0]?.src || card.image);
    card.hoverImage = mediaUrl(row, true, '');
    const price = rowPrice(row, card.priceFinal);
    card.priceFinal = price.final; card.priceCompare = price.compare;
    const badge = norm(skuBadgeName(row)) || card.cardBadgeName;
    const badgeType = norm(skuBadgeType(row)) || card.badgeDesignType;
    card.badges = [];
    if (badge) card.badges.push({ label: badge, type: badgeType });
    // Quick Ship is filter-only on PLP; do not show Quick Ship as a product card badge/tag.
  }
  function hasActivePlpFilters() {
    return !!(state.filters.shape.size || state.filters.metal.size || state.filters.carat.size || state.filters.style.size || state.filters.collection.size || state.filters.quick_ship.size || state.filters.priceMin !== null || state.filters.priceMax !== null);
  }
  function resetCardToDefault(card) {
    if (!card || !card.ready || !card.sku.length) return;
    card.userSelected = false;
    const row = card.defaultRow || chooseRow(card, { shape: card.defaultShape, metal: card.defaultMetal, includeGlobal: false, useDefaultSku: true }) || chooseRow(card, { includeGlobal: false }) || card.sku[0];
    applySkuSelection(card, row);
  }
  function syncVisibleRowToPlpFilters(card) {
    if (!card.ready || !card.sku.length || card.userSelected) return;
    const hasRowFilters = state.filters.shape.size || state.filters.metal.size || state.filters.carat.size || state.filters.style.size || state.filters.collection.size;
    if (!hasRowFilters) {
      resetCardToDefault(card);
      return;
    }
    const row = chooseRow(card, { includeGlobal: true });
    if (row) applySkuSelection(card, row);
  }
  function orderValues(values, order) {
    const arr = uniq(values);
    return arr.sort((a,b) => {
      const ia = order.findIndex(o => key(a).includes(o)); const ib = order.findIndex(o => key(b).includes(o));
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      return a.localeCompare(b);
    });
  }
  function cardPasses(card) {
    // When a filter is active, don't count unhydrated cards as matches.
    // Otherwise count slowly changes while SKU JSON finishes loading.
    // if (!card.ready) return !hasActivePlpFilters();
    if (!card.ready) return false;
    syncVisibleRowToPlpFilters(card);
    if (state.filters.shape.size && ![...state.filters.shape].some(v => [...card.shapes].some(s => key(s) === key(v)))) return false;
    if (state.filters.metal.size && ![...state.filters.metal].some(v => [...card.metals].some(m => metalKey(m) === metalKey(v)))) return false;
    if (state.filters.carat.size && ![...state.filters.carat].some(v => [...card.carats].some(c => key(c) === key(v)))) return false;
    if (state.filters.style.size && ![...state.filters.style].some(v => styleMatches(card, v))) return false;
    if (state.filters.collection.size && ![...card.collections].some(co => [...state.filters.collection].some(v => key(co) === key(v) || key(co).includes(key(v))))) return false;
    if (state.filters.quick_ship.size && !card.quickShip && !(card.currentRow && isTruthy(skuQuickShip(card.currentRow)))) return false;
    const p = Number(card.priceFinal || 0);
    if (state.filters.priceMin !== null && p < state.filters.priceMin) return false;
    if (state.filters.priceMax !== null && p > state.filters.priceMax) return false;
    return true;
  }
  function sortCards(cards) {
    const type = els.sort.value, arr = [...cards];
    if (type === 'title-ascending') arr.sort((a,b) => a.title.localeCompare(b.title));
    if (type === 'title-descending') arr.sort((a,b) => b.title.localeCompare(a.title));
    if (type === 'price-ascending') arr.sort((a,b) => (a.priceFinal||0) - (b.priceFinal||0));
    if (type === 'price-descending') arr.sort((a,b) => (b.priceFinal||0) - (a.priceFinal||0));
    return arr;
  }
  function optionValues(type) {
    const fromOptions = state.collectionOptions[type] || [];
    const fromCards = type === 'shape' ? state.cards.flatMap(c => [...c.shapes])
      : type === 'metal' ? state.cards.flatMap(c => [...c.metals]).map(metalLabel)
      : type === 'carat' ? state.cards.flatMap(c => [...c.carats])
      : type === 'style' ? state.cards.flatMap(c => [...c.styles]).map(styleLabel)
      : type === 'collection' ? state.cards.flatMap(c => [...c.collections])
      : [];
    return uniq([...fromOptions, ...fromCards]);
  }
  function updateFiltersUi() {
    renderOptions(els.shapeBox, 'shape', orderValues(optionValues('shape'), orderedShapes));
    renderOptions(els.metalBox, 'metal', orderValues(optionValues('metal').map(metalLabel), orderedMetals));
    renderOptions(els.caratBox, 'carat', orderValues(optionValues('carat'), []));
    renderOptions(els.styleBox, 'style', orderValues(optionValues('style').map(styleLabel), orderedStyles));
    renderOptions(els.collectionBox, 'collection', orderValues(optionValues('collection'), []));
    renderQuickShipToggle();
    updatePriceRangeUi();
  }
  function renderQuickShipToggle() {
    if (!els.quickShipBox) return;
    const checked = state.filters.quick_ship.has('YES') ? 'checked' : '';
    els.quickShipBox.innerHTML = `
      <label class="wdd-filter-option wdd-filter-option--quick_ship wdd-quick-ship-toggle">
        <input type="checkbox" value="YES" data-filter-type="quick_ship" ${checked}>
        <span class="wdd-toggle-ui" aria-hidden="true"><span></span></span>
        <span>Quick Ship</span>
      </label>
    `;
  }
  function renderOptions(box, type, values) {
    if (!box) return;
    const oldScroll = box.scrollTop || 0;
    if (type === 'metal') values = uniq(values.map(metalLabel));
    if (type === 'style') values = uniq(values.map(styleLabel));

    box.innerHTML = values.map(v => {
      const labelText = type === 'metal' ? metalLabel(v) : (type === 'style' ? styleLabel(v) : optionLabel(v));
      const checked = filterSetHas(type, labelText) ? 'checked' : '';
      const icon = type === 'shape' ? shapeIcon(labelText) : (type === 'style' ? styleIcon(labelText) : (type === 'quick_ship' ? shopifyFile('Shipping.png') : ''));
      const metalCls = type === 'metal' ? metalClass(labelText) : '';
      // const iconHtml = type === 'metal'
      //   ? `<span class="wdd-filter-icon wdd-filter-metal-swatch ${escapeAttr(metalCls)}" aria-hidden="true"></span>`
      //   : (icon ? `<span class="wdd-filter-icon wdd-filter-icon--${escapeAttr(type)}"><img src="${escapeAttr(icon)}" alt="${escapeAttr(labelText)}" loading="lazy"></span>` : '');
      const metalKey_m = key(labelText)
      .replace('-gold', '')
      .replace('gold', '')
      .trim();
    const metalIcon_m = window.WDD_ICONMAP?.metal?.[metalKey_m] || '';
    const iconHtml = type === 'metal'
      ? `
        <span class="wdd-filter-icon wdd-filter-icon--metal">
          <img
            src="${escapeAttr(metalIcon_m)}"
            alt="${escapeAttr(labelText)}"
            loading="lazy"
            width="28"
            height="28"
            onerror="this.style.display='none'"
          >
        </span>
      `
      : (
          icon
            ? `
              <span class="wdd-filter-icon wdd-filter-icon--${escapeAttr(type)}">
                <img
                  src="${escapeAttr(icon)}"
                  alt="${escapeAttr(labelText)}"
                  loading="lazy"
                  width="60"
                  height="30"
                >
              </span>
            `
            : ''
        );
    const displayText =
      labelText === 'Elongated Cushion'
        ? 'Long Cushion'
        : labelText;

    const valueText = labelText
      .replace(/gold/gi, '')
      .trim();

    return `
      <label class="wdd-filter-option data_filter_${escapeAttr(valueText)} wdd-filter-option--${type} ${type === 'metal' ? 'wdd-filter-option--metal-fixed' : ''}">
        <input
          type="checkbox"
          value="${escapeAttr(valueText)}"
          data-filter-type="${type}"
          ${checked}
        >
        ${iconHtml}
        <span>${escapeHtml(displayText)}</span>
      </label>
    `;
    }).join('') || '<p>No options found</p>';

    box.scrollTop = oldScroll;
    const options = box.querySelectorAll('.wdd-filter-option');
    if(type != 'carat'){
    if (options.length > 9) {

      // Prevent duplicate buttons
      if (!box.querySelector('.wdd-filter-arrow-top')) {

        const topBtn = document.createElement('button');
        topBtn.className = 'wdd-filter-arrow-top';
        topBtn.type = 'button';

        topBtn.innerHTML = `
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 -960 960 960"
            width="20px"
            fill="currentColor"
          >
            <path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/>
          </svg>
        `;

        const bottomBtn = document.createElement('button');
        bottomBtn.className = 'wdd-filter-arrow-bottom';
        bottomBtn.type = 'button';

        bottomBtn.innerHTML = `
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 -960 960 960"
            width="20px"
            fill="currentColor"
          >
            <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/>
          </svg>
        `;

        box.prepend(topBtn);
        box.append(bottomBtn);

        topBtn.addEventListener('click', () => {
          box.scrollBy({
            top: -180,
            behavior: 'smooth'
          });
        });

        bottomBtn.addEventListener('click', () => {
          box.scrollBy({
            top: 180,
            behavior: 'smooth'
          });
        });

      }
    }
  }
  }
  function updateActiveFilters() {
    const chips = [];
    for (const v of state.filters.shape) chips.push(['shape', v]); for (const v of state.filters.metal) chips.push(['metal', v]); for (const v of state.filters.carat) chips.push(['carat', v]); for (const v of state.filters.style) chips.push(['style', v]); for (const v of state.filters.collection) chips.push(['collection', v]); for (const v of state.filters.quick_ship) chips.push(['quick_ship', v]);
    if (state.filters.priceMin !== null) chips.push(['priceMin', `Min ${state.filters.priceMin}`]); if (state.filters.priceMax !== null) chips.push(['priceMax', `Max ${state.filters.priceMax}`]);

    // v55 hotfix: some templates do not output active-filter/clear nodes.
    // Never crash the PLP because one optional control is missing.
    if (els.active) {
      els.active.innerHTML = chips.map(([t,v]) => `<button type="button" class="wdd-active-chip" data-remove-filter="${t}" data-value="${escapeAttr(v)}">${escapeHtml(
  v === 'Elongated Cushion'
    ? 'Long Cushion'
    : v
)} ×</button>`).join('');
    }
    if (els.clear) {
      els.clear.hidden = chips.length === 0;
    }
  }
  function updatePriceRangeUi() {
    const prices = state.cards.map(c => Number(c.priceFinal || 0)).filter(n => n > 0);
    if (!prices.length || !els.priceMin || !els.priceMax) return;

    const absoluteMin = Math.floor(Math.min(...prices));
    const absoluteMax = Math.ceil(Math.max(...prices));
    const minGap = Number(root.dataset.priceGap || 0);

    [els.priceMin, els.priceMax].forEach(input => {
      input.type = 'range';
      input.min = absoluteMin;
      input.max = absoluteMax;
      input.step = input.step || '50';
    });

    let currentMin = state.filters.priceMin !== null ? Number(state.filters.priceMin) : absoluteMin;
    let currentMax = state.filters.priceMax !== null ? Number(state.filters.priceMax) : absoluteMax;

    currentMin = Math.max(absoluteMin, Math.min(currentMin, absoluteMax));
    currentMax = Math.max(absoluteMin, Math.min(currentMax, absoluteMax));

    if (currentMin > currentMax - minGap) currentMin = Math.max(absoluteMin, currentMax - minGap);
    if (currentMax < currentMin + minGap) currentMax = Math.min(absoluteMax, currentMin + minGap);

    els.priceMin.value = currentMin;
    els.priceMax.value = currentMax;

    const range = Math.max(1, absoluteMax - absoluteMin);
    const leftPercent = ((currentMin - absoluteMin) / range) * 100;
    const rightPercent = ((currentMax - absoluteMin) / range) * 100;
    const wrap = els.priceMin.closest('.wdd-price-filter');
if (wrap) {
  wrap.style.setProperty('--price-left', `${leftPercent}%`);
  wrap.style.setProperty('--price-right', `${rightPercent}%`);
  wrap.style.setProperty('--range-left', `${leftPercent}%`);
  wrap.style.setProperty('--range-right', `${rightPercent}%`);
}

/* =========================
   LABEL TEXT
========================= */

if (els.priceMinLabel) {
  els.priceMinLabel.textContent = moneyFromDollars(currentMin);

  // POSITION
  els.priceMinLabel.style.left = `calc(${leftPercent}% )`;
}

if (els.priceMaxLabel) {
  els.priceMaxLabel.textContent = moneyFromDollars(currentMax);

  // POSITION
  els.priceMaxLabel.style.left = `calc(${rightPercent}% )`;
}

/* ACTIVE RANGE */
const activeRange = root.querySelector('.wdd-dual-range__range');

if (activeRange) {
  activeRange.style.left = `${leftPercent}%`;
  activeRange.style.width = `${rightPercent - leftPercent}%`;
}
  }
  function applyFilters(resetShown = true) {
    if (resetShown) state.shown = 0;
    state.filtered = sortCards(state.cards.filter(cardPasses));
    try { updateActiveFilters(); } catch (e) { console.warn('[WDD PLP] active filter UI skipped', e); }
    renderGrid();
    syncUrl();
  }
  function scheduleApply(resetShown=false) {
    clearTimeout(state.renderTimer);
    state.renderTimer = setTimeout(() => {
      // Do not rebuild filter dropdowns while user has active filters.
      // Rebuilding was visually unchecking style options and causing count flicker.
      if (!hasActivePlpFilters()) updateFiltersUi();
      applyFilters(resetShown);
    }, hasActivePlpFilters() ? 16 : 120);
  }

  function buildGridShimmer(count = 8) {
    const total = Math.max(1, Number(count || 8));
    return Array.from({ length: total }).map((_, i) => `
      <article class="wdd-card product-card is-loading" aria-hidden="true" data-shimmer-card="${i}">
        <div class="wdd-card__media contents wdd-card-link">
        <div class="wdd-metals"><span></span></div>
        </div>
        <div class="wdd-card__info">
          <h3 class="wdd-card__title"><span>Loading</span></h3>
          <div class="wdd-shapes-wrap"><span></span></div>
          <div class="wdd-card__price"><span>Loading</span></div>
        </div>
      </article>
    `).join('');
  }


  function renderProductBadges(card) {
    const badges = (card.badges || []).filter(b => b && b.label && key(b.label) !== 'quick ship' && !key(b.type).includes('quick'));
    if (!badges.length) return '';
    return `<div class="wdd-product-badges">${badges.map(b => {
      const cls = handleize(b.label) + (key(b.type) === 'special' ? ' badge-special' : '') + (key(b.type).includes('quick') ? ' badge-quick-ship' : '');
      const icon = key(b.label) === 'top pick' ? `<img src="${escapeAttr(shopifyFile('gift-icon.png'))}" alt="" loading="lazy">` : (key(b.type) === 'special' ? `<img src="${escapeAttr(shopifyFile('special-badge-img.png'))}" alt="" loading="lazy">` : '');
      return `<span class="wdd-product-badge ${cls}">${icon}${escapeHtml(b.label)}</span>`;
    }).join('')}
    
    </div>`;
  }
  

  function wishlistPrice(card) {
    return moneyFromDollars(card && card.priceFinal ? card.priceFinal : 0);
  }
  function wishlistMetafields(card) {
    try { return escapeAttr(JSON.stringify(card.currentRow || {})); } catch (e) { return '{}'; }
  }

  
  function wishlistHtml(card) {
    return `
    
    <span class="iconWrap wdd-card-wishlist-wrap">
     <span class="shipping_icon f34"><img src="https://cdn.shopify.com/s/files/1/0788/6631/7533/files/shipping2.png?v=1779383817" alt="Shipping"></span>
    <span class="add-to-wishlist"><div
      class="wdd-engagement-wishlist-engine"
      data-product_id="${escapeAttr(card.productId)}"
      data-variant_id="${escapeAttr(card.variantId || '')}"
      data-product_handle="${escapeAttr(card.parentHandle || card.handle)}"
      data-title="${escapeAttr(card.title)}"
      data-image="${escapeAttr(card.image)}"
      data-price="${escapeAttr(wishlistPrice(card))}" data-amount="${escapeAttr(wishlistPrice(card))}" data-raw-price="${escapeAttr(card.priceFinal || 0)}"
      data-url="${escapeAttr(card.url)}"
      data-sku="${escapeAttr(rowSku(card.currentRow || {}) || card.defaultSku || '')}"
      data-metafields='${wishlistMetafields(card)}'
      data-full_button="false"
      data-css="true"
    ></div></span></span>`;
  }
  function updateWishlistDom(cardEl, card) {
    const engine = cardEl && cardEl.querySelector('.wdd-engagement-wishlist-engine');
    if (!engine || !card) return;
    engine.dataset.product_id = String(card.productId || '');
    engine.dataset.variant_id = String(card.variantId || '');
    engine.dataset.product_handle = String(card.parentHandle || card.handle || '');
    engine.dataset.title = String(card.title || '');
    engine.dataset.image = String(card.image || '');
    engine.dataset.price = wishlistPrice(card);
    engine.dataset.amount = wishlistPrice(card);
    engine.dataset.rawPrice = String(card.priceFinal || 0);
    engine.dataset.url = String(card.url || '');
    engine.dataset.sku = String(rowSku(card.currentRow || {}) || card.defaultSku || '');
    try { engine.dataset.metafields = JSON.stringify(card.currentRow || {}); } catch (e) { engine.dataset.metafields = '{}'; }
  }
  function cardToCache(card) {
    return {
      product: card.product, handle: card.handle, productId: card.productId, variantId: card.variantId, parentHandle: card.parentHandle,
      baseTitle: card.baseTitle, defaultProductName: card.defaultProductName, defaultSku: card.defaultSku, defaultMetal: card.defaultMetal, defaultShape: card.defaultShape,
      title: card.title, url: card.url, image: card.image, hoverImage: card.hoverImage, priceFinal: card.priceFinal, priceCompare: card.priceCompare,
      shapes: [...card.shapes], metals: [...card.metals], carats: [...card.carats], styles: [...card.styles], collections: [...card.collections], quickShips: [...card.quickShips], styleKeys: [...(card.styleKeys || new Set())], badges: card.badges || [], cardBadgeName: card.cardBadgeName || '', badgeDesignType: card.badgeDesignType || '', quickShip: !!card.quickShip,
      selectedShape: card.selectedShape, selectedMetal: card.selectedMetal, ready: card.ready, userSelected: false, currentRow: card.currentRow || null,
      defaultRow: card.defaultRow || null, defaultRowName: card.defaultRowName || '', sku: Array.isArray(card.sku) ? card.sku : []
    };
  }
  function cardFromCache(c) {
    return { ...c, shapes: new Set(c.shapes || []), metals: new Set(c.metals || []), carats: new Set(c.carats || []), styles: new Set(c.styles || []), collections: new Set(c.collections || []), quickShips: new Set(c.quickShips || []), styleKeys: new Set(c.styleKeys || (c.styles || []).map(styleKey).filter(Boolean)), badges: c.badges || [], cardBadgeName: c.cardBadgeName || '', badgeDesignType: c.badgeDesignType || '', quickShip: !!c.quickShip, sku: Array.isArray(c.sku) ? c.sku : [], ready: !!c.ready, userSelected: false, defaultRowName: c.defaultRowName || '' };
  }
  function savePlpCache() {
    try {
      const payload = { t: Date.now(), cards: state.cards.map(cardToCache), options: state.collectionOptions };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (e) { /* storage may be full/private */ }
  }
  function restorePlpCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const payload = JSON.parse(raw);
      if (!payload || !payload.t || Date.now() - payload.t > CACHE_TTL || !Array.isArray(payload.cards)) return false;
      state.collectionOptions = payload.options || state.collectionOptions;
      state.cards = payload.cards.map(cardFromCache);
      state.cards.forEach(updateGlobalFilterOptionsFromCard);
      mergeCachedFilterOptions(readFilterOptionCache());
      state.products = state.cards.map(c => c.product).filter(Boolean);
      state.filtered = [...state.cards];
      updateFiltersUi();
      // v61 FIX: Snapshot protected ho to applyFilters mat chalo —
      // warna snapshot HTML overwrite ho jaata tha aur labels gayab ho jaate the.
      // Sirf state set karo; renderGrid baad mein loadSkuInQueue se chalega.
      if (!isBackSnapshotProtected()) {
        applyFilters(false);
      }
      return state.cards.length > 0;
    } catch (e) { return false; }
  }

  function hydrateCardsFromLocalSkuCache(cards) {
    let hydrated = 0;
    try {
      (cards || []).forEach(card => {
        if (!card || card.ready) return;
        const payload = readSkuLocalCache(card.handle);
        if (!payload || !Array.isArray(payload.items) || !payload.items.length) return;
        state.skuCache.set(card.handle, payload);
        hydrateCardFromSku(card, payload);
        updateGlobalFilterOptionsFromCard(card);
        hydrated++;
      });
    } catch (e) {
      console.warn('[WDD PLP] local SKU warm skipped', e);
    }
    return hydrated;
  }


  const VIEW_SNAPSHOT_KEY = `wdd_engagement_plp_view_${cfg.handle}_v58`;

  function isBackSnapshotProtected() {
    return Date.now() < (state.backSnapshotProtectedUntil || 0);
  }

  function hasRealRenderedCards() {
    return !!(els.grid && els.grid.querySelector('article[data-card-handle]'));
  }

  function saveViewSnapshot() {
    try {
      if (!els.grid || !hasRealRenderedCards()) return;
      if (els.count && /Filtering/i.test(els.count.textContent || '')) return;
      const minGood = Math.min(firstPageProductLimit(), Math.max(1, state.filtered.length));
      const renderedCount = els.grid.querySelectorAll('article[data-card-handle]').length;
      // Do not allow a partial async preview like 3/4 cards to overwrite the good snapshot.
      if (hasActivePlpFilters() && renderedCount < Math.min(8, minGood)) return;
      const payload = {
        t: Date.now(),
        path: location.pathname,
        search: location.search,
        html: els.grid.innerHTML,
        // v62 FIX: active filter chips bhi save karo (back pe labels gayab bug)
        activeFiltersHtml: els.active ? els.active.innerHTML : '',
        countText: els.count ? (els.count.textContent || String(state.filtered ? state.filtered.length : 0)) : '',
        statusText: els.status ? els.status.textContent : '',
        shown: state.shown || renderedCount,
        filteredLength: state.filtered.length || renderedCount,
        loadMoreHidden: els.loadMore ? !!els.loadMore.hidden : true,
        loadMoreDisabled: els.loadMore ? !!els.loadMore.disabled : true
      };
      sessionStorage.setItem(VIEW_SNAPSHOT_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function restoreViewSnapshot(protectMs = 3000) {
    try {
      const raw = sessionStorage.getItem(VIEW_SNAPSHOT_KEY);
      if (!raw) return false;
      const payload = JSON.parse(raw);
      if (!payload || Date.now() - payload.t > CACHE_TTL) return false;
      if (payload.path !== location.pathname || payload.search !== location.search) return false;
      if (!payload.html || !els.grid) return false;
      state.backSnapshotProtectedUntil = Date.now() + protectMs;
      els.grid.innerHTML = payload.html;
      // v62 FIX: active filter chips restore karo (back pe labels gayab bug fix)
      if (els.active && payload.activeFiltersHtml !== undefined) {
        els.active.innerHTML = payload.activeFiltersHtml;
      }
      // v62 FIX: clear button visibility restore karo
      if (els.clear) {
        const hasChips = !!(payload.activeFiltersHtml && payload.activeFiltersHtml.trim());
        els.clear.hidden = !hasChips;
      }
      // v61 FIX: countText pehle try karo, fallback filteredLength
      if (els.count) {
        const ct = payload.countText || String(payload.filteredLength || 0);
        if (ct && ct !== '') els.count.textContent = ct;
      }
      if (els.status) els.status.textContent = payload.statusText || '';
      state.shown = Number(payload.shown || state.shown || cfg.perPage || 28);
      if (els.loadMore) {
        const hasMore = Number(payload.shown || 0) < Number(payload.filteredLength || 0);
        els.loadMore.hidden = !hasMore;
        els.loadMore.disabled = !hasMore;
        els.loadMore.setAttribute('aria-hidden', hasMore ? 'false' : 'true');
      }
      document.dispatchEvent(new CustomEvent('wdd:plp-rendered'));
      return true;
    } catch (e) { return false; }
  }

  function allCardsReadyForExactCount() {
    return !!(state.cards && state.cards.length) && state.cards.every(c => c && c.ready);
  }

  function setProductCountText(finalOverride) {
    if (!els.count) return;

    const active = hasActivePlpFilters();
    const hasUnready = state.cards && state.cards.some(c => c && !c.ready);
    const totalCards = state.cards ? state.cards.length : 0;

    // Explicit override — hamesha set karo
    if (typeof finalOverride === 'number') {
      els.count.textContent = String(finalOverride);
      return;
    }

    const n = state.filtered ? state.filtered.length : 0;

    // v64: No filter case — total count turant dikhao (state.cards.length known instantly)
    // Background SKU load ka wait nahi karna — stepping ka koi chance nahi no-filter pe
    if (!active) {
      els.count.textContent = String(totalCards || n);
      return;
    }

    // Filter active case:
    // Unready cards hain aur abhi koi match nahi = scan chal raha hai, blank raho
    if (hasUnready && n === 0) return;

    // Kuch ready matches hain ya sab ready = dikhao (partial ya final dono OK)
    els.count.textContent = String(n);
  }

  function preloadImageFast(src) {
    if (!src || !/^https?:\/\//i.test(src)) return;
    try {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      try { img.fetchPriority = 'high'; } catch (e) {}
      img.src = src;
    } catch (e) {}
  }

  function preloadVisibleCardImages(cards) {
    try {
      // v59: preload more visible/near-visible media so image swap feels faster
      // without changing card UI or filter conditions.
      (cards || []).slice(0, 20).forEach(card => {
        preloadImageFast(card && card.image);
        preloadImageFast(card && card.hoverImage);
      });
    } catch (e) {}
  }

  function renderGrid(append = false) {
    // v26: Load More must be the only way to increase visible count.
    // Previous versions called renderGrid() during SKU hydration, which kept adding
    // cfg.perPage again and again. That is why first reload could show all products.
    if (append) {
      state.shown = Math.min((state.shown || 0) + cfg.perPage, state.filtered.length);
    } else if (!state.shown || state.shown < 0) {
      state.shown = Math.min(firstPageProductLimit(), state.filtered.length);
    } else {
      state.shown = Math.min(state.shown, state.filtered.length);
    }

    const next = state.filtered.slice(0, state.shown);

    preloadVisibleCardImages(next);
    els.grid.innerHTML = renderCardsWithBanners(next);
    setProductCountText();

    if (els.loadMore) {
      const hasMore = state.shown < state.filtered.length;
      els.loadMore.hidden = !hasMore;
      els.loadMore.disabled = !hasMore;
      els.loadMore.setAttribute('aria-hidden', hasMore ? 'false' : 'true');
    }

    els.status.textContent = state.cards.length && !state.filtered.length ? 'No products found for selected filters.' : '';
    document.dispatchEvent(new CustomEvent('wdd:plp-rendered'));
    saveViewSnapshot();
  }
  function renderCardsWithBanners(cards) {
    const banner = root.querySelector('[data-wdd-grid-banner-template]');
    const bannerHtml = banner ? banner.innerHTML.trim() : '';
    const after = Number(root.dataset.bannerAfter || 10);
    const out = [];
    cards.forEach((card, index) => {
      out.push(renderCard(card, index));
      if (bannerHtml && index + 1 === after) out.push(`<div class="wdd-grid-banner collection-custom-image">${bannerHtml}</div>`);
    });
    return out.join('');
  }
  function renderCard(card, index = 0) {
    const shapes = orderValues([...card.shapes], orderedShapes), metals = orderValues([...card.metals], orderedMetals);
    return `<article class="wdd-card product-card ${card.ready ? '' : 'is-loading'}" data-card-handle="${escapeAttr(card.handle)}">
      ${renderProductBadges(card)}
      <a class="wdd-card__media contents wdd-card-link" href="${escapeAttr(card.url)}" aria-label="${escapeAttr(card.title)}">
        <img class="wdd-card__img wdd-card__img--primary" src="${escapeAttr(card.image)}" alt="${escapeAttr(card.title)}" loading="${index < 8 ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${index < 4 ? 'high' : 'auto'}">
        ${card.hoverImage ? `<img class="wdd-card__img wdd-card__img--hover" src="${escapeAttr(card.hoverImage)}" alt="${escapeAttr(card.title)}" loading="lazy" decoding="async">` : ''}
      ${metals.length > 1 ? renderMetalChips(card, metals) : ''}
        </a>
           
      ${wishlistHtml(card)}

      <div class="wdd-card__info">
        <h3 class="wdd-card__title"><a href="${escapeAttr(card.url)}">${escapeHtml(card.title)}</a></h3>
        ${shapes.length > 1 ? renderShapeChips(card, shapes) : ''}
        
       <div class="wdd-card__price" data-price-wrap>
  <span class="from"> From </span>

  ${
    card.priceCompare
      ? `
        <span class="price">
          <del>
            ${moneyFromDollars(card.priceCompare).replace(/\.00/g, '')}
          </del>

          <strong class="js-card-price">
            ${moneyFromDollars(card.priceFinal).replace(/\.00/g, '')}
          </strong>
        </span>
      `
      : `
        <span class="price">
          <strong class="js-card-price">
            ${moneyFromDollars(card.priceFinal).replace(/\.00/g, '')}
          </strong>
        </span>
      `
  }
</div>
      </div>
    </article>`;
  }
  function updateCardDom(cardEl, card) {
    if (!cardEl || !card) return;
    const media = cardEl.querySelector('.wdd-card__media');
    const titleLink = cardEl.querySelector('.wdd-card__title a');
    const primary = cardEl.querySelector('.wdd-card__img--primary');
    const hover = cardEl.querySelector('.wdd-card__img--hover');
    if (media) { media.href = card.url; media.setAttribute('aria-label', card.title); }
    if (titleLink) { titleLink.href = card.url; titleLink.textContent = card.title; }
    const oldBadges = cardEl.querySelector('.wdd-product-badges');
    const newBadges = renderProductBadges(card);
    if (oldBadges) oldBadges.remove();
    if (newBadges) cardEl.insertAdjacentHTML('afterbegin', newBadges);
    if (primary && card.image) { primary.src = card.image; primary.alt = card.title; }
    if (hover && card.hoverImage) { hover.src = card.hoverImage; hover.alt = card.title; }
    cardEl.querySelectorAll('[data-card-filter="shape"]').forEach(b => b.classList.toggle('active', key(b.dataset.value) === key(card.selectedShape)));
    cardEl.querySelectorAll('[data-card-filter="metal"]').forEach(b => b.classList.toggle('active', key(b.dataset.value) === key(card.selectedMetal)));
    const priceWrap = cardEl.querySelector('[data-price-wrap]');
    if (priceWrap) priceWrap.innerHTML = `<span class="from aaaa"> From </span>${card.priceCompare ? `<span class="price"><del>${moneyFromDollars(card.priceCompare)}</del> <strong class="js-card-price">${moneyFromDollars(card.priceFinal)}</strong></span>` : `<span class="price"><strong class="js-card-price">${moneyFromDollars(card.priceFinal)}</strong></span>`}`;
    updateWishlistDom(cardEl, card);
  }

 
  function renderShapeChips(card, shapes) {
    return `<div class="wdd-shapes-wrap" data-shapes-wrap>${shapes.length > 4 ? '<button class="shape-nav prev" type="button" aria-label="Previous"></button>' : ''}<div class="wdd-shapes" role="group" aria-label="Select shape" data-shapes>${shapes.map(s => `<button class="shape-chip ${key(s) === key(card.selectedShape) ? 'active' : ''}" type="button" data-card-filter="shape" data-value="${escapeAttr(s)}" data-shape="${escapeAttr(s)}" title="${escapeAttr(s)}"><img src="${escapeAttr(shapeIcon(s))}" alt="${escapeAttr(s)}" loading="lazy"></button>`).join('')}</div>${shapes.length > 4 ? '<button class="shape-nav next" type="button" aria-label="Next"></button>' : ''}</div>`;
  }

  //  function renderMetalChips(card, metals) {
  //   return `<div class="wdd-metals" role="group" aria-label="Select metal" data-metals>${metals.map(m => `<button class="metal-chip ${key(m) === key(card.selectedMetal) ? 'active' : ''}" type="button" data-card-filter="metal" data-value="${escapeAttr(m)}" data-metal="${escapeAttr(m)}" title="${escapeAttr(m)}">${metalSwatchHtml(m, 'metal-chip__swatch')}</button>`).join('')}</div>`;
  // }

  // function metalSwatchHtml(v, cls) {
  //   const m = key(v);
  //   let bg = 'linear-gradient(135deg,#d8d8d8 0%,#ffffff 45%,#9f9f9f 100%)';
  //   if (m.includes('yellow')) bg = 'linear-gradient(135deg,#fff4d6 0%,#f3cc74 48%,#fff8e8 100%)';
  //   else if (m.includes('rose')) bg = 'linear-gradient(135deg,#ffe3d6 0%,#f2a984 50%,#fff0e8 100%)';
  //   else if (m.includes('white')) bg = 'linear-gradient(135deg,#ffffff 0%,#dfe4e3 45%,#ffffff 100%)';
  //   else if (m.includes('platinum')) bg = 'linear-gradient(135deg,#f5f5f5 0%,#b7b7b7 55%,#ffffff 100%)';
  //   return `<span class="${escapeAttr(cls)} ${escapeAttr(metalClass(v))}" style="background:${bg}"></span>`;
  // }
  function metalSwatchHtml(v, cls) {
    const metal = key(v)
      .replace('-gold', '')
      .replace('gold', '')
      .trim();

    // Get image from existing global icon map
    const fileUrl = window.WDD_ICONMAP?.metal?.[metal] || '';

    return `
      <img
        class="${escapeAttr(cls)} ${escapeAttr(metalClass(v))}"
        src="${fileUrl}"
        alt="${escapeAttr(v)}"
        title="${escapeAttr(v)}"
        loading="lazy"
        width="32"
        height="32"
        onerror="this.style.display='none'"
      />
    `;
  }

function renderMetalChips(card, metals) {
  return `
    <div
      class="wdd-metals"
      role="group"
      aria-label="Select metal"
      data-metals
    >
      ${metals.map(m => `
        <button
          class="metal-chip ${key(m) === key(card.selectedMetal) ? 'active' : ''}"
          type="button"
          data-card-filter="metal"
          data-value="${escapeAttr(m)}"
          data-metal="${escapeAttr(m)}"
          title="${escapeAttr(m)}"
        >
          ${metalSwatchHtml(m, 'metal-chip__swatch')}
        </button>
      `).join('')}
    </div>
  `;
}

  function shopifyFile(name) { return `/cdn/shop/files/${name}`; }
  function metalIcon(v) { return shopifyFile(`${norm(v).replace(/\s+/g, '_').toLowerCase()}.svg`); }
  function shapeIcon(v) { const h = handleize(v).replace(/-/g, '_'); if (h === 'elongated_cushion') return shopifyFile('elongated_cushion_e7eed056-1cd9-4d0c-a299-a2e60556607c.svg'); return shopifyFile(`${h}.svg`); }
  function styleIcon(v) {
    const h = handleize(v);
    const canonical = styleKey(v) || h;
    // Do not guess filenames like /cdn/shop/files/Solitaire.png because that caused 404s.
    // Only use URLs coming from old theme shop metafield: filter_style_images_data.
    return state.styleImages[canonical] || state.styleImages[h] || '';
  }
  function syncUrl() {
    const p = new URLSearchParams();
    [...state.filters.shape].forEach(v => p.append('filter.p.m.custom.shape', v)); [...state.filters.metal].forEach(v => p.append('filter.p.m.custom.metal', v));
    [...state.filters.carat].forEach(v => p.append('filter.p.m.custom.center_stone_size_filter', v)); [...state.filters.style].forEach(v => p.append('filter.p.m.custom.style', v)); [...state.filters.collection].forEach(v => p.append('filter.p.m.custom.collection', v)); [...state.filters.quick_ship].forEach(v => p.append('filter.p.m.custom.quick_ship', v));
    if (state.filters.priceMin !== null) p.set('filter.v.price.gte', state.filters.priceMin); if (state.filters.priceMax !== null) p.set('filter.v.price.lte', state.filters.priceMax);
    history.replaceState(null, '', `${location.pathname}${p.toString() ? '?' + p.toString() : ''}`);
  }
  function restoreUrl() {
    const p = new URLSearchParams(location.search);
    [...p.getAll('shape'), ...p.getAll('filter.p.m.custom.shape')].forEach(v => state.filters.shape.add(v)); [...p.getAll('metal'), ...p.getAll('filter.p.m.custom.metal')].forEach(v => state.filters.metal.add(v));
    [...p.getAll('carat'), ...p.getAll('filter.p.m.custom.center_stone_size_filter'), ...p.getAll('filter.p.m.custom.center_stone_carat_weight')].forEach(v => state.filters.carat.add(v)); [...p.getAll('style'), ...p.getAll('filter.p.m.custom.style'), ...p.getAll('filter.p.m.custom.style_filter')].forEach(v => state.filters.style.add(v)); [...p.getAll('collection'), ...p.getAll('filter.p.m.custom.collection'), ...p.getAll('filter.p.m.custom.collection_filter')].forEach(v => state.filters.collection.add(v)); [...p.getAll('quick_ship'), ...p.getAll('filter.p.m.custom.quick_ship'), ...p.getAll('filter.p.m.custom.quickship')].forEach(v => { if (String(v || '').trim()) state.filters.quick_ship.add('YES'); });
    const min = p.get('min') || p.get('filter.v.price.gte'), max = p.get('max') || p.get('filter.v.price.lte'); if (min) state.filters.priceMin = Number(min); if (max) state.filters.priceMax = Number(max);
    if (els.priceMin && state.filters.priceMin !== null) els.priceMin.value = state.filters.priceMin; if (els.priceMax && state.filters.priceMax !== null) els.priceMax.value = state.filters.priceMax;
  }

  root.addEventListener('change', e => {
    const input = e.target.closest('[data-filter-type]');
    if (!input) return;
    const type = input.dataset.filterType;
    const set = state.filters[type];
    if (!set) return;

    if (type === 'quick_ship') {
      set.clear();
      if (input.checked) set.add('YES');
    } else if (input.checked) {
      const val = type === 'style' ? styleLabel(input.value) : (type === 'metal' ? metalLabel(input.value) : input.value);
      filterSetAdd(type, val);
    } else {
      filterSetDelete(type, input.value);
    }

    // Keep current checkbox state instantly before any grid/filter re-render.
    input.checked = type === 'quick_ship' ? state.filters.quick_ship.has('YES') : filterSetHas(type, input.value);

    state.cards.forEach(c => { c.userSelected = false; });
    if (!hasActivePlpFilters()) state.cards.forEach(resetCardToDefault);

    // FIX v60: applyFilters ko rAF mein wrap kiya taaki filter checkbox UI turant update ho,
    // aur grid render next frame mein ho — jankiness/block nahi hoga.
    requestAnimationFrame(() => {
      applyFilters(true);
      startBackgroundSkuPrewarm(sortQueueForCurrentView(state.cards.filter(c => c && !c.ready)));
    });
  });
  if (els.sort) els.sort.addEventListener('change', () => applyFilters());
  if (els.loadMore) els.loadMore.addEventListener('click', e => {
    e.preventDefault();
    if (state.shown >= state.filtered.length) { els.loadMore.hidden = true; return; }
    renderGrid(true);
  });
  if (els.clear) els.clear.addEventListener('click', () => { state.filters.shape.clear(); state.filters.metal.clear(); state.filters.carat.clear(); state.filters.style.clear(); state.filters.collection.clear(); state.filters.quick_ship.clear(); state.filters.priceMin = null; state.filters.priceMax = null; if (els.priceMin) els.priceMin.value = ''; if (els.priceMax) els.priceMax.value = ''; state.cards.forEach(resetCardToDefault); updateFiltersUi(); applyFilters(); });
  function applyPriceInputs() {
    if (!els.priceMin || !els.priceMax) return;
    let min = els.priceMin.value ? Number(els.priceMin.value) : null;
    let max = els.priceMax.value ? Number(els.priceMax.value) : null;
    if (min !== null && max !== null && min > max) {
      min = max;
      els.priceMin.value = min;
    }
    state.filters.priceMin = min;
    state.filters.priceMax = max;
    updatePriceRangeUi();
    applyFilters();
  }
  function bindDualPriceSlider(input, side) {
    if (!input) return;
    input.addEventListener('input', () => {
      const gap = Number(root.dataset.priceGap || 0);
      let min = Number(els.priceMin.value || els.priceMin.min || 0);
      let max = Number(els.priceMax.value || els.priceMax.max || 0);
      if (side === 'min' && min > max - gap) {
        min = Math.max(Number(els.priceMin.min || 0), max - gap);
        els.priceMin.value = min;
      }
      if (side === 'max' && max < min + gap) {
        max = Math.min(Number(els.priceMax.max || max), min + gap);
        els.priceMax.value = max;
      }
      state.filters.priceMin = Number(els.priceMin.value);
      state.filters.priceMax = Number(els.priceMax.value);
      updatePriceRangeUi();
      clearTimeout(state.priceTimer);
      state.priceTimer = setTimeout(() => applyFilters(), 120);
    });
  }
  if (els.priceApply) els.priceApply.addEventListener('click', applyPriceInputs);
  bindDualPriceSlider(els.priceMin, 'min');
  bindDualPriceSlider(els.priceMax, 'max');
  if (els.active) els.active.addEventListener('click', e => { const btn = e.target.closest('[data-remove-filter]'); if (!btn) return; const t = btn.dataset.removeFilter; if (['shape','metal','carat','style','collection','quick_ship'].includes(t)) filterSetDelete(t, btn.dataset.value); if (t === 'priceMin') { state.filters.priceMin = null; els.priceMin.value = ''; } if (t === 'priceMax') { state.filters.priceMax = null; els.priceMax.value = ''; } state.cards.forEach(c => { c.userSelected = false; }); if (!hasActivePlpFilters()) state.cards.forEach(resetCardToDefault); updateFiltersUi(); requestAnimationFrame(() => { applyFilters(true); startBackgroundSkuPrewarm(sortQueueForCurrentView(state.cards.filter(c => c && !c.ready))); }); });
  function handleCardControlClick(e) {
    const target = e.target && e.target.closest ? e.target : null;
    if (!target) return;
    const nav = target.closest('.shape-nav');
    if (nav && root.contains(nav)) {
      e.preventDefault(); e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      const wrap = nav.closest('[data-shapes-wrap]'); const scroller = wrap && wrap.querySelector('[data-shapes]');
      if (scroller) scroller.scrollBy({ left: nav.classList.contains('next') ? 120 : -120, behavior: 'smooth' });
      return;
    }
    const btn = target.closest('button[data-card-filter], [data-card-filter]');
    if (!btn || !root.contains(btn)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    const cardEl = btn.closest('article[data-card-handle], [data-card-handle]');
    const card = cardEl && state.cards.find(c => c.handle === cardEl.dataset.cardHandle);
    if (!card) return;
    const type = btn.getAttribute('data-card-filter');
    const value = btn.getAttribute('data-value') || btn.getAttribute('data-shape') || btn.getAttribute('data-metal') || btn.title || '';
    const row = selectCardOption(card, type, value);
    applySkuSelection(card, row);
    updateCardDom(cardEl, card);
  }
  // Hard bind on pointerdown + click. Some theme product-card scripts swallow click, so pointerdown updates immediately.
  ['pointerdown','mousedown','touchstart','click'].forEach(evt => {
    if (els.grid) els.grid.addEventListener(evt, handleCardControlClick, true);
    root.addEventListener(evt, handleCardControlClick, true);
    document.addEventListener(evt, function(e) {
      if (e.target && e.target.closest && e.target.closest('[data-wdd-full-plp] [data-card-filter], [data-wdd-full-plp] .shape-nav')) handleCardControlClick(e);
    }, true);
  });
  if (els.filterToggle && els.filters) els.filterToggle.addEventListener('click', () => els.filters.classList.toggle('is-open'));

  function visibleCardHandles() {
    return new Set(state.filtered.slice(0, Math.max(state.shown || cfg.perPage, cfg.perPage)).map(c => c.handle));
  }

  function sortQueueForCurrentView(queue) {
    const visible = visibleCardHandles();
    return [...queue].sort((a, b) => {
      const av = visible.has(a.handle) ? 0 : 1;
      const bv = visible.has(b.handle) ? 0 : 1;
      return av - bv;
    });
  }


  document.addEventListener('click', function(e) {
    const link = e.target && e.target.closest ? e.target.closest('[data-wdd-full-plp] a[href*="/products/"]') : null;
    if (!link) return;
    saveViewSnapshot();
  }, true);

  window.addEventListener('pagehide', saveViewSnapshot);
  window.addEventListener('pageshow', function(e) {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const isBack = !!(e.persisted || (nav && nav.type === 'back_forward'));
    // FIX v60: back navigation pe snapshot restore karo, aur protection time badha ke 6s kiya
    // Yeh BFCache (instant back) dono cases handle karta hai
    if (isBack) {
      setTimeout(() => {
        restoreViewSnapshot(6000);
      }, 0);
    }
  });

  async function processSkuQueue(queue, concurrency = 6, updateEvery = 12, opts = {}) {
    let done = 0;
    const token = opts.token || 0;
    const skipChunkApply = !!opts.skipChunkApply;
    const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (queue.length) {
        if (token && token !== state.filterRunId) return;
        const card = queue.shift();
        if (!card || card.ready) continue;
        const payload = await fetchSku(card);
        if (token && token !== state.filterRunId) return;
        hydrateCardFromSku(card, payload);
        done++;
        // Never repaint count in small chunks while user has active filters.
        if (!skipChunkApply && !hasActivePlpFilters() && done % updateEvery === 0) scheduleApply(false);
      }
    });
    await Promise.all(workers);
  }

  function firstPageProductLimit() {
    const hasBanner = !!root.querySelector('[data-wdd-grid-banner-template]');
    const after = Number(root.dataset.bannerAfter || 10);
    const base = Math.max(1, Number(cfg.perPage || 28));
    // Banner takes one grid slot on the first page, so show one less product
    // whenever banner position is inside first page.
    return hasBanner && after > 0 && after <= base ? Math.max(1, base - 1) : base;
  }

  function showFilterLoadingShell() {
    if (isBackSnapshotProtected()) return;
    const limit = firstPageProductLimit();
    state.shown = limit;
    state.filtered = [];
    if (els.grid) els.grid.innerHTML = buildGridShimmer(limit);
    if (els.count) setProductCountText(0);
    if (els.loadMore) {
      els.loadMore.hidden = true;
      els.loadMore.disabled = true;
      els.loadMore.setAttribute('aria-hidden', 'true');
    }
    if (els.status) els.status.textContent = '';
  }

  function renderFastFilterPreview(token, finalRender = false) {
    if (token && token !== state.filterRunId) return;
    if (!finalRender && isBackSnapshotProtected()) return;
    const readyMatches = sortCards(state.cards.filter(c => c.ready && cardPasses(c)));
    const limit = firstPageProductLimit();
    state.filtered = readyMatches;
    state.shown = Math.min(limit, readyMatches.length);

    if (readyMatches.length) {
      renderGrid(false);
      
    }

    if (finalRender) {
      state.filtered = sortCards(state.cards.filter(cardPasses));
      state.shown = Math.min(limit, state.filtered.length);
      renderGrid(false);
      savePlpCache();
      if (els.status) els.status.textContent = '';
    }
  }

  function forceHydrateForActiveFilters() {
    if (!hasActivePlpFilters()) return;

    const token = ++state.filterRunId;
    const limit = firstPageProductLimit();
    const queue = sortQueueForCurrentView(state.cards.filter(c => c && !c.ready));

    // Existing ready data should update immediately. If no matching ready products exist,
    // show shimmer instead of keeping old/wrong products on screen.
    const readyMatches = sortCards(state.cards.filter(c => c.ready && cardPasses(c)));
    if (readyMatches.length) {
      state.filtered = readyMatches;
      state.shown = Math.min(limit, readyMatches.length);
      if (!isBackSnapshotProtected()) {
        renderGrid(false);
        
      }
    } else if (queue.length) {
      showFilterLoadingShell();
    }

    if (!queue.length) {
      renderFastFilterPreview(token, true);
      return;
    }

    // First priority: get enough matching cards for the first visible page.
    // Then finish the remaining queue silently so Load More/back are fast.
    state.filterHydratePromise = (async () => {
      let matchedPreviewRendered = readyMatches.length >= limit;
      const work = [...queue];
      const workers = Array.from({ length: Math.min(8, Math.max(3, navigator.hardwareConcurrency || 4)) }, async () => {
        while (work.length) {
          if (token !== state.filterRunId) return;
          const card = work.shift();
          if (!card || card.ready) continue;
          const payload = await fetchSku(card);
          if (token !== state.filterRunId) return;
          hydrateCardFromSku(card, payload);

          if (!matchedPreviewRendered) {
            const currentMatches = state.cards.filter(c => c.ready && cardPasses(c));
            if (currentMatches.length >= limit) {
              matchedPreviewRendered = true;
              renderFastFilterPreview(token, false);
            }
          }
        }
      });
      await Promise.all(workers);
      if (token !== state.filterRunId) return;
      renderFastFilterPreview(token, true);
    })().finally(() => {
      if (token === state.filterRunId) state.filterHydratePromise = null;
    });
  }

  function startBackgroundSkuPrewarm(cards) {
    const queue = cards.filter(c => c && !c.ready);
    if (!queue.length) return state.backgroundSkuPromise;
    // FIX: Don't block new prewarm if previous promise already finished silently.
    // Only skip if existing promise is still active AND all new cards are already in-flight.
    if (state.backgroundSkuPromise && queue.every(c => state.skuPromises.has(c.handle) || state.skuCache.has(c.handle))) {
      return state.backgroundSkuPromise;
    }
    state.backgroundSkuPromise = (async () => {
      await processSkuQueue([...queue], 12, 999999, { skipChunkApply: true });
      updateFiltersUi();
      if (!hasActivePlpFilters()) {
        applyFilters(false);
      }else {
            state.filtered = sortCards(state.cards.filter(cardPasses));

            if (!state.shown || state.shown < firstPageProductLimit()) {
                state.shown = Math.min(firstPageProductLimit(), state.filtered.length);
            }

            renderGrid(false);
            // v63: explicit final count
            if (els.count) els.count.textContent = String(state.filtered.length);
        }
      savePlpCache();
      saveFilterOptionsSoon();
    })().finally(() => { state.backgroundSkuPromise = null; });
    return state.backgroundSkuPromise;
  }

  async function loadSkuInQueue() {
    // Speed-first: start prewarming hidden SKUs immediately, while visible cards hydrate.
    // Filter conditions stay unchanged; this only makes first filter clicks use ready/cached data.
    const initialLimit = firstPageProductLimit();
    const visible = state.cards.slice(0, initialLimit);
    const rest = state.cards.slice(initialLimit);

    if (rest.length) startBackgroundSkuPrewarm(rest);

    await processSkuQueue([...visible], 8, 999999, { skipChunkApply: true });
    // v61 FIX: Snapshot protected ho to renderGrid mat chalo
    // Protected period khatam ho to normal apply karo
    if (!isBackSnapshotProtected()) {
      if (!hasActivePlpFilters()) updateFiltersUi();
      applyFilters(false);
      // v63: count setProductCountText par chhod do — woh hasUnready se blank rakhega
      // jab tak background prewarm complete na ho
    } else {
      // Protected — grid mat touch karo, count bhi mat change karo (snapshot ka count sahi hai)
    }
    savePlpCache();
  }
  async function init() {
    try {
      restoreUrl();
      readCollectionFilterOptions();

      // v61: Snapshot pehle restore karo (back navigation ke liye)
      // Protection 6s — is time mein koi bhi renderGrid ya applyFilters snapshot overwrite nahi karega
      const snapshotRestored = restoreViewSnapshot(6000);

      // Session cache se cards restore karo
      const fromCache = restorePlpCache();

      if (!fromCache) {
        // Fresh load — shimmer dikhao, phir products fetch karo
        updateFiltersUi();
        if (els.status) els.status.textContent = '';
        if (els.count) els.count.textContent = '';
        // Snapshot restore hua hai to shimmer mat dikhao
        if (!snapshotRestored && els.grid) els.grid.innerHTML = buildGridShimmer(cfg.perPage || 28);

        state.products = await fetchCollectionProducts();
        state.cards = state.products.map(baseCard);
        hydrateCardsFromLocalSkuCache(state.cards);
        state.filtered = [...state.cards];

        // Snapshot nahi tha to grid render karo
        if (!snapshotRestored) renderGrid();
      }

      // v62 FIX: Active filter chips turant dikhao (snapshot ya fresh dono case)
      // updateActiveFilters sirf chips update karta hai, grid ko touch nahi karta
      if (hasActivePlpFilters()) {
        try { updateActiveFilters(); } catch(e) {}
      }

      // v61 FIX: Back navigation pe SKU queue delay se chalao
      // Snapshot ko settle hone do pehle, phir background hydration start karo
      // No-snapshot case mein turant chalao
      const skuDelay = snapshotRestored ? 400 : 0;
      setTimeout(() => {
        loadSkuInQueue().then(() => {
          if (!hasActivePlpFilters()) state.cards.forEach(resetCardToDefault);
          savePlpCache();
          if (els.status) els.status.textContent = '';
          // v63: count background prewarm ke finally block pe set hoga (sab ready hone ke baad)
          // Yahan set karna WRONG hai — background abhi chal raha ho sakta hai
        }).catch(e => console.warn('[WDD PLP] background SKU init failed', e));
      }, skuDelay);
    }
    catch (e) {
      console.error('[WDD PLP]', e);
      if (els.status) els.status.textContent = 'Products could not be loaded. Please refresh the page.';
    }
  }


  window.WDD_DEBUG_PRODUCT_STYLE = function(handleOrTitle) {
    const needle = key(handleOrTitle || '');
    const card = state.cards.find(c => key(c.handle) === needle || key(c.title).includes(needle) || key(c.baseTitle).includes(needle));
    if (!card) { console.warn('[WDD STYLE DEBUG] card not found:', handleOrTitle); return null; }
    const nameRows = styleRowsForCurrentCard(card);
    const selectedStyles = [...state.filters.style];
    console.group(`[WDD STYLE DEBUG] ${card.handle}`);
    console.log('card title:', card.title);
    console.log('baseTitle:', card.baseTitle);
    console.log('defaultProductName/pdp_title:', card.defaultProductName);
    console.log('defaultRowName USED FOR MATCH:', card.defaultRowName);
    console.log('selected style filters:', selectedStyles.map(v => ({ raw: v, key: styleKey(v) })));
    console.log('all sku rows:', card.sku.length, 'same name rows:', nameRows.length);
    console.table(card.sku.map((r, i) => ({
      i,
      inSameNameGroup: nameRows.includes(r),
      rowName: skuRowNameOnly(r),
      pdpTitleFields: pick(r, ['pdp_name','product_name','product_title','title']),
      sku: rowSku(r),
      show_on_plp: pick(r, ['show_on_plp','plp','show']),
      styleRaw: skuStyle(r),
      styleKey: styleKey(skuStyle(r)),
      metal: skuMetal(r),
      shape: skuShape(r),
      url_key: skuUrlKey(r),
      selectedStyleMatchInSameNameGroup: selectedStyles.length ? selectedStyles.some(v => nameRows.includes(r) && rowHasStyle(r, v)) : ''
    })));
    console.log('styleMatches result:', selectedStyles.map(v => ({style: v, match: styleMatches(card, v)})));
    console.log('current row:', card.currentRow);
    console.groupEnd();
    return { card, sameNameRows: nameRows, selectedStyles };
  };

  window.WDD_DEBUG_STYLE_FILTER = function(styleName) {
    const want = styleName || [...state.filters.style][0] || '';
    console.group(`[WDD STYLE FILTER DEBUG] ${want}`);
    console.table(state.cards.map(card => {
      const rows = styleRowsForCurrentCard(card);
      const matchingRows = rows.filter(r => rowHasStyle(r, want));
      return {
        handle: card.handle,
        title: card.title,
        defaultRowName: card.defaultRowName,
        sameNameRows: rows.length,
        matchingRows: matchingRows.length,
        passes: styleMatches(card, want),
        matchingStyles: matchingRows.map(r => skuStyle(r)).join(' | ')
      };
    }));
    console.groupEnd();
  };

  init();
})();



const filters = document.querySelectorAll('.wdd-filter-group');

// first filter default open
if (filters.length > 0) {
  filters[0].setAttribute('open', '');
}

filters.forEach((detail, index) => {

  detail.addEventListener('click', function (e) {

    // only summary click
    if (!e.target.closest('summary')) return;

    e.preventDefault();

    const isOpen = this.hasAttribute('open');

    // agar already open hai to kuch mat karo
    if (isOpen) return;

    // sab close karo
    filters.forEach((item) => {
      item.removeAttribute('open');
    });

    // current open karo
    this.setAttribute('open', '');

  });

});


document.querySelectorAll('.wdd-filter-group').forEach((detail) => {

  detail.addEventListener('toggle', function () {

    if (this.open) {

      document.querySelectorAll('.wdd-filter-group').forEach((other) => {

        if (other !== this) {
          other.removeAttribute('open');
        }

      });

    }

  });

});

document.addEventListener('DOMContentLoaded', () => {
  const switchCheckbox = document.getElementById('custom-switch');

  const targetCheckbox = document.getElementById(
    'Filter-filter-p-m-custom-quick_ship-1-horizontal-'
  );

  if (!switchCheckbox || !targetCheckbox) return;

  /* ✅ 1. SYNC ON PAGE LOAD */
  if (targetCheckbox.checked) {
    switchCheckbox.checked = true;
  }

  /* ✅ 2. SYNC ON TOGGLE */
  switchCheckbox.addEventListener('change', () => {
    console.log('switch changed');

    if (switchCheckbox.checked) {
      if (!targetCheckbox.checked) {
        console.log('set target checked');
        targetCheckbox.checked = true;
        targetCheckbox.dispatchEvent(
          new Event('change', { bubbles: true })
        );
      }
    } else {
      if (targetCheckbox.checked) {
        console.log('set target unchecked');
        targetCheckbox.checked = false;
        targetCheckbox.dispatchEvent(
          new Event('change', { bubbles: true })
        );
      }
    }
  });
});


/* Count text is written directly by renderGrid; no 3ms interval needed. */

// /* =========================
//    CREATE SLIDER ARROWS
// ========================= */

// document.querySelectorAll('.wdd-filter-options').forEach(slider => {

//   /* AVOID DUPLICATE */
//   if (slider.parentElement.classList.contains('wdd-filter-slider-wrap')) return;

//   /* CREATE WRAP */
//   const wrap = document.createElement('div');
//   wrap.className = 'wdd-filter-slider-wrap';

//   /* CREATE BUTTONS */
//   const prev = document.createElement('button');
//   prev.className = 'wdd-filter-arrow wdd-filter-prev';
//   prev.type = 'button';
//   prev.setAttribute('aria-label', 'Previous');

//   const next = document.createElement('button');
//   next.className = 'wdd-filter-arrow wdd-filter-next';
//   next.type = 'button';
//   next.setAttribute('aria-label', 'Next');

//   /* INSERT WRAP */
//   slider.parentNode.insertBefore(wrap, slider);

//   wrap.appendChild(prev);
//   wrap.appendChild(slider);
//   wrap.appendChild(next);

// });


// /* =========================
//    SLIDER FUNCTIONALITY
// ========================= */

// document.addEventListener('click', function (e) {

//   const prev = e.target.closest('.wdd-filter-prev');
//   const next = e.target.closest('.wdd-filter-next');

//   if (!prev && !next) return;

//   const wrap = e.target.closest('.wdd-filter-slider-wrap');

//   if (!wrap) return;

//   const slider = wrap.querySelector('.wdd-filter-options');

//   if (!slider) return;

//   const firstItem = slider.children[0];

//   const scrollAmount = firstItem
//     ? firstItem.offsetWidth * 3
//     : 200;

//   slider.scrollBy({
//     left: next ? scrollAmount : -scrollAmount,
//     behavior: 'smooth'
//   });

// });


const minInput = document.querySelector("[data-price-min]");
const maxInput = document.querySelector("[data-price-max]");

const minLabel = document.querySelector("[data-price-min-label]");
const maxLabel = document.querySelector("[data-price-max-label]");

const range = document.querySelector(".wdd-dual-range");

function updatePriceSlider() {

  const min = parseInt(minInput.min);
  const max = parseInt(minInput.max);

  let minVal = parseInt(minInput.value);
  let maxVal = parseInt(maxInput.value);

  // prevent overlap
  if (minVal >= maxVal) {
    minVal = maxVal - 1;
    minInput.value = minVal;
  }

  if (maxVal <= minVal) {
    maxVal = minVal + 1;
    maxInput.value = maxVal;
  }

  const minPercent = ((minVal - min) / (max - min)) * 100;
  const maxPercent = ((maxVal - min) / (max - min)) * 100;

  // range fill
  range.style.setProperty("--min-percent", `${minPercent}%`);
  range.style.setProperty("--max-percent", `${maxPercent}%`);

  // tooltip values
  minLabel.innerHTML = `$${minVal.toLocaleString()}`;
  maxLabel.innerHTML = `$${maxVal.toLocaleString()}`;

  // tooltip movement
  minLabel.style.left = `${minPercent}%`;
  maxLabel.style.left = `${maxPercent}%`;
}

minInput.addEventListener("input", updatePriceSlider);
maxInput.addEventListener("input", updatePriceSlider);

updatePriceSlider();




document.addEventListener("DOMContentLoaded",()=>{

  const items = document.querySelectorAll('.wdd-filter-group');

  items.forEach(item=>{

    const summary = item.querySelector('summary');
    const content = summary?.nextElementSibling;

    if(!summary || !content) return;

    // initial state
    if(item.hasAttribute('open')){
      content.style.maxHeight = content.scrollHeight + 'px';
    } else {
      content.style.maxHeight = 0;
    }

    summary.addEventListener('click',(e)=>{

      e.preventDefault();

      const isOpen = item.hasAttribute('open');

      // close others
      items.forEach(other=>{

        if(other !== item){

          const otherContent =
            other.querySelector('summary')?.nextElementSibling;

          other.removeAttribute('open');

          if(otherContent){
            otherContent.style.maxHeight = 0;
          }

        }

      });

      // toggle current
      if(isOpen){
        item.removeAttribute('open');
        content.style.maxHeight = 0;

      }else{

        item.setAttribute('open','');
        content.style.maxHeight =
          content.scrollHeight + 'px';
      }

    });

  });

});