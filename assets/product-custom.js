window.product = {
  currentIndex: 0,
  selected: {
    ring_size: '',
    metal_color: '',
    center_stone_shape: '',
    center_stone_carat_weight: '',
    diamond_carat_weight: '',
    diamond_quality: '',
    gemstone_type_filter: '',
  },
  uniques: {},
  IS_WEDDING: Array.isArray(window.COLLECTION_HANDLES) &&  window.COLLECTION_HANDLES.includes('wedding-bands'),
  IS_BRACELET: Array.isArray(window.COLLECTION_HANDLES) &&  window.COLLECTION_HANDLES.some((h) => /bracelet/i.test(String(h || ''))),
  EXTRA_FILTER_KEYS: ['gemstone_shape', 'diamond_carat_weight', 'gemstone_type', 'length', 'width', 'gemstone_type_filter' ],
  chipKeys: ['metal_color', 'center_stone_shape', 'center_stone_carat_weight'],
  norm: v => (v||'').toString().trim().toLowerCase(),
  pick: (v) => (v !== '' && v != null ? String(v) : null),
  init() {
    const toggleLinks = document.querySelector('.single_product_des .toggle-text');
    if(toggleLinks) {
      toggleLinks.addEventListener('click', () => {
        const parent = document.querySelector('.single_product_des');
        const shortText = parent.querySelector('.short-text');
        const fullText = parent.querySelector('.full-text');
        const isHidden = fullText.classList.contains('hidden');

        if (isHidden) {
          fullText.classList.remove('hidden');
          shortText.classList.add('hidden');
          toggleLinks.textContent = 'Read less';
        } else {
          fullText.classList.add('hidden');
          shortText.classList.remove('hidden');
          toggleLinks.textContent = 'Read more';
        }
      });
    }
    
    window.product.chipKeys.forEach((k) => (window.product.uniques[k] = new Set()));
    window.product.uniques.diamond_quality = new Set();
    window.product.EXTRA_FILTER_KEYS.forEach(function (k) {
      window.product.uniques[k] = new Set();
    });
    const ringSet = new Set();
    window.PDP_ITEMS.forEach((it) => {
      window.product.chipKeys.forEach((k) => it[k] && window.product.uniques[k].add((window.product.norm(it[k]))));
      ['center_stone_quality_1', 'center_stone_quality_2', 'center_stone_quality_3'].forEach((k) => {
        if (it[k]) window.product.uniques.diamond_quality.add((window.product.norm(it[k])));
      });

      window.product.EXTRA_FILTER_KEYS.forEach(function (k) {
        if (!it || it[k] == null) return;
        String(it[k])
          .split(',')
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)
          .forEach(function (v) {
            window.product.uniques[k].add(window.product.norm(v));
          });
      });

      if (it.ring_size)
        String(it.ring_size)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((v) => ringSet.add(v));
    });
    ['center_stone_shape', 'center_stone_carat_weight', 'diamond_quality', 'metal_color'].forEach(this.renderButtons);

    const ringSel = document.querySelector('#pdp-ring-size');
    if (ringSet.size > 0) {
      Array.from(ringSet).forEach((v) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = v;
        ringSel.appendChild(o);
      });
      let ringWrap = document.querySelector('.RING_SIZE_cls'); // your existing wrapper
      if (ringWrap) ringWrap.classList.remove('hidden');
    }
    window.product.EXTRA_FILTER_KEYS.forEach(function (k) {
      if (!(k in window.product.selected)) {
        window.product.selected[k] = '';
      }
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.pdpfx-btn');
      if (!b) return;
      const k = b.dataset.key,
        v = b.dataset.value;
      document.querySelectorAll(`.pdpfx-btn[data-key="${k}"]`).forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      window.product.selected[k] = v;
      this.refreshAtcState(b);
      this.apply();
    });
    ringSel.addEventListener('change', () => {
      window.product.selected.ring_size = ringSel.value;
      this.apply();
    });
    this.refreshAvailability();
    this.updateProduct(window.PDP_ITEMS[0]);
    document.querySelectorAll("#pdpfx-gallery img").forEach((img) =>{
      img.classList.remove('hidden')
    })
  },
  updateSlider() {
    const visibleItems = 7; // ek time me dikhne wale
    const slider = document.querySelector('.diamond-shapes');
    const items = document.querySelectorAll('.diamond-shapes_li');
    const totalItems = window.PDP_ITEMS.length;
    const leftBtn = document.querySelector('.slider-arrow.left');
    const rightBtn = document.querySelector('.slider-arrow.right');
    const itemWidth = items[0].offsetWidth + 15; // 1 item + gap
    slider.style.transform = `translateX(-${this.currentIndex * itemWidth}px)`;

    // Left button disable condition
    if (this.currentIndex === 0) {
      leftBtn.disabled = true;
    } else {
      leftBtn.disabled = false;
    }

    // Right button disable condition
    if (this.currentIndex >= totalItems - visibleItems) {
      rightBtn.disabled = true;
    } else {
      rightBtn.disabled = false;
    }
  },
  scrollShapes(direction) {
    let items = document.querySelectorAll('.diamond-shapes_li');
    let totalItems = window.PDP_ITEMS.length;
    const visibleItems = 7;
    this.currentIndex += direction;
    if (this.currentIndex < 0) this.currentIndex = 0;
    if (this.currentIndex > totalItems - visibleItems) this.currentIndex = totalItems - visibleItems;
    this.updateSlider();
  },
  refreshAvailability() {
    let keys = window.product.IS_WEDDING
      ? ['metal_color', 'center_stone_shape', 'diamond_carat_weight', 'diamond_quality']
      : ['metal_color', 'center_stone_shape', 'center_stone_carat_weight', 'diamond_quality'];

    if (window.product.IS_BRACELET) keys.push('gemstone_type_filter');

    keys = keys.concat(window.product.EXTRA_FILTER_KEYS || []);

    keys = Array.from(new Set(keys));

    keys.forEach((key) => {
      const btns = document.querySelectorAll(`.pdpfx-btn[data-key="${key}"]`);
      if (!btns || !btns.length) return; // agar is key ke buttons hi nahi bane, skip

      const hadPrev = !!window.product.selected[key]; // pehle se selected value thi?
      let defaultPicked = false;
      let defaultValue = window.product.selected[key];

      btns.forEach((btn) => {
        const v = btn.dataset.value;
        const prev = window.product.selected[key];

        window.product.selected[key] = v;
        const any = window.PDP_ITEMS.some(this.matches);
        window.product.selected[key] = prev;
        btn.setAttribute('aria-disabled', any ? 'false' : 'true');

        let isActive = !!prev && prev === v;

        if (!hadPrev && any && !defaultPicked) {
          defaultPicked = true;
          defaultValue = v;
          isActive = true;
        }

        btn.classList.toggle('active', isActive);
      });

      if (!hadPrev && defaultPicked && defaultValue != null) {
        window.product.selected[key] = defaultValue;
      }
    });

    const metalText = document.querySelector('#pdpfx-metal-current');
    if (metalText) {
      metalText.textContent = window.product.selected.metal_color ? `(${window.product.selected.metal_color})` : '';
    }
  },
  updateProduct(item) {
    if (!item) return;
    item.sku = item.sku || pickSKU(item) || skuFromMetafieldSelected();
    const tEl = document.querySelector('[data-product-title]');
    if (tEl && item.pdp_name) tEl.textContent = item.pdp_name;
    const disp = this.computePrice(item, window.product.selected.diamond_quality);
    const pEl = document.querySelector('[data-product-price]');
    if (pEl && disp !== '') pEl.textContent = this.fmtMoney(disp);
    var ala = document.querySelector('.affirm-as-low-as');
    if (ala && disp !== '') ala.setAttribute('data-amount', String(disp));
    const sku = document.querySelector('[data-product-sku]');
    if (sku && item.sku) sku.textContent = item.sku;
    const dElMore = document.querySelector('[data-product-description-more]');
    if (dElMore) {
      dElMore.innerHTML = item.description.length > 100 ? item.description.slice(0, 100) + '...' : item.description;
    }
    const dElLess = document.querySelector('[data-product-description-less]');
    if (dElLess) dElLess.innerHTML = item.description || '';
    const dEl = document.querySelector('[data-product-description]');
    if (dEl) dEl.innerHTML = item.description || '';
    if (Array.isArray(item.media) && item.media.length) this.rebuildGallery(item.media);
  },
  rebuildGallery(urls) {
    const wrap = document.querySelector('#pdpfx-gallery');
    if (!wrap) return;
    wrap.innerHTML = '';
    urls.forEach((u) => {
      const cell = document.createElement('div'); // grey background
      cell.className = 'pdpfx-cell';
      const inner = document.createElement('div'); // centering holder
      inner.className = 'pdpfx-inner';
      if (/\.mp4(\?|$)/i.test(u)) {
        const v = document.createElement('video');
        v.src = u;
        v.autoplay = true;
        v.loop = true;
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        inner.appendChild(v);
      } else if (/\.mov(\?|$)/i.test(u)) {
        const v = document.createElement('video');
        v.src = u;
        v.autoplay = true;
        v.loop = true;
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        inner.appendChild(v);
      } else {
        const img = document.createElement('img');
        img.src = u;
        img.alt = '';
        inner.appendChild(img);
      }
      cell.appendChild(inner);
      wrap.appendChild(cell);
    });
  },
  coerceArray(val) {
    try {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim()) return JSON.parse(val);
      if (val && typeof val === 'object') {
        if (Array.isArray(val.value)) return val.value;
        if (typeof val.value === 'string') return JSON.parse(val.value);
      }
    } catch (e) {
      console.error('[PDP] JSON parse error:', e);
    }
    return [];
  },
  renderButtons(key) {
    const host = document.querySelector(`[data-buttons-for="${key}"]`);
    if (!host) return;
    host.innerHTML = '';
    let vals = Array.from(window.product.uniques[key]);
    if (key === 'diamond_quality') {
      const pref = ['Luxury', 'Signature', 'Classic'];
      vals = vals.sort((a, b) => {
        const ai = pref.findIndex((p) => a.startsWith(p));
        const bi = pref.findIndex((p) => b.startsWith(p));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    }
    vals.forEach((v) => {
      const b = document.createElement('button');
      b.className = 'pdpfx-btn';
      b.type = 'button';
      b.dataset.key = key;
      b.dataset.value = v;
      if (key === 'center_stone_carat_weight') {
        const display = String(v)
          .replace(/\s*ctw?\b/gi, '')
          .replace(/\s*ct\b/gi, '')
          .trim();
        b.textContent = display;
      } else {
        b.textContent = v;
      }
      host.appendChild(b);
    });
  },
  matches(it) {
    try {
      if (window.product.selected.metal_color && window.product.norm(it.metal_color) !== window.product.norm(window.product.selected.metal_color)) return false;
      if (window.product.selected.center_stone_shape && window.product.norm(it.center_stone_shape) !== window.product.norm(window.product.selected.center_stone_shape))
        return false;

      // Carat: wedding-bands => diamond_carat_weight, else center_stone_carat_weight
      if (window.product.IS_WEDDING) {
        if (window.product.selected.diamond_carat_weight) {
          const src = it.diamond_carat_weight ?? '';
          const parts = String(src)
            .split(',')
            .map((s) => s.trim());
          if (!parts.map(window.product.norm).includes(window.product.norm(window.product.selected.diamond_carat_weight))) return false;
        }
      } else {
        if (window.product.selected.center_stone_carat_weight) {
          const src = it.center_stone_carat_weight ?? '';
          const parts = String(src)
            .split(',')
            .map((s) => s.trim());
          if (!parts.map(window.product.norm).includes(window.product.norm(window.product.selected.center_stone_carat_weight))) return false;
        }
      }

      // ✅ Gemstone type (buttons sirf bracelet par honge; matching safe har jagah)
      if (window.product.selected.gemstone_type_filter) {
        const raw = it.gemstone_type_filter ?? '';
        const parts = String(raw)
          .split(',')
          .map((s) => gemKey(s))
          .filter(Boolean);
        if (!parts.includes(window.product.selected.gemstone_type_filter)) return false;
      }

      if (window.product.selected.diamond_quality) {
        const q = window.product.norm(window.product.selected.diamond_quality);
        if (![it.center_stone_quality_1, it.center_stone_quality_2, it.center_stone_quality_3].map(window.product.norm).includes(q))
          return false;
      }
      if (window.product.selected.ring_size) {
        const arr = it.ring_size
          ? String(it.ring_size)
              .split(',')
              .map((s) => s.trim())
          : [];
        if (!arr.includes(window.product.selected.ring_size)) return false;
      }

      window.product.EXTRA_FILTER_KEYS.forEach(function (key) {
        var selVal = window.product.selected[key];
        if (!selVal) return; // kuch choose hi nahi kiya

        var raw = it[key];
        var parts = raw
          ? String(raw)
              .split(',')
              .map(function (s) {
                return s.trim();
              })
          : [];
        var normParts = parts.map(window.product.norm).filter(Boolean);

        if (!normParts.includes(window.product.norm(selVal))) {
          // agar match nahi hua to direct fail
          // NOTE: forEach ke andar se return false possible nahi,
          // isliye flag use karte hain (trick: throw)
          throw new Error('__MISMATCH__');
        }
      });
      return true;
    } catch (e) {
      if (e && e.message === '__MISMATCH__') return false;
      throw e;
    }
  },
  computePrice(item, quality) {
    const q = window.product.norm(quality),
      q1 = window.product.norm(item.center_stone_quality_1),
      q2 = window.product.norm(item.center_stone_quality_2),
      q3 = window.product.norm(item.center_stone_quality_3);
    if (q && q === q1 && window.product.pick(item.price_1)) return window.product.pick(item.price_1);
    if (q && q === q2 && window.product.pick(item.price_2)) return window.product.pick(item.price_2);
    if (q && q === q3 && window.product.pick(item.price_3)) return window.product.pick(item.price_3);
    return window.product.pick(item.price) || window.product.pick(item.price_1) || window.product.pick(item.price_2) || window.product.pick(item.price_3) || '';
  },
  fmtMoney(num) {
    try {
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        // expects cents; CSV price comes as string like "3850"
        const cents = Math.round(parseFloat(num) * 100);
        return Shopify.formatMoney(cents);
      }
    } catch (_) {}
    return '$' + this.numberWithCommas(num); // fallback raw
  },
  numberWithCommas(x) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
  },
  pickSKU(row) {
    if (!row || typeof row !== 'object') return '';
    var keys = [
      'sku',
      'SKU',
      'variant_sku',
      'variantSku',
      'sku_code',
      'SKUCode',
      'product_sku',
      'Variant SKU',
      'id',
      'ID',
    ];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k in row && row[k] != null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
    }
    return '';
  },
  skuFromMetafieldSelected() {
    try {
      var ALL = Array.isArray(window.PDP_ALL_SKUS) ? window.PDP_ALL_SKUS : [];
      if (!ALL.length) return '';

      // collection flags (Liquid)
      var HANDLES = window.COLLECTION_HANDLES;
      console.log(HANDLES);
      HANDLES = Array.isArray(HANDLES) ? HANDLES : [];
      var IS_WEDDING = HANDLES.indexOf('wedding-bands') > -1;
      var IS_BRACELET = HANDLES.some(function (h) {
        return /bracelet/i.test(String(h || ''));
      });

      // pick active selections from your existing 'selected'
      var sel = window.selected || {};
      // carat key by collection
      var caratKey = IS_WEDDING ? 'diamond_carat_weight' : 'center_stone_carat_weight';

      // normalizers
      window.product.norm
      var lowflat = function (s) {
        return window.product.norm(s).toLowerCase().replace(/\s+/g, '');
      };
      var splitCSV = function (v) {
        return String(v == null ? '' : v)
          .split(',')
          .map(function (x) {
            return window.product.norm(x);
          })
          .filter(Boolean);
      };
      var row = ALL.find(this.matches(r)) || ALL[0] || null;
      return this.pickSKU(row);
    } catch (e) {
      return '';
    }
  },
  apply() {
    const m = this.bestMatch();
    current = m;
    window.current = m;
    this.refreshAvailability();
    this.updateProduct(m);
  },
  bestMatch() {
    let pool = window.PDP_ITEMS.filter(this.matches);
    if (pool.length) return pool[0];
    const backup = { ...window.product.selected };

    window.product.selected.diamond_quality = '';
    if (window.PDP_ITEMS.filter(this.matches).length) return window.PDP_ITEMS.filter(this.matches)[0];
    window.product.selected.gemstone_type_filter = '';
    if (window.PDP_ITEMS.filter(this.matches).length) return window.PDP_ITEMS.filter(this.matches)[0]; 

    if (window.product.IS_WEDDING) {
      window.product.selected.diamond_carat_weight = '';
      if (window.PDP_ITEMS.filter(this.matches).length) return window.PDP_ITEMS.filter(this.matches)[0];
    } else {
      window.product.selected.center_stone_carat_weight = '';
      if (window.PDP_ITEMS.filter(this.matches).length) return window.PDP_ITEMS.filter(this.matches)[0];
    }

    window.product.selected.center_stone_shape = '';
    if (window.PDP_ITEMS.filter(this.matches).length) return window.PDP_ITEMS.filter(this.matches)[0];
    window.product.selected.metal_color = '';
    if (window.PDP_ITEMS.filter(this.matches).length) return window.PDP_ITEMS.filter(this.matches)[0];

    Object.assign(window.product.selected, backup);
    return window.PDP_ITEMS[0];
  },
  refreshAtcState(b) {
    const target = this.getTarget();
    const hasVariant = !!(target && target.variant_id);
    const inStock = this.isInStock();
    let btn = document.getElementById('pdp-atc');
    if (hasVariant && inStock) {
      btn.disabled = false;
      btn.classList.remove('opacity-50');
      btn.textContent = defaultLabel;
    } else {
      btn.disabled = true;
      btn.classList.add('opacity-50');
      btn.textContent = 'Sold Out';
    }
  },
  isInStock() {
    const cur = window.current || {};
    if (cur.quantity == null || cur.quantity === '') {
      // quantity nahi hai to block mat karo
      return true;
    }

    var q = Number(cur.quantity);
    if (isNaN(q)) return true;
    return q > 0;
  },
  getTarget() {
    const key = this.resolveOptionMapKeyFromCurrent();
    if (!key) return null;
    return window.OPTION_MAP[key] || null;
  },
  resolveOptionMapKeyFromCurrent() {
    const cur = window.current || {};

    // tokens: yahi 4 cheeze tumhare example key me thi
    // "|||14k rose gold|emerald|3-1/2ctw|lab grown diamond|||||"
    const metal = window.product.norm(
      cur.configurable_metal_type || // "14k Rose Gold"
        (cur.metal_type && cur.metal_color
          ? cur.metal_type + ' ' + cur.metal_color // "14K Gold Rose"
          : cur.metal_color) // "Rose"
    );

    const shape = window.product.norm(cur.gemstone_shape_filter || cur.gemstone_shape || cur.center_stone_shape);

    const carat = window.product.norm(cur.diamond_carat_weight || cur.center_stone_carat_weight);

    const quality = window.product.norm(
      cur.gemstone_type || // "Lab Grown Diamond"
        cur.diamond_quality ||
        cur.center_stone_quality_1 ||
        cur.center_stone_quality_2 ||
        cur.center_stone_quality_3
    );

    const keys = Object.keys(window.OPTION_MAP || {});
    if (!keys.length) {
      console.warn('[PDP ATC] OPTION_MAP empty');
      return '';
    }

    console.log('[PDP ATC] tokens from current:', { metal, shape, carat, quality });

    // har key ko lowercase karke dekho kya ye 4 token usme hain
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var low = k.toLowerCase();

      if (metal && !low.includes(metal)) continue;
      if (shape && !low.includes(shape)) continue;
      if (carat && !low.includes(carat)) continue;
      if (quality && !low.includes(quality)) continue;

      console.log('[PDP ATC] matched OPTION_MAP key:', k);
      return k;
    }

    console.warn('[PDP ATC] no OPTION_MAP key matched for current row');
    return '';
  }
}
window.product.init();


