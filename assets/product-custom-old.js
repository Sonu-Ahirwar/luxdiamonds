// ✅ INIT from ?new_url= (PLP → PDP)
function handleize(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')           // Remove quotes
    .replace(/&/g, 'and')           // Optional: replace & with "and"
    .replace(/[^a-z0-9]+/g, '-')    // Replace non-alphanumeric with -
    .replace(/^-+|-+$/g, '');       // Remove leading/trailing -
}

function initGallerySlider(item) {
  if (!window.jQuery) return;
  const $gallery = jQuery('#pdpfx-gallery');
  if (!$gallery.length) return;
  const isMobile = window.innerWidth < 992;
  /* =====================
    MOBILE → INIT
  ===================== */
  if (isMobile) {
    if (!$gallery.hasClass('owl-loaded')) {
      $gallery.addClass('owl-carousel');
      $gallery.owlCarousel({
        items: 1,
        loop: true,
        dots: true,
        nav: false,
        smartSpeed: 400,
        touchDrag: true,
        mouseDrag: true
      });
    }
  }
  /* =====================
    DESKTOP → DESTROY
  ===================== */
  else {
    if ($gallery.hasClass('owl-loaded')) {
      $gallery.trigger('destroy.owl.carousel');
      $gallery.removeClass('owl-carousel owl-loaded');
      $gallery.find('.owl-stage-outer').children().unwrap();
    }

  }
  const breadcrumb_nnn = document.querySelector('a.breadcrumb__link.primary_collection');

  if (breadcrumb_nnn) {
    const breadcrumb_c_f = breadcrumb_nnn.textContent.trim();
    const breadcrumb_c_n = handleize(breadcrumb_c_f);

    if (breadcrumb_c_n === 'engagement-rings') {
      const interval = setInterval(() => {
        const mediaItems = document.querySelectorAll('#pdpfx-gallery .media-item');
        // console.log('mediaItems.length: ', mediaItems.length)
        if (mediaItems.length > 0) {
          const firstMediaItem = mediaItems[0];
          const mobile_media_top = $('#pdpfx-gallery .owl-item.active');


          if (!firstMediaItem.querySelector('.overlay-bottom-center-text')) {
            const value_c = $('.center_stone_carat_weight_cls .pdpfx-btn.active').text().trim();
            let val_n;

            //  console.log('item: ', item)
            if (item && item.overlay_bottom) {
              val_n = item.overlay_bottom;
            } else {
              val_n = 'Shown with ' + value_c + ' Carat Diamond';
            }
            firstMediaItem.insertAdjacentHTML(
              'beforeend',
              '<span class="overlay-bottom-center-text">' + val_n + ' </span>'
            );
            // console.log('hhh: ', $('#pdpfx-gallery .owl-item.active').length);
            if (!document.querySelector('.overlay-bottom-center-text-mobile')) {
              if (mobile_media_top.length > 0) {
                mobile_media_top[0].insertAdjacentHTML(
                  'beforeend',
                  '<span class="overlay-bottom-center-text-mobile">' +
                  val_n +
                  '</span>'
                );
              }
            }
          }

          clearInterval(interval);
        }
      }, 200);
    }
  }
}
// ---- HAMESHA current PDP gallery se image lo (#pdpfx-gallery) ----
function getVisiblePdpImageURL() {
  const wrap = document.querySelector('#pdpfx-gallery');
  if (!wrap) return '';

  // Pehla img jo gallery me dikha hai
  const img = wrap.querySelector('img');
  if (img) {
    return img.currentSrc || img.src || '';
  }

  // Agar video ho to uska poster/src
  const vid = wrap.querySelector('video');
  if (vid) {
    return vid.poster || vid.currentSrc || vid.src || '';
  }
  return '';
}

function updateNewUrlFromCurrent() {
  const row = window.current || {};
  if (!row.url_key) return;

  const u = new URL(window.location.href);
  const currentKey = u.searchParams.get('new_url');

  if (currentKey === String(row.url_key)) return;

  // keep only new_url
  const cleanUrl = u.pathname + '?new_url=' + encodeURIComponent(row.url_key);
  history.replaceState({}, '', cleanUrl);
}

// Gallery change hote hi global variable update
(function watchPdpImageChanges() {
  const root = document.querySelector('#pdpfx-gallery') || document.body;

  const update = () => {
    window.PDP_SELECTED_IMAGE = getVisiblePdpImageURL();
  };

  const mo = new MutationObserver(update);
  mo.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'srcset', 'poster', 'class'],
  });

  // initial value
  update();
})();

document.addEventListener('DOMContentLoaded', function () {
  const toggleLinks = document.querySelector('.single_product_des .toggle-text');
  if (toggleLinks) {
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
});

let currentIndex = 0;
const visibleItems = 8; // ek time me dikhne wale

function updateSlider(slider, items, selector) {
  if (!items) items = window.PDP_ITEMS;
  const itemWidth = items[0]?.offsetWidth + 15; // 1 item + gap
  slider.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
  const leftBtn = selector.querySelector('.slider-arrow.left');
  const rightBtn = selector.querySelector('.slider-arrow.right');
  const totalItems = items.length;
}

function scrollShapes(direction) {
  const slider = document.querySelector('.diamond-shapes');
  const items = document.querySelectorAll('.diamond-shapes_li');
  const totalItems = items.length;
  const selector = document.querySelector('.shape-slider-wrapper');
  if (!slider || !items.length || !selector) return;
  currentIndex += direction;
  if (currentIndex < 0) currentIndex = 0;
  if (currentIndex > totalItems - visibleItems) currentIndex = totalItems - visibleItems;
  updateSlider(slider, items, selector);
}
function scrollCaratWeight(direction) {
  const slider = document.querySelector('.center_stone_carat_weight_cls');
  const items = document.querySelectorAll('.center_stone_carat_weight_cls .pdpfx-btn');
  const totalItems = items.length;
  const selector = document.querySelector('.carat_weight_outer');
  if (!slider || !items.length || !selector) return;
  currentIndex += direction;
  if (currentIndex < 0) currentIndex = 0;
  if (currentIndex > totalItems - visibleItems) currentIndex = totalItems - visibleItems;
  updateSlider(slider, items, selector);
}

window.addEventListener('load', () => {
  scrollShapes(-1);
  scrollCaratWeight(-1);
});

document.addEventListener('DOMContentLoaded', function () {
  // ✅ agar PLP se new_url aaya hai, to default metal ko force mat karo
  const hasNewUrl = new URLSearchParams(location.search).has('new_url');
  if (hasNewUrl) return;

  const firstMetalBtn = document.querySelector('.metal-colors .pdpfx-btn');
  if (firstMetalBtn) {
    firstMetalBtn.classList.add('active');
    firstMetalBtn.click();
  }
});


function findVariantIdBySku(sku) {
  sku = String(sku || '').trim();
  const variants = Array.isArray(window.PRODUCT_VARIANTS) ? window.PRODUCT_VARIANTS : [];
  const hit = variants.find((v) => String(v.sku || '').trim() === sku);
  return hit ? hit.id : null;
}
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = (v) => String(v || '').trim();

  /* -------- parse metafield -------- */
  function coerceArray(val) {
    try {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim()) return JSON.parse(val);
      if (val && typeof val === 'object') {
        if (Array.isArray(val.value)) return val.value;
        if (typeof val.value === 'string') return JSON.parse(val.value);
      }
    } catch (e) {
      // console.error('[PDP] JSON parse error:', e);
    }
    return [];
  }

  let items = [];
  [window.PDP_ALL_SKUS, window.PDP_ALL_SKUS_RAW, window.PDP_ALL_SKUS?.value, window.PDP_ALL_SKUS_RAW?.value].forEach(
    (c) => {
      if (!items.length) items = coerceArray(c);
    }
  );

  if (!items.length) {
    // console.warn('[PDP] metafield items empty');
    return;
  }

  window.PDP_ITEMS = items;

  /* -------- uniques (options) -------- */
  let chipKeys = [
    'metal_color',
    'center_stone_shape',
    'center_stone_carat_weight',
    'diamond_carat_weight',
    'diamond_quality',
    'gemstone_type_filter',
    'gemstone_shape'
  ];
  const disableGemstoneCategories = [
    'Engagement Rings',
    'Custom Engagement Rings',
    'New Arrivals Engagement Rings',
    'New Arrivals Wedding Bands',
    'Custom Wedding Bands'
  ];

  const disableShapeCategories = [
    'Custom Engagement Rings',
    'New Arrivals Engagement Rings',
    'New Arrivals Wedding Bands',
    'Custom Wedding Bands'
  ];

  if (disableGemstoneCategories.includes(window.current?.category)) {
    chipKeys = chipKeys.filter(key => key !== 'gemstone_shape');

    // Remove from UI
    const gemBlock = document
      .querySelector('[data-buttons-for="gemstone_shape"]')
      ?.closest('.pdpfx-block');

    if (gemBlock) {
      gemBlock.remove();   // 🔥 completely remove from UI
    }
  }
  if (disableShapeCategories.includes(window.current?.category)) {

    chipKeys = chipKeys.filter(key => key !== 'center_stone_shape');

    const shapeWrapper = document.querySelector('.shape-slider-wrapper');
    if (shapeWrapper) {
      shapeWrapper.remove(); // 🔥 पूरा section हट जाएगा
    }
    const shapeWrapperText = document.querySelector('.single_filter_title_SHAPE');
    if (shapeWrapperText) {
      shapeWrapperText.remove(); // 🔥 पूरा section हट जाएगा
    }

  }

  const uniques = {};
  chipKeys.forEach((k) => (uniques[k] = new Set()));
  uniques.diamond_quality = new Set();

  const ringSet = new Set();

  items.forEach((it) => {

    chipKeys.forEach((k) => {
      if (!it[k]) return;
      uniques[k].add(norm(it[k]));
    });

    ['center_stone_quality_1', 'center_stone_quality_2', 'center_stone_quality_3'].forEach((k) => {
      if (it[k]) uniques.diamond_quality.add(norm(it[k]));
    });

    if (it.ring_size)
      String(it.ring_size)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((v) => ringSet.add(v));
  });


  // Helper: parse carat (supports 1-1/2ct)
  function parseCarat_n(val) {
    if (!val) return 0;

    val = String(val)
      .toLowerCase()
      .replace("ctw", "")
      .replace("ct", "")
      .trim();

    // 1-1/2 format
    if (val.includes("-")) {
      const parts = val.split("-");
      const whole = parseFloat(parts[0]) || 0;
      return whole + parseCarat_n(parts[1]);
    }

    // pure fraction like 1/3
    if (val.includes("/")) {
      const parts = val.split("/");
      const num = parseFloat(parts[0]) || 0;
      const den = parseFloat(parts[1]) || 1;
      return num / den;
    }

    return parseFloat(val) || 0;
  }

  // Convert Sets → Arrays and Sort
  Object.keys(uniques).forEach(function (key) {

    let values = Array.from(uniques[key]);
    if (key === "diamond_carat_weight") {
      // sort low → high numeric
      values.sort(function (a, b) {
        return parseCarat_n(a) - parseCarat_n(b);
      });
    }

    uniques[key] = values;

  });


  /* -------- render UI controls -------- */
  function renderButtons(key) {

    const host = $(`[data-buttons-for="${key}"]`);
    if (!host) return;

    let vals = Array.from(uniques[key] || []).filter(v => {
      const t = String(v || '').trim().toLowerCase();
      return t && t !== 'n/a' && t !== '-' && t !== 'null' && t !== 'undefined';
    });

    const block = host.closest('.pdpfx-block');

    if (!vals.length || vals.length <= 1) {
      host.innerHTML = '';
      if (block) block.classList.add('hidden');
      return;
    }

    if (block) block.classList.remove('hidden');

    host.innerHTML = '';

    /* ✅ diamond quality sort */
    if (key === 'diamond_quality') {
      const pref = ['Luxury', 'Signature', 'Classic'];
      vals = vals.sort((a, b) => {
        const ai = pref.findIndex(p => a.startsWith(p));
        const bi = pref.findIndex(p => b.startsWith(p));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    }
    const SHAPE_ORDER = [
      'round',
      'oval',
      'emerald',
      'marquise',
      'pear',
      'princess',
      'cushion',
      'asscher'
    ];

    // sort shapes based on predefined order
    vals.sort(function (a, b) {

      const aIndex = SHAPE_ORDER.indexOf(
        String(a).toLowerCase().replace(/\s+/g, '')
      );

      const bIndex = SHAPE_ORDER.indexOf(
        String(b).toLowerCase().replace(/\s+/g, '')
      );

      // unknown shapes go last
      return (aIndex === -1 ? 999 : aIndex) -
        (bIndex === -1 ? 999 : bIndex);
    });

    vals.forEach((v) => {

      let btnSwiperClass = '';
      if (key === 'center_stone_carat_weight')
        btnSwiperClass = 'swiper-slide';

      const b = document.createElement('button');
      b.className = `pdpfx-btn ${btnSwiperClass}`;
      b.type = 'button';
      b.dataset.key = key;
      b.dataset.value = v;
      if (key === 'gemstone_type_filter') {

        const map = window.imagesPdp || {};
        const normKey = String(v).replace(/\s+/g, '');

        const imgSrc =
          map[normKey] ||
          map[v] ||
          '';

        const title =
          map[normKey + 'Title'] ||
          v;

        b.innerHTML = `
        <span class="gemstone-wrap" data-val="${title}">
          ${imgSrc ? `<img src="${imgSrc}" alt="${title}">` : ''}
        </span>
      `;
      }
      else if (key === 'gemstone_shape') {

        const map = window.WDD_ICONMAP.shape || {};
        const normKey = String(v).replace(/\s+/g, '');

        const imgSrc =
          map[normKey] ||
          map[v] ||
          '';

        const title =
          map[normKey + 'Title'] ||
          v;

        b.innerHTML = `
        <span class="gemstone-shape-wrap" data-val="${title}">
          ${imgSrc ? `<img src="${imgSrc}" alt="${title}">` : ''}
        </span>
      `;

      }
      else if (
        key === 'center_stone_carat_weight' ||
        key === 'diamond_carat_weight'
      ) {

        const display = String(v)
          .replace(/\s*ctw?\b/gi, '')
          .replace(/\s*ct\b/gi, '')
          .trim();

        b.textContent = display;
      }
      else {
        b.textContent = v;
      }

      host.appendChild(b);
    });

    if (key === 'center_stone_carat_weight') {
      document
        .querySelectorAll('.carat_weight-slider-wrapper .slider-arrow')
        .forEach(el => el.classList.remove('hidden'));
    }
  }
  chipKeys.forEach(renderButtons);

  const ringSel = $('#pdp-ring-size');

  if (ringSel && ringSet.size > 0) {

    // ✅ Reset
    ringSel.innerHTML = '';

    // ✅ Placeholder: Select (disabled + selected)
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = 'Select';
    ph.disabled = true;
    ph.selected = true;
    ringSel.appendChild(ph);

    // ✅ Real sizes
    Array.from(ringSet).forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      ringSel.appendChild(o);
    });
    let ringWrap = document.querySelector('.RING_SIZE_cls');
    if (ringWrap) ringWrap.classList.remove('hidden');
    // ✅ Start blank (no auto selection)
    ringSel.value = '';
    if (window.selected) window.selected.ring_size = '';
  }

  (function buildExtraFilters() {
    var host = document.getElementById('pdpfx-extra-filters');
    if (!host) return;
    // helper: label banana from key
    function labelFromKey(key) {
      return String(key || '')
        .replace(/_/g, ' ')
        .toUpperCase();
    }
  })();

  /* -------- state & matching -------- */
  const selected = {
    ring_size: '',
    metal_color: '',
    center_stone_shape: '',
    center_stone_carat_weight: '',
    diamond_carat_weight: '',
    diamond_quality: '',
    gemstone_type_filter: '',
    gemstone_shape: ''
  };

  window.selected = selected;
  let current = items[0];
  window.current = current;

  const COLLECTION_HANDLES = window.COLLECTION_HANDLES;
  // console.log(COLLECTION_HANDLES);
  const IS_WEDDING = Array.isArray(COLLECTION_HANDLES) && COLLECTION_HANDLES.includes('wedding-bands');
  const IS_BRACELET =
    Array.isArray(COLLECTION_HANDLES) && COLLECTION_HANDLES.some((h) => /bracelet/i.test(String(h || '')));

  function gemKey(s) {
    const t = String(s || '').toLowerCase();
    if (t.includes('ruby')) return 'ruby';
    if (t.includes('emerald')) return 'emerald';
    if (t.includes('sapphire')) return 'sapphire';
    return '';
  }

  function matches(it) {
   
    // new macthes
    try {
      if (selected.metal_color && norm(it.metal_color) !== norm(selected.metal_color)) return false;
      if (selected.center_stone_shape && norm(it.center_stone_shape) !== norm(selected.center_stone_shape))
        return false;

      // Carat: wedding-bands => diamond_carat_weight, else center_stone_carat_weight
      if (selected.diamond_carat_weight) {
        const src = it.diamond_carat_weight ?? '';
        const parts = String(src)
          .split(',')
          .map((s) => s.trim());
        if (!parts.map(norm).includes(norm(selected.diamond_carat_weight))) return false;
      }

      if (selected.center_stone_carat_weight) {
        const src = it.center_stone_carat_weight ?? '';
        const parts = String(src)
          .split(',')
          .map((s) => s.trim());
        if (!parts.map(norm).includes(norm(selected.center_stone_carat_weight))) return false;
      }

      // ✅ Carat matching: supports either/both keys
      const hasDiamondSel = !!selected.diamond_carat_weight;
      const hasCenterSel = !!selected.center_stone_carat_weight;

      if (hasDiamondSel || hasCenterSel) {
        const diamondParts = String(it.diamond_carat_weight ?? '')
          .split(',')
          .map((s) => s.trim())
          .map(norm);

        const centerParts = String(it.center_stone_carat_weight ?? '')
          .split(',')
          .map((s) => s.trim())
          .map(norm);

        const wantDiamond = norm(selected.diamond_carat_weight);
        const wantCenter = norm(selected.center_stone_carat_weight);

        // if only one is selected -> that one must match
        if (hasDiamondSel && !hasCenterSel) {
          if (!diamondParts.includes(wantDiamond)) return false;
        } else if (!hasDiamondSel && hasCenterSel) {
          if (!centerParts.includes(wantCenter)) return false;
        } else {
          // both selected -> match either
          const ok = (wantDiamond && diamondParts.includes(wantDiamond)) || (wantCenter && centerParts.includes(wantCenter));
          if (!ok) return false;
        }
      }


      if (selected.diamond_quality) {
        const q = norm(selected.diamond_quality);
        if (![it.center_stone_quality_1, it.center_stone_quality_2, it.center_stone_quality_3].map(norm).includes(q))
          return false;
      }

      const isDisabledCategoryNew = disableGemstoneCategories.includes(window.current?.category);

      if (!isDisabledCategoryNew) {
        if (selected.gemstone_type_filter) {
          const parts = String(it.gemstone_type_filter || '')
            .split(',')
            .map(s => s.trim());
            // issue here 15/10/26
//  console.log('parts: ',parts)
 console.log('selected.gemstone_type_filter: ',selected.gemstone_type_filter)
//  console.log('gemstone_type_filter it: ', it)
          if (!parts.includes(selected.gemstone_type_filter)) return false;
        }

        if (selected.gemstone_shape) {
          const parts = String(it.gemstone_shape || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

          if (!parts.map(norm).includes(norm(selected.gemstone_shape))) return false;
        }
      }
      if (selected.ring_size) {
        const arr = it.ring_size
          ? String(it.ring_size)
            .split(',')
            .map((s) => s.trim())
          : [];
        if (!arr.includes(selected.ring_size)) return false;
      }
      return true;
    } catch (e) {
      if (e && e.message === '__MISMATCH__') return false;
      throw e;
    }
  }

  function bestMatch() {
    let pool = items.filter(matches);
    if (pool.length) return pool[0];
    const backup = { ...selected };

    selected.diamond_quality = '';
    if (items.filter(matches).length) return items.filter(matches)[0];

    selected.diamond_carat_weight = '';
    if (items.filter(matches).length) return items.filter(matches)[0];

    selected.center_stone_carat_weight = '';
    if (items.filter(matches).length) return items.filter(matches)[0];

    selected.center_stone_shape = '';
    if (items.filter(matches).length) return items.filter(matches)[0];
    selected.metal_color = '';
    if (items.filter(matches).length) return items.filter(matches)[0];
     selected.gemstone_type_filter = '';
    if (items.filter(matches).length) return items.filter(matches)[0]; // ✅ NEW

    Object.assign(selected, backup);
    // console.log('items: ', items[0])
    return items[0];
  }

  function refreshAvailability() {
    let keys = ['metal_color', 'center_stone_shape', 'center_stone_carat_weight', 'diamond_quality', 'gemstone_type_filter', 'gemstone_shape', 'diamond_carat_weight'];

    // duplicates hatao
    keys = Array.from(new Set(keys));

    keys.forEach(function (key) {
      const btns = $$(`.pdpfx-btn[data-key="${key}"]`);
      if (!btns || !btns.length) return; // agar is key ke buttons hi nahi bane, skip

      const hadPrev = !!selected[key]; // pehle se selected value thi?
      let defaultPicked = false;
      let defaultValue = selected[key];
      // console.log('defaultValue: ', defaultValue)
      btns.forEach(function (btn) {
        const v = btn.dataset.value;
        const prev = selected[key];

        // is value ke sath koi item available hai?
        selected[key] = v;
        const any = items.some(matches);
        selected[key] = prev;
        // disable/enable
        // btn.setAttribute('aria-disabled', any ? 'false' : 'true');
        const colorsLi = btn.closest('.metal-colors_li');
        // console.log('any: ',any)
        if (!any && colorsLi) btn.closest('.metal-colors_li').classList.add('hidden');
        const metalUl = document.querySelector('.metal-colors');
        if (!metalUl) return;
        const lis = metalUl.querySelectorAll('.metal-colors_li');
        const visibleLis = [...lis].filter(li => !li.classList.contains('hidden'));
        if (visibleLis.length <= 1) {
          document.querySelectorAll('.metal-slider-wrapper').forEach(li => li.classList.add('hidden'));
        }
        // agar pehle selection hai to wahi active
        let isActive = !!prev && prev === v;

        if (!hadPrev && any && !defaultPicked) {
          defaultPicked = true;
          defaultValue = v;
          isActive = true;
        }

        btn.classList.toggle('active', isActive);
      });

      if (!hadPrev && defaultPicked && defaultValue != null) {
        selected[key] = defaultValue;
      }
    });
    const metalText = $('#pdpfx-metal-current');
    if (metalText) {
      let GoldName = ''
      if (selected.metal_color != 'Silver') if (selected.metal_color != 'Platinum') GoldName = ' Gold'
      metalText.textContent = selected.metal_color ? `(${selected.metal_color}${GoldName})` : '';
    }

    const gemstoneText = $('#pdpfx-gemstone-current');
    if (gemstoneText) {
      gemstoneText.textContent = selected.gemstone_type_filter ? `(${selected.gemstone_type_filter})` : '';
    }


    // ✅ force active state to match selected exactly (last step)
    Object.keys(selected).forEach((key) => {
      const btns = document.querySelectorAll(`.pdpfx-btn[data-key="${key}"]`);
      btns.forEach((b) => {
        b.classList.toggle('active', norm(b.dataset.value) === norm(selected[key]));
      });
    });
  }

  function firstCSV(val) {
    if (val == null) return '';
    const parts = String(val).split(',').map(s => String(s).trim()).filter(Boolean);
    return parts[0] || '';
  }


  function waitForNewUrlParam(callback, maxAttempts = 20, interval = 100) {
    let attempts = 0;

    const timer = setInterval(() => {
      const key = (new URLSearchParams(location.search).get('new_url') || '').trim();

      if (key) {
        clearInterval(timer);
        callback(key);
      } else if (++attempts >= maxAttempts) {
        clearInterval(timer);
        console.warn('new_url param not found after waiting');
      }
    }, interval);
  }




  function initFromNewUrl(items) {
    waitForNewUrlParam((key) => {


      const row = items.find(r => String(r?.url_key || '').trim() === key);
      // console.log('Found new_url:', row);
      if (!row) return;

      const first_cat = handleize(row.category);
      const breadcrumb_c = document.querySelector('a.breadcrumb__link.primary_collection');

      if (breadcrumb_c) {
        breadcrumb_c.textContent = row.category;
        breadcrumb_c.href = '/collections/' + first_cat;

        if (first_cat === 'engagement-rings') {
          const interval = setInterval(() => {
            const mediaItems = document.querySelectorAll('#pdpfx-gallery .media-item');
            // console.log('mediaItems.length: ', mediaItems.length)
            if (mediaItems.length > 0) {
              const firstMediaItem = mediaItems[0];

              const mobileMedia = document.querySelector(
                '#pdpfx-gallery .owl-item.active'
              );

              if (
                mobileMedia &&
                !mobileMedia.querySelector('.overlay-bottom-center-text-mobile')
              ) {
                const overlay = document.createElement('span');
                overlay.className = 'overlay-bottom-center-text-mobile';
                overlay.textContent = String(row.overlay_bottom || '');

                mobileMedia.appendChild(overlay);
              }


              clearInterval(interval);
            }
          }, 200); // Check every 200ms
        }
      }
      current = row;
      window.current = row;

      selected.metal_color = String(row.metal_color || '').trim();
      selected.center_stone_shape = String(row.center_stone_shape || '').trim();
      selected.center_stone_carat_weight = firstCSV(row.center_stone_carat_weight || '');
      selected.diamond_carat_weight = firstCSV(row.diamond_carat_weight || '');
      selected.gemstone_type_filter = firstCSV(row.gemstone_type_filter || '');
      selected.gemstone_shape = firstCSV(row.gemstone_shape || '');

      const qlist = [row.center_stone_quality_1, row.center_stone_quality_2, row.center_stone_quality_3]
        .map(x => String(x || '').trim())
        .filter(Boolean);

      selected.diamond_quality = String(row.diamond_quality || '').trim() || qlist[0] || '';
      selected.ring_size = '';

      syncSelectedFromItem(row);
      refreshAvailability();
      updateProduct(row);

      document.documentElement.classList.remove('pdpfx-booting');

      setTimeout(() => {
        const loader = document.getElementById('pdp-init-loader');
        if (loader) loader.classList.add('hidden');
      }, 300);

      setTimeout(() => document.dispatchEvent(new CustomEvent('pdpfx:changed')), 0);
    });
  }


  function syncSelectedFromItem(it) {
    if (!it) return;
    console.log('sel: ', it)

    // ✅ simple keys (always safe)
    if (it.metal_color) selected.metal_color = String(it.metal_color).trim();
    if (it.center_stone_shape) selected.center_stone_shape = String(it.center_stone_shape).trim();

    if (it.gemstone_type_filter) {
      console.log('gemstone_type_filter: ', it.gemstone_type_filter)
      selected.gemstone_type_filter = String(it.gemstone_type_filter)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)[0] || '';
    }

    if (it.gemstone_shape) {
      selected.gemstone_shape = String(it.gemstone_shape)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)[0] || '';
    }


    // diamond quality: item me jo available ho, usi me se selected rakho
    if (selected.diamond_quality) {
      const q = String(selected.diamond_quality).trim();
      const qlist = [it.center_stone_quality_1, it.center_stone_quality_2, it.center_stone_quality_3]
        .map(x => String(x || '').trim())
        .filter(Boolean);
      if (qlist.length && !qlist.includes(q)) {
        selected.diamond_quality = qlist[0]; // ✅ force valid quality
      }
    } else {
      const qlist = [it.center_stone_quality_1, it.center_stone_quality_2, it.center_stone_quality_3]
        .map(x => String(x || '').trim())
        .filter(Boolean);
      if (qlist.length) selected.diamond_quality = qlist[0];
    }

    // ring size: agar selected invalid ho gaya, item ka first ring size
    if (selected.ring_size) {
      const rs = String(it.ring_size || '').split(',').map(s => s.trim()).filter(Boolean);
      if (rs.length && !rs.includes(selected.ring_size)) {
        selected.ring_size = rs[0];
      }
    } else {
      // const rs = String(it.ring_size || '').split(',').map(s=>s.trim()).filter(Boolean);
      // if (rs.length) selected.ring_size = rs[0];
      selected.ring_size = '';
    }

    // ✅ CARAT: yahi main part
    const cCenter = firstCSV(it.center_stone_carat_weight);
    const cDiamond = firstCSV(it.diamond_carat_weight);

    const last = window.__PDP_LAST_CARAT_KEY__ || '';

    if (last === 'diamond_carat_weight') {
      // user diamond carat pe tha
      selected.diamond_carat_weight = cDiamond || selected.diamond_carat_weight || '';
      // center ko item ke hisaab se bhi set kar do (if exists), but do NOT force same
      selected.center_stone_carat_weight = cCenter || selected.center_stone_carat_weight || '';
    } else if (last === 'center_stone_carat_weight') {
      selected.center_stone_carat_weight = cCenter || selected.center_stone_carat_weight || '';
      selected.diamond_carat_weight = cDiamond || selected.diamond_carat_weight || '';
    } else {
      // no preference yet → item me jo hai woh set
      if (cCenter) selected.center_stone_carat_weight = cCenter;
      if (cDiamond) selected.diamond_carat_weight = cDiamond;
    }
  }


  function apply() {
    const m = bestMatch();
    current = m;
    window.current = m;
    syncSelectedFromItem(m);
    refreshAvailability();
    updateProduct(m);
    updateNewUrlFromCurrent();
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('pdpfx:changed'));
    }, 0);

    // NEW: background resolve prewarm
    setTimeout(() => {
      if (typeof window.prewarmResolveVariant === 'function') {
        window.prewarmResolveVariant().catch(() => { });
      }
    }, 0);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.pdpfx-btn');
    if (!b) return;
    const k = b.dataset.key,
      v = b.dataset.value;
    $$(`.pdpfx-btn[data-key="${k}"]`).forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    selected[k] = v;
    apply();
    affirm.ui.refresh();
  });
  if (ringSel && ringSet.size > 0) {
    ringSel.addEventListener('change', () => {
      selected.ring_size = ringSel.value;
      apply();
    });
  }
  /* -------- price mapping -------- */
  function computePrice(item, quality) {
    const q = norm(quality),
      q1 = norm(item.center_stone_quality_1),
      q2 = norm(item.center_stone_quality_2),
      q3 = norm(item.center_stone_quality_3);
    const pick = (v) => (v !== '' && v != null ? String(v) : null);
    if (q && q === q1 && pick(item.price_1)) return pick(item.price_1);
    if (q && q === q2 && pick(item.price_2)) return pick(item.price_2);
    if (q && q === q3 && pick(item.price_3)) return pick(item.price_3);
    return pick(item.price) || pick(item.price_1) || pick(item.price_2) || pick(item.price_3) || '';
  }

  function parseDiscountValue(val) {
    if (val == null) return null;
    const cleaned = String(val).replace('%', '').trim();
    if (!cleaned) return null;

    const num = parseFloat(cleaned);
    if (!Number.isFinite(num) || num <= 0) return null;

    return num;
  }

  function computeDisplayPrice(item) {
    const basePrice = parseFloat(computePrice(item, selected?.diamond_quality || ''));
    if (!Number.isFinite(basePrice)) {
      return {
        base: null,
        final: null,
        hasDiscount: false,
        discountPercent: null
      };
    }

    const discountPercent = parseDiscountValue(item.special_price);

    if (discountPercent == null) {
      return {
        base: basePrice,
        final: basePrice,
        hasDiscount: false,
        discountPercent: null
      };
    }

    const discounted = Math.max(
      0,
      Math.round((basePrice - (basePrice * discountPercent / 100)) * 100) / 100
    );

    return {
      base: basePrice,
      final: discounted,
      hasDiscount: true,
      discountPercent: discountPercent
    };
  }

  function fmtMoney(num) {
    try {
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        // expects cents; CSV price comes as string like "3850"
        const cents = Math.round(parseFloat(num) * 100);
        return Shopify.formatMoney(cents);
      }
    } catch (_) { }
    return '$' + numberWithCommas(num); // fallback raw
  }

  function numberWithCommas(x) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
  }

  function pickSKU(row) {
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
  }

  function skuFromMetafieldSelected() {
    try {
      var ALL = Array.isArray(window.PDP_ALL_SKUS) ? window.PDP_ALL_SKUS : [];
      if (!ALL.length) return '';

      // collection flags (Liquid)
      var HANDLES = window.COLLECTION_HANDLES;
      // console.log(HANDLES);
      HANDLES = Array.isArray(HANDLES) ? HANDLES : [];
      var IS_WEDDING = HANDLES.indexOf('wedding-bands') > -1;
      var IS_BRACELET = HANDLES.some(function (h) {
        return /bracelet/i.test(String(h || ''));
      });

      // pick active selections from your existing 'selected'
      var sel = window.selected || {};
      // carat key by collection

      // normalizers
      var norm = function (s) {
        return String(s == null ? '' : s).trim();
      };
      var lowflat = function (s) {
        return norm(s).toLowerCase().replace(/\s+/g, '');
      };
      var splitCSV = function (v) {
        return String(v == null ? '' : v)
          .split(',')
          .map(function (x) {
            return norm(x);
          })
          .filter(Boolean);
      };

      function matches(r) {
        // console.log('matches: ', r)
        if (!r) return false;

        // metal
        if (sel.metal_color && norm(r.metal_color) !== norm(sel.metal_color)) return false;

        // shape
        if (sel.center_stone_shape && norm(r.center_stone_shape) !== norm(sel.center_stone_shape)) return false;

        // carat (collection-aware, CSV-safe)
        if (sel.center_stone_carat_weight) {
          var parts = splitCSV(sel.center_stone_carat_weight);
          if (parts.indexOf(norm(sel.center_stone_carat_weight)) === -1) return false;
        }

        if (sel.diamond_carat_weight) {
          var parts = splitCSV(sel.diamond_carat_weight);
          if (parts.indexOf(norm(sel.diamond_carat_weight)) === -1) return false;
        }

        // diamond quality (from any of the 3)
        if (sel.diamond_quality) {
          var q = norm(sel.diamond_quality);
          var qlist = [r.center_stone_quality_1, r.center_stone_quality_2, r.center_stone_quality_3]
            .map(norm)
            .filter(Boolean);
          if (qlist.indexOf(q) === -1) return false;
        }

        // ring size (CSV-safe)
        if (sel.ring_size) {
          var rs = splitCSV(r.ring_size);
          if (rs.indexOf(sel.ring_size) === -1) return false;
        }

        return true;
      }

      var row = ALL.find(matches) || ALL[0] || null;
      return pickSKU(row);
    } catch (e) {
      return '';
    }
  }

  /* -------- PDP updates -------- */
  function updateProduct(item) {
    // console.log('updateProduct:', item)
    const setText = (sel, val) => {
      const el = $(sel);
      if (el) el.innerText = (val == null ? '' : String(val));
      return !!el;
    };
    const hideIfMissingValue = (wrapSel, hasVal) => {
      const w = $(wrapSel);
      if (!w) return;
      if (hasVal) w.classList.remove('hidden');
      else w.classList.add('hidden');
    };
    if (!item) return;
    item.sku = item.sku || pickSKU(item) || skuFromMetafieldSelected();
    const tEl = $('[data-product-title]');
    const tEl_breadcrumb = $('.breadcrumb__current');
    if (tEl && item.pdp_name) tEl.textContent = item.pdp_name;
    if (tEl_breadcrumb && item.pdp_name) tEl_breadcrumb.textContent = item.pdp_name;
    // const disp = computePrice(item, selected.diamond_quality);
    // const pEl = $('[data-product-price]');
    // if (pEl && disp !== '') pEl.textContent = fmtMoney(disp);
    // var ala = document.querySelector('.affirm-as-low-as');
    // if (ala && disp !== '') ala.setAttribute('data-amount', String(disp));
    const priceObj = computeDisplayPrice(item);

    const pEl = $('[data-product-price]');
    const compareEl = $('[data-product-compare-price]');

    if (pEl && priceObj.final != null) {
      pEl.textContent = fmtMoney(priceObj.final);
      // affirm.ui.refresh();
    }

    if (compareEl) {
      if (priceObj.hasDiscount && priceObj.base != null) {
        compareEl.textContent = fmtMoney(priceObj.base);
        compareEl.classList.remove('hidden');
      } else {
        compareEl.textContent = '';
        compareEl.classList.add('hidden');
      }
    }

    var ala = document.querySelector('.affirm-as-low-as');
    if (ala && priceObj.final != null) {
      ala.setAttribute('data-amount', String(priceObj.final * 100));
    }

    const sku = $('[data-product-sku]');
    if (sku && item.sku) sku.textContent = item.sku;
    const dElMore = $('[data-product-description-more]');
    if (dElMore) {
      dElMore.innerHTML = item.description.length > 100 ? item.description.slice(0, 100) + '...' : item.description;
      if (item.description.length > 100) document.querySelector('.single_product_des .toggle-text').classList.remove('hidden');
    }
    const dElLess = $('[data-product-description-less]');
    if (dElLess) dElLess.innerHTML = item.description || '';
    const dEl = $('[data-product-description]');
    if (dEl) {
      // SKU
      setText('#data-product_stock .desc-value', item.sku || '');
      hideIfMissingValue('#data-product_stock', !!item.sku);

      // STYLE
      setText('#data-product_style .desc-value', item.style || '');
      hideIfMissingValue('#data-product_style', !!item.style);

      // DESIGNER
      setText('#data-product_designer .desc-value', item.collection_handle || '');
      hideIfMissingValue('#data-product_designer', !!item.collection_handle);

      // SIDE STONE TYPE
      setText('#data-product_side-stone-type .desc-value', item.gemstone_type || '');
      hideIfMissingValue('#data-product_side-stone-type', !!item.gemstone_type);

      // GEMSTONE SHAPE
      setText('#data-product_gemstone_shape .desc-value', item.gemstone_shape || '');
      hideIfMissingValue('#data-product_gemstone_shape', !!item.gemstone_shape);

      // DIAMOND CLARITY
      setText('#data-product_diamond_clarity .desc-value', item.diamond_clarity || '');
      hideIfMissingValue('#data-product_diamond_clarity', !!item.diamond_clarity);

      // DIAMOND COLOR
      setText('#data-product_diamond_color .desc-value', item.diamond_color || '');
      hideIfMissingValue('#data-product_diamond_color', !!item.diamond_color);

      // GEMSTONE SETTING
      setText('#data-product_gemstone_setting .desc-value', item.gemstone_setting || '');
      hideIfMissingValue('#data-product_gemstone_setting', !!item.gemstone_setting);

      // SIDE DIAMOND CARAT
      setText('#data-product_side-diamond-caret-weight .desc-value', item.diamond_carat_weight || '');
      hideIfMissingValue('#data-product_side-diamond-caret-weight', !!item.diamond_carat_weight);

      // METAL TYPE
      setText('#data-product_metal-type .desc-value', item.metal_type || '');
      hideIfMissingValue('#data-product_metal-type', !!item.metal_type);

      // METAL COLOR
      setText('#data-product_metal-value .desc-value', item.metal_color || '');
      hideIfMissingValue('#data-product_metal-value', !!item.metal_color);

      setText('#data-product_main-desc', item.description || '');
      hideIfMissingValue('#data-product_main-desc', !!item.description);

      // CENTER STONE QUALITY

      var btn_n = document.querySelector('.DIAMOND_QUALITY_cls button.active');

      var val_n = btn_n ? btn_n.getAttribute('data-value') : null;

      if (val_n && val_n.trim() !== '') {
        setText('#data-product_center-stone-quality .desc-value', val_n || '');
      } else {
        setText('#data-product_center-stone-quality .desc-value', item.center_stone_quality_1 || '');
      }
      // setText('#data-product_center-stone-quality .desc-value', item.center_stone_quality_1 || '');
      hideIfMissingValue('#data-product_center-stone-quality', !!item.center_stone_quality_1);

      // CENTER STONE TYPE
      setText('#data-product_center-stone-type .desc-value', item.gemstone_type || '');
      hideIfMissingValue('#data-product_center-stone-type', !!item.gemstone_type);

      // CENTER STONE CARAT
      setText('#data-product_stone-caret-weight .desc-value', item.center_stone_carat_weight || '');
      hideIfMissingValue('#data-product_stone-caret-weight', !!item.center_stone_carat_weight);

      // CENTER STONE SHAPE
      setText('#data-product_sahpe .desc-value', item.center_stone_shape || '');
      hideIfMissingValue('#data-product_sahpe', !!item.center_stone_shape);

      // CERTIFICATE
      setText('#data-product_certificate .desc-value', item.center_stone_certification || '');
      hideIfMissingValue('#data-product_certificate', !!item.center_stone_certification);

      // CUT
      setText('#data-product_cut .desc-value', item.center_stone_cut || '');
      hideIfMissingValue('#data-product_cut', !!item.center_stone_cut);

      // SETTING
      setText('#data-product_setting .desc-value', item.center_stone_setting || '');
      hideIfMissingValue('#data-product_setting', !!item.center_stone_setting);


    }
    let shipping_time = $('#shipping_time');
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(item.shipping_time));
    const options = { month: "short", day: "numeric" };
    const formattedDate = futureDate.toLocaleDateString("en-US", options);

    if (shipping_time) shipping_time.innerHTML = formattedDate;
    if (Array.isArray(item.media) && item.media.length) rebuildGallery(item.media, item);
    let icon_outer_pdp = document.querySelector('#icon_outer_pdp');

    if (item.made_in_usa == 'yes') {
      let made_in_usa = document.querySelector('#made_in_usa')
      if (made_in_usa) made_in_usa.classList.remove('hidden');
      if (icon_outer_pdp) icon_outer_pdp.classList.remove('hidden');
    }

    if (item.recycled_metals == 'yes') {
      let recycled_metals = document.querySelector('#recycled_metals')
      if (recycled_metals) recycled_metals.classList.remove('hidden');

      let recycled_metals_disc = document.querySelector('#recycled_metals')
      if (recycled_metals_disc) recycled_metals_disc.classList.remove('hidden');
      if (icon_outer_pdp) icon_outer_pdp.classList.remove('hidden');
    }
    let collection_handle = document.querySelector('collection_handle');
    if (collection_handle) collection_handle.innerText = item.collection_handle;

  }

  function rebuildGallery(urls, item) {

    const wrap = document.querySelector('#pdpfx-gallery');
    if (!wrap) return;

    /* -------------------------------
      1️⃣ Destroy existing Owl safely
    --------------------------------*/
    if (window.jQuery && jQuery(wrap).hasClass('owl-loaded')) {
      jQuery(wrap).trigger('destroy.owl.carousel');
      jQuery(wrap)
        .removeClass('owl-carousel owl-loaded')
        .find('.owl-stage-outer')
        .children()
        .unwrap();
    }
    /* -------------------------------
      2️⃣ Clear gallery
    --------------------------------*/
    wrap.innerHTML = '';
    /* -------------------------------
      3️⃣ Build items
    --------------------------------*/
    urls.forEach(function (u) {

      const cell = document.createElement('div');
      cell.className = 'pdpfx-cell item';

      const inner = document.createElement('div');
      inner.className = 'pdpfx-inner';

      if (/\.mp4(\?|$)/i.test(u) || /\.mov(\?|$)/i.test(u)) {

        const video = document.createElement('video');
        video.src = u;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        inner.appendChild(video);

      } else {

        const img = document.createElement('img');
        img.src = u;
        img.alt = '';
        inner.appendChild(img);
      }

      cell.appendChild(inner);
      wrap.appendChild(cell);
    });

    /* -------------------------------
      4️⃣ Init Owl ONLY on mobile
    --------------------------------*/
    setTimeout(() => {
      initGallerySlider(item);
    }, 100);
  }
  /* -------- ATC with uuid so lines don't merge -------- */
  /* init */
  if (!initFromNewUrl(items)) {
    refreshAvailability();
    updateProduct(items[0]);

    // NEW: background resolve prewarm
    setTimeout(() => {
      if (typeof window.prewarmResolveVariant === 'function') {
        window.prewarmResolveVariant().catch(() => { });
      }
    }, 0);
  }
})();
(function () {
  // ===============================
  // CONFIG
  // ===============================
  const APP_PROXY_ENDPOINT = '/apps/configurator/resolve'; // ✅ Shopify App Proxy (prefix apps, subpath configurator)
  const ENGRAVING_ADDON_VARIANT_ID = 48128791511261;

  // ===============================
  // HELPERS (UI se exact data)
  // ===============================
  function $(sel) {
    return document.querySelector(sel);
  }

  const PROPERTY_LABELS = {
    metal_color: "Metal Color",
    center_stone_shape: "Center Stone Shape",
    center_stone_carat_weight: "Center Stone Carat",
    diamond_carat_weight: "Diamond Carat",
    diamond_quality: "Diamond Quality",
    ring_size: "Ring Size",
    gemstone_type_filter: "Gemstone Type",
    gemstone_shape: "Gemstone Shape",
    sku: "SKU",
    shipping_time: "Shipping Time",
    // engraving labels
    engraving: "Engraving",
    engraving_text: "Engraving Text",
    engraving_font: "Engraving Font",
  };
  function prettifyKey(k) {
    return PROPERTY_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function getDisplayedTitle() {
    return $('[data-product-title]')?.textContent?.trim() || '';
  }
  function getDisplayedSku() {
    return $('[data-product-sku]')?.textContent?.trim() || '';
  }
  function getDisplayedPriceText() {
    return $('[data-product-price]')?.textContent?.trim() || '';
  }
  function getDisplayedDescription() {
    // apne DOM ke hisaab se yaha selector change kar sakte ho
    // console.log('description: ', $('#data-product_main-desc')?.textContent?.trim())
    return $('#data-product_main-desc')?.textContent?.trim() || '';
  }

  function getDisplayedImage() {
    // tumhare existing functions
    if (window.PDP_SELECTED_IMAGE) return window.PDP_SELECTED_IMAGE;
    if (typeof window.getVisiblePdpImageURL === 'function') return window.getVisiblePdpImageURL();
    return '';
  }

  function parsePriceNumber(text) {
    // "$3,850" -> 3850
    const n = String(text || '').replace(/[^0-9.]/g, '').trim();
    return n ? Number(n) : null;
  }

  function getSelected() {
    return window.selected || {};
  }
  function getCurrent() {
    return window.current || {};
  }

  function getEngravingValue() {
    return document.querySelector('input[name="engraving"]:checked')?.value || 'no';
  }
  function getEngravingText() {
    return (document.getElementById('engraving_formBasicEmail')?.value || '').trim();
  }
  function getEngravingFont() {
    return (document.getElementById('engraving_select')?.value || 'Times New Roman').trim();
  }

  function setBtnLoading(btn, defaultLabel, isLoading) {
    btn.disabled = !!isLoading;
    btn.textContent = isLoading ? 'Adding...' : defaultLabel;
  }

  function getFallbackVariantId() {
    const id = Number(window.__PDP_FALLBACK_VARIANT_ID__);
    if (Number.isFinite(id) && id > 0) return id;
    return null;
  }

  function cleanProperties(obj) {
    const out = {};
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v == null) return;
      const s = String(v).trim();
      if (!s) return;
      out[k] = s;
    });
    return out;
  }

  function getDisplayedImageSafe() {
    try {
      if (window.PDP_SELECTED_IMAGE) return window.PDP_SELECTED_IMAGE;
      if (typeof getVisiblePdpImageURL === 'function') return getVisiblePdpImageURL();
    } catch (e) { }
    return '';
  }

  // ===============================
  // RESOLVER CALL (App Proxy)
  // ===============================
  async function resolveVariant(payload) {
    const res = await fetch(APP_PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data || !data.ok) {
      throw new Error(data?.error || `Resolver failed (${res.status})`);
    }
    if (!data.variant_id) {
      throw new Error('variant_id missing from resolver response');
    }
    return data;
  }

  // ===============================
  // CART ADD (single call, ordered)
  // ===============================
  async function addItemsToCart(items) {

    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });


    if (res.ok) return res.json();

    const txt = await res.text();
    throw new Error('cart_add_failed: ' + txt);
  }

  // ===============================
  // BUILD PAYLOAD (server ko)
  // ===============================
  function buildResolverPayload() {
    const cur = getCurrent();
    const sel = getSelected();

    const priceText = getDisplayedPriceText();
    const priceNum = parsePriceNumber(priceText);

    const engravingValue = document.querySelector('input[name="engraving"]:checked')?.value || 'no';
    const engraving_text = document.getElementById('engraving_formBasicEmail')?.value?.trim() || '';
    const engraving_font = document.getElementById('engraving_select')?.value || '';

    const filters = { ...sel };

    const customRingInput = document.getElementById('custom-ring-size');
    const customRingValue = (customRingInput?.value || '').trim();

    if (filters.ring_size === 'Custom' && customRingValue) {
      filters.ring_size = customRingValue;
      filters.ring_size_type = 'Custom';
    }

    Object.keys(filters).forEach(k => {
      if (filters[k] == null || String(filters[k]).trim() === '') delete filters[k];
    });

    if (engravingValue === 'yes') {
      filters.engraving = 'yes';
      filters.engraving_text = engraving_text;
      filters.engraving_font = engraving_font;
    }

    return {
      parent_product_id: window.__PARENT_PRODUCT_ID__ || null,
      parent_handle: window.__PARENT_HANDLE__ || null,

      sku: getDisplayedSku() || (cur.sku || ''),
      title: getDisplayedTitle() || (cur.pdp_name || ''),
      description: getDisplayedDescription() || (cur.description || ''),
      image: getDisplayedImage(),
      price: priceNum,
      price_text: priceText,

      filters,
      url_key: cur.url_key || (new URLSearchParams(location.search).get('new_url') || ''),
    };
  }

  function generateBundleId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'bundle_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }

  // ===============================
  // MAIN INIT (attach submit)
  // ===============================
  window.__PDP_RESOLVE_PROMISE__ = null;
  window.__PDP_RESOLVE_RESULT__ = null;
  window.__PDP_RESOLVE_KEY__ = '';
  window.__PDP_RESOLVE_TS__ = 0;
  window.__PDP_RESOLVE_CACHE_TTL__ = 15000;

  window.buildResolveCacheKey = function (payload) {
    return JSON.stringify({
      parent_product_id: payload.parent_product_id || '',
      url_key: payload.url_key || '',
      sku: payload.sku || '',
      price: payload.price || '',
      filters: payload.filters || {}
    });
  };

  window.getFreshResolvedFromCache = function (key) {
    const fresh = (Date.now() - window.__PDP_RESOLVE_TS__) < window.__PDP_RESOLVE_CACHE_TTL__;
    if (fresh && window.__PDP_RESOLVE_RESULT__ && window.__PDP_RESOLVE_KEY__ === key) {
      return window.__PDP_RESOLVE_RESULT__;
    }
    return null;
  };

  window.prewarmResolveVariant = async function () {
    try {
      const payload = buildResolverPayload();
      const key = window.buildResolveCacheKey(payload);

      const cached = window.getFreshResolvedFromCache(key);
      if (cached) return cached;

      if (window.__PDP_RESOLVE_PROMISE__ && window.__PDP_RESOLVE_KEY__ === key) {
        return await window.__PDP_RESOLVE_PROMISE__;
      }

      window.__PDP_RESOLVE_KEY__ = key;
      window.__PDP_RESOLVE_PROMISE__ = resolveVariant(payload)
        .then((resolved) => {
          window.__PDP_RESOLVE_RESULT__ = resolved;
          window.__PDP_RESOLVE_TS__ = Date.now();
          return resolved;
        })
        .catch((err) => {
          window.__PDP_RESOLVE_PROMISE__ = null;
          throw err;
        });

      return await window.__PDP_RESOLVE_PROMISE__;
    } catch (e) {
      return null;
    }
  };


  function initConfiguratorATC() {
    let __ATC_IN_FLIGHT__ = false;
    const btn = document.getElementById('pdp-atc');
    const form = document.getElementById('pdp-product-form');
    if (!btn || !form) return;

    // ✅ prevent double-binding
    if (form.__CONFIG_ATC_BOUND__) return;
    form.__CONFIG_ATC_BOUND__ = true;

    const defaultLabel = (btn.textContent || 'Add to cart').trim();

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      try {

        // ✅ ring size validate ONLY if dropdown exists AND is visible (not hidden)
        const ringWrap = document.querySelector('.RING_SIZE_cls');
        const ringSelEl = document.getElementById('pdp-ring-size');
        const customRingInput = document.getElementById('custom-ring-size');

        const ringSizeRequired =
          !!ringSelEl &&
          !!ringWrap &&
          !ringWrap.classList.contains('hidden') &&
          ringWrap.offsetParent !== null; // visible check

        if (ringSizeRequired) {
          const ringVal = (window.selected?.ring_size || ringSelEl.value || '').trim();
          if (!ringVal) {
            alert('Please select ring size');
            return; // stop add to cart
          }

          if (ringVal === 'Custom') {
            const customVal = (customRingInput?.value || '').trim();

            if (!customVal) {
              if (customRingInput) customRingInput.classList.add('error');
              alert('Please enter ring size');
              return;
            } else {
              if (customRingInput) customRingInput.classList.remove('error');
            }
          }
        }

        if (__ATC_IN_FLIGHT__) return;
        __ATC_IN_FLIGHT__ = true;
        // ---- engraving validation ----
        const engravingVal = getEngravingValue();
        if (engravingVal === 'yes') {
          const txt = document.getElementById('engraving_formBasicEmail');
          if (txt && !getEngravingText()) {
            txt.classList.add('error');
            return;
          } else if (txt) {
            txt.classList.remove('error');
          }
        }

        setBtnLoading(btn, defaultLabel, true);

        // 1) resolver
        const payload = buildResolverPayload();
        const key = window.buildResolveCacheKey(payload);

        let resolved = window.getFreshResolvedFromCache(key);

        if (!resolved) {
          if (window.__PDP_RESOLVE_PROMISE__ && window.__PDP_RESOLVE_KEY__ === key) {
            resolved = await window.__PDP_RESOLVE_PROMISE__;
          } else {
            resolved = await resolveVariant(payload);
            window.__PDP_RESOLVE_RESULT__ = resolved;
            window.__PDP_RESOLVE_KEY__ = key;
            window.__PDP_RESOLVE_TS__ = Date.now();
          }
        }
        // const payload = buildResolverPayload();
        // const resolved = await resolveVariant(payload);
        const engravingYes = payload.filters?.engraving === 'yes';
        const targetVariantId = Number(resolved.variant_id);
        const bundleId = generateBundleId();

        // 2) fallback/base variant
        const fallbackVariantId = getFallbackVariantId();
        if (!fallbackVariantId) {
          throw new Error('Fallback variant not configured');
        }

        // 3) main fallback item properties
        const propsMain = {
          _bundle_id: bundleId,
          _parent_handle: window.__PARENT_HANDLE__ || '',
          _new_url: payload.url_key || '',

          // pending markers
          _pending_variant: 'true',
          _target_variant_id: String(targetVariantId),
          _target_sku: String(payload.sku || ''),

          // display helpers
          _display_title: getDisplayedTitle() || payload.title || '',
          _display_price: getDisplayedPriceText() || payload.price_text || '',
          _display_image: getDisplayedImageSafe() || '',
        };

        Object.entries(payload.filters || {}).forEach(([k, v]) => {
          if (v == null || v === '') return;
          propsMain[prettifyKey(k)] = v;
        });

        const cleanedMainProps = cleanProperties(propsMain);

        // 4) cart me fallback variant add hoga
        const itemsToAdd = [
          {
            id: fallbackVariantId,
            quantity: 1,
            properties: cleanedMainProps,
          },
        ];

        // 5) engraving addon
        if (engravingYes) {
          const engravingText = getEngravingText();
          const engravingFont = getEngravingFont();

          itemsToAdd.push({
            id: ENGRAVING_ADDON_VARIANT_ID,
            quantity: 1,
            properties: cleanProperties({
              _bundle_id: bundleId,
              _parent_handle: window.__PARENT_HANDLE__ || '',
              _new_url: payload.url_key || '',

              // IMPORTANT: engraving addon ko pending sync ka part mat banao
              _is_engraving_addon: 'true',

              'Linked Main Variant': String(targetVariantId),
              'Engraving': engravingText,
              'Engraving Font': engravingFont,
            }),
          });

          itemsToAdd[0].properties['Engraving Add-on Variant'] = String(ENGRAVING_ADDON_VARIANT_ID);
        }

        // 6) fast add to cart
        await addItemsToCart(itemsToAdd);

        // 7) redirect
        window.location.replace('/cart');
      } catch (err) {
        console.error('[ATC]', err);
        alert(err.message || 'Add to cart failed');
      } finally {
        __ATC_IN_FLIGHT__ = false;
        setBtnLoading(btn, defaultLabel, false);
      }
    });
  }

  // expose (optional)
  window.initConfiguratorATC = initConfiguratorATC;

  // auto init
  document.addEventListener('DOMContentLoaded', initConfiguratorATC);
})();
document.querySelectorAll('.accordion-button').forEach((btn) => {
  btn.addEventListener('click', function () {
    const item = this.closest('.accordion-item');
    const expanded = this.getAttribute('aria-expanded') === 'true';

    // Close all accordions if you want single open
    document.querySelectorAll('.accordion-item').forEach((i) => {
      i.classList.remove('active');
      i.querySelector('.accordion-button').setAttribute('aria-expanded', 'false');
    });

    // Toggle current
    if (!expanded) {
      item.classList.add('active');
      this.setAttribute('aria-expanded', 'true');
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const accordionButtons = document.querySelectorAll('.yoic-accordion-btn');

  accordionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const parentItem = button.closest('.yoic-accordion-item');
      const collapseContent = parentItem.querySelector('.yoic-accordion-collapse');
      const isActive = button.classList.contains('active');

      // Close all other open accordion items
      document.querySelectorAll('.yoic-accordion-btn.active').forEach((activeButton) => {
        if (activeButton !== button) {
          activeButton.classList.remove('active');
          activeButton.setAttribute('aria-expanded', 'false');
          const activeContent = activeButton
            .closest('.yoic-accordion-item')
            .querySelector('.yoic-accordion-collapse');
          activeContent.style.maxHeight = '0';
        }
      });

      // Toggle the clicked accordion item
      if (isActive) {
        button.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
        collapseContent.style.maxHeight = '0';
      } else {
        button.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
        collapseContent.style.maxHeight = collapseContent.scrollHeight + 'px';
      }
    });
  });
});
(function () {
  const gallery = document.getElementById('pdpfx-gallery');
  if (!gallery) return;

  function wrapWithSkeleton(img) {
    if (!img || img.closest('.media-item')) return;
    img.style.opacity = '0';
    img.style.transition = 'opacity .2s ease';
    const wrap = document.createElement('div');
    wrap.className = 'media-item loading';

    const sk = document.createElement('div');
    sk.className = 'skeleton';
    sk.innerHTML = ''
    // Preserve layout (optional; tweak as per card/aspect)
    wrap.style.minHeight = img.getAttribute('data-min-h') || '320px';

    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(sk);
    wrap.appendChild(img);

    function onImgLoaded() {
      wrap.classList.remove('loading');
      img.style.opacity = '1';
      wrap.style.minHeight = '';
    }
    function onImgError() {
      wrap.classList.remove('loading');
      wrap.style.background = '#f3f3f3';
      sk.textContent = 'Image failed to load';
      sk.style.display = 'flex';
      sk.style.alignItems = 'center';
      sk.style.justifyContent = 'center';
      sk.style.fontSize = '14px';
      img.style.display = 'none';
    }

    if (img.complete && img.naturalWidth > 0) {
      onImgLoaded();
    } else {
      img.addEventListener('load', onImgLoaded, { once: true });
      img.addEventListener('error', onImgError, { once: true });
    }
  }

  function enhanceExisting() {
    gallery.querySelectorAll('img').forEach(wrapWithSkeleton);
  }

  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'IMG') wrapWithSkeleton(node);
        else node.querySelectorAll?.('img').forEach(wrapWithSkeleton);
      });
    });
  });

  enhanceExisting();
  mo.observe(gallery, { childList: true, subtree: true });
})();

(function () {
  // Heuristic: treat any element that has [aria-controls] as a trigger;
  // the controlled panel is the element with that id.
  // Works with existing markup, no changes needed.
  const triggers = Array.from(document.querySelectorAll('#MainContent [aria-controls]')).filter((btn) =>
    btn.matches('button, [role="button"], .accordion__header, .pdpfx-acc-trigger, .pdpfx-chip, a')
  );

  function setupTrigger(btn) {
    const panelId = btn.getAttribute('aria-controls');
    if (!panelId) return;
    const panel = document.getElementById(panelId);
    if (!panel) return;

    // mark classes for styling (non-destructive)
    btn.classList.add('pdpfx-acc-trigger');
    panel.classList.add('pdpfx-acc-panel');

    // initial state based on aria-expanded
    const expanded = String(btn.getAttribute('aria-expanded')) === 'true';
    panel.setAttribute('data-open', expanded ? 'true' : 'false');
    if (expanded) {
      // set to auto after first paint to avoid jump
      panel.style.height = 'auto';
    } else {
      panel.style.height = '0px';
    }

    // toggle handler
    const toggle = (ev) => {
      // ignore modified clicks on anchors
      if (btn.tagName === 'A' && (ev.metaKey || ev.ctrlKey || ev.shiftKey)) return;
      ev.preventDefault();

      const isOpen = String(btn.getAttribute('aria-expanded')) === 'true';
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const fromH = panel.getBoundingClientRect().height;
      // set to auto to measure target height
      panel.style.height = 'auto';
      const toH = panel.scrollHeight;

      // revert to explicit from height before animating
      panel.style.height = fromH + 'px';

      if (isOpen) {
        // closing: animate to 0
        if (prefersReduced) {
          panel.style.height = '0px';
          btn.setAttribute('aria-expanded', 'false');
          panel.setAttribute('data-open', 'false');
        } else {
          panel.animate([{ height: fromH + 'px' }, { height: '0px' }], { duration: 260, easing: 'ease' }).onfinish =
            () => {
              panel.style.height = '0px';
              btn.setAttribute('aria-expanded', 'false');
              panel.setAttribute('data-open', 'false');
            };
        }
      } else {
        // opening: animate from current to measured
        if (prefersReduced) {
          panel.style.height = toH + 'px';
          btn.setAttribute('aria-expanded', 'true');
          panel.setAttribute('data-open', 'true');
          // next frame set to auto to allow responsive content
          requestAnimationFrame(() => {
            panel.style.height = 'auto';
          });
        } else {
          panel.animate([{ height: fromH + 'px' }, { height: toH + 'px' }], {
            duration: 260,
            easing: 'ease',
          }).onfinish = () => {
            panel.style.height = 'auto'; // let content drive height
            btn.setAttribute('aria-expanded', 'true');
            panel.setAttribute('data-open', 'true');
          };
        }
      }
    };

    // Bind click + keyboard
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(e);
      }
    });
  }

  // Initialize all triggers now and for future DOM changes
  triggers.forEach(setupTrigger);

  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        // new triggers
        node.querySelectorAll?.('[aria-controls]')?.forEach(setupTrigger);
        // or if a panel appeared whose trigger already exists
        if (node.id) {
          const t = document.querySelector('[aria-controls="' + CSS.escape(node.id) + '"]');
          if (t) setupTrigger(t);
        }
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

// === PDP Filters: data-driven visibility (no markup changes) ===
document.addEventListener('DOMContentLoaded', function () {
  const ALL = Array.isArray(window.PDP_ALL_SKUS) ? window.PDP_ALL_SKUS : [];

  // ---- utils ----
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const norm = (s) => String(s || '').trim();
  const isNonEmpty = (v) =>
    v != null && String(v).trim() !== '' && String(v).trim().toLowerCase() !== 'n/a' && String(v).trim() !== '-';

  // Resolve a key from multiple candidates OR fuzzy includes
  function resolveKey(candidates, fuzzyParts) {
    if (!ALL.length) return null;
    const keys = Object.keys(ALL.find((o) => o && typeof o === 'object') || {});
    // exact-ish (case-insensitive)
    for (const want of candidates) {
      const k = keys.find((k) => k.toLowerCase() === want.toLowerCase());
      if (k) return k;
    }
    // fuzzy: key name contains all parts (case-insensitive)
    if (fuzzyParts && fuzzyParts.length) {
      const k = keys.find((k) => {
        const low = k.toLowerCase();
        return fuzzyParts.every((p) => low.includes(p.toLowerCase()));
      });
      if (k) return k;
    }
    return null;
  }

  function uniqueValsByKey(key) {
    if (!key) return [];
    const out = [];
    for (const row of ALL) {
      if (!row || typeof row !== 'object') continue;
      const v = norm(row[key]);
      if (isNonEmpty(v)) out.push(v);
    }
    return uniq(out);
  }

  // =========================
  // SHAPE
  // =========================
  (function () {
    // locate "SHAPE" label and its slider (existing DOM)
    const shapeLabel = Array.from(document.querySelectorAll('.single_filter_title')).find(
      (el) => el.textContent.trim().toUpperCase() === 'SHAPE'
    );
    const shapeWrapper = shapeLabel ? shapeLabel.nextElementSibling : null; // .shape-slider-wrapper
    if (!shapeLabel || !shapeWrapper) return;

    // find shape key from data
    const shapeKey = resolveKey(
      ['center_stone_shape', 'centerStoneShape', 'shape', 'center_shape', 'center_stone_shape_name'],
      ['shape']
    );

    // normalize few common aliases (Round Brilliant -> Round, etc.)
    const normShape = (s) => {
      const x = norm(s)
        .toLowerCase()
        .replace(/cut|shape/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!x) return '';
      if (x.includes('round')) return 'round';
      if (x.includes('oval')) return 'oval';
      if (x.includes('emerald')) return 'emerald';
      if (x.includes('marquise')) return 'marquise';
      if (x.includes('pear')) return 'pear';
      if (x.includes('princess')) return 'princess';
      if (x.includes('asscher')) return 'asscher';
      if (x.includes('elongated cushion') || x.includes('long cushion')) return 'cushion';
      if (x.includes('cushion')) return 'cushion';
      // you can add more mappings if needed (radiant, etc.)
      return x;
    };

    const shapesInData = uniq(uniqueValsByKey(shapeKey).map(normShape)).filter(Boolean);
    if (!shapesInData.length) {
      // no shape in JSON → hide both label & slider wrapper
      shapeLabel.style.display = 'none';
      shapeWrapper.style.display = 'none';
      return;
    }

    // hide shape icons not present in data (read name from existing button/img)
    let anyVisible = false;
    document.querySelectorAll('.diamond-shapes_li').forEach((li) => {
      const btn = li.querySelector('.pdpfx-btn');
      const img = li.querySelector('img');
      const iconRaw = norm(btn?.getAttribute('data-value') || img?.getAttribute('alt') || '');
      const icon = normShape(iconRaw);
      if (!icon || !shapesInData.includes(icon)) {
        //li.classList.add('hidden');
        li.remove();
      } else {
        anyVisible = true;
        li.classList.remove('hidden');
      }
    });
    const ul = document.querySelector('.diamond-shapes');
    if (!ul) return;

    const lis = ul.querySelectorAll('.diamond-shapes_li');
    if (lis.length === 10) {
      ul.classList.add('diamond-shapes--ten');
    }
    if (lis.length < 9) {
      document.querySelectorAll('.shape-slider-wrapper .slider-arrow').forEach((arrow) => {
        arrow.classList.add('hidden');
      })
      document.querySelector('.shape-slider-wrapper').classList.add('No_slider');
    }
    else {
      var swiper = new Swiper(".mySwiper", {
        spaceBetween: 10,
        slidesPerView: 10,
        pagination: {
          el: ".swiper-pagination",
          clickable: true,
        },
        // Navigation arrows
        navigation: {
          nextEl: ".shape-slider-wrapper .slider-arrow.right",
          prevEl: ".shape-slider-wrapper .slider-arrow.left",
        },
        breakpoints: {
          0: {
            slidesPerView: 5
          },
          400: {
            slidesPerView: 5
          },
          650: {
            slidesPerView: 5
          },
          992: {
            slidesPerView: 6
          },
          1099: {
            slidesPerView: 6
          },
          1200: {
            slidesPerView: 8
          },
          1400: {
            slidesPerView: 10
          }
        }
      });
      document.querySelector('.shape-slider-wrapper').classList.add('active_slider');
    }

    if (lis.length == 1) {
      anyVisible = false;
      document.querySelector('.shape-slider-wrapper').classList.add('hidden');
      document.querySelector('.single_filter_title_SHAPE').classList.add('hidden');
    } else {
      document.querySelector('.shape-slider-wrapper').classList.remove('hidden');
      document.querySelector('.single_filter_title_SHAPE').classList.remove('hidden');
    }

    if (!anyVisible) {
      shapeLabel.classList.add('hidden')
      shapeWrapper.classList.add('hidden');
    } else {
      shapeLabel.classList.remove('hidden');
      shapeWrapper.classList.remove('hidden');
      if (typeof updateSlider === 'function') {
        try {
          // updateSlider();
        } catch (e) { }
      }
    }
  })();

  // =========================
  // CENTER STONE CARAT WEIGHT
  // =========================
  // ==== CARAT (collection-aware) ====
  // engagement-rings => center_stone_carat_weight
  // wedding-bands    => diamond_carat_weight
  (function (init) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    window.addEventListener('load', init);
  })(function () {
    var items = Array.isArray(window.PDP_ALL_SKUS) ? window.PDP_ALL_SKUS : [];

    // Existing container in your markup
    var container = document.querySelector('[data-buttons-for="center_stone_carat_weight"]');
    if (!container) return;
    var block = container.closest('.pdpfx-block');

    // ---- collection handles from Liquid (no extra markup) ----
    var COLLECTION_HANDLES = window.COLLECTION_HANDLES;
    COLLECTION_HANDLES = Array.isArray(COLLECTION_HANDLES) ? COLLECTION_HANDLES : [];
    const IS_WEDDING = Array.isArray(COLLECTION_HANDLES) && COLLECTION_HANDLES.includes('wedding-bands');
    var isWedding = COLLECTION_HANDLES.indexOf('wedding-bands') > -1;
    var isEngagement = COLLECTION_HANDLES.indexOf('engagement-rings') > -1;

    // choose key by collection (fallback: engagement default)
    var chosenKey = 'center_stone_carat_weight';

    // helpers
    var norm = function (s) {
      return String(s == null ? '' : s).trim();
    };
    var isOk = function (v) {
      var t = norm(v);
      return t && t.toLowerCase() !== 'n/a' && t !== '-' && t !== '--';
    };
    var uniq = function (arr) {
      return Array.from(new Set(arr));
    };

    // ✅ CTW + CT/CTS दोनों हटाओ (सिर्फ़ UI लेबल से, raw value safe)
    var cleanCaratLabel = function (s) {
      return String(s || '')
        .replace(/\s*(?:c\.?\s*t\.?\s*w|ct(?:s)?)\.?\s*$/i, '') // only at the END
        .trim();
    };

    function valuesFromKey(key) {
      if (!key) return [];

      var vals = [];

      items.forEach(function (it) {
        if (!it || typeof it !== "object") return;

        var v = it[key];
        if (v == null) return;

        if (Array.isArray(v)) {
          v.forEach(function (x) {
            extractValue(x, vals);
          });
        } else {
          extractValue(v, vals);
        }
      });

      // remove duplicates
      vals = uniq(vals);

      // sort lowest → highest (carat-aware)
      vals.sort(function (a, b) {
        return parseCarat(a) - parseCarat(b);
      });

      return vals;
    }
    /* ---------------------------
      Helper: Extract Value
    ----------------------------*/
    function extractValue(v, vals) {
      if (!v) return;

      if (typeof v === "object") {
        var pick = v.label || v.name || v.value || v.title || "";
        if (isOk(pick)) vals.push(norm(pick));
      } else {
        String(v)
          .split(",")
          .map(norm)
          .filter(isOk)
          .forEach(function (s) {
            vals.push(s);
          });
      }
    }

    /* ---------------------------
      Helper: Parse Carat Properly
      Handles:
      1ct
      1.5ct
      1-1/2ct
      2-1/4ct
    ----------------------------*/
    function parseCarat(val) {
      if (!val) return 0;

      val = String(val)
        .toLowerCase()
        .replace("ct", "")
        .trim();

      // Handle fraction format like 1-1/2
      if (val.includes("-")) {
        const parts = val.split("-");
        const whole = parseFloat(parts[0]) || 0;

        const fraction = parts[1];
        if (fraction && fraction.includes("/")) {
          const fracParts = fraction.split("/");
          const num = parseFloat(fracParts[0]) || 0;
          const den = parseFloat(fracParts[1]) || 1;
          return whole + num / den;
        }
        return whole;
      }

      return parseFloat(val) || 0;
    }


    // collect by chosen key
    var vals = valuesFromKey(chosenKey);

    // Rule: only show if MULTIPLE unique options
    if (vals.length <= 1) {
      container.innerHTML = '';
      if (block) block.style.setProperty('display', 'none', 'important');
      return;
    }

    // Build buttons
    if (vals.length == 1) container.closest('.pdpfx-block').classList.add('hidden');
    container.innerHTML = '';
    let num = 0;
    vals.forEach(function (v) {
      let btnSwiperClass = '';
      if (chosenKey === 'center_stone_carat_weight') btnSwiperClass = 'swiper-slide';
      // var btn = document.createElement('button');
      // btn.className = `pdpfx-btn ${btnSwiperClass}`;
      // btn.type = 'button';
      // btn.setAttribute('data-key', chosenKey); // use actual key for filtering logic
      // btn.setAttribute('data-value', v); // raw value stays intact
      // btn.textContent = cleanCaratLabel(v); // visible label (CT + CTW removed)
      // container.appendChild(btn);

      var li = document.createElement('li');

      // ✅ add swiper class only when needed
      if (chosenKey === 'center_stone_carat_weight') {
        li.className = 'swiper-slide';
      }

      var btn = document.createElement('button');
      btn.className = 'pdpfx-btn';
      btn.type = 'button';

      btn.setAttribute('data-key', chosenKey);
      btn.setAttribute('data-value', v);

      // visible label
      btn.textContent = cleanCaratLabel(v);

      // ✅ append button inside li
      li.appendChild(btn);

      // ✅ append li inside container
      container.appendChild(li);

      // ✅ after rebuild: restore active based on selected
      setTimeout(() => {
        const sel = window.selected || {};
        const want = (sel.center_stone_carat_weight || '').toString().trim();

        if (want) {
          const btns = container.querySelectorAll(`.pdpfx-btn[data-key="${chosenKey}"]`);
          btns.forEach((b) => {
            const dv = (b.getAttribute('data-value') || '').toString().trim();
            b.classList.toggle('active', dv === want);
          });
        } else {
          // agar selected blank hai to jo current item ka first ho usko active
          const cur = window.current || {};
          const first = (cur.center_stone_carat_weight || '').toString().split(',')[0]?.trim();
          if (first) {
            const b = container.querySelector(`.pdpfx-btn[data-key="${chosenKey}"][data-value="${CSS.escape(first)}"]`);
            if (b) b.classList.add('active');
            sel.center_stone_carat_weight = first;
          }
        }
      }, 0);

      num++;

      if (vals.length < 8) {
        document.querySelectorAll('.carat_weight_outer .slider-arrow').forEach((arrow) => {
          arrow.classList.add('hidden');
        })
        document.querySelector('.carat_weight_outer').classList.add('No_slider');
      } else {
        var swiper = new Swiper(".mySwiper2", {
          spaceBetween: 10,
          slidesPerView: 8,
          pagination: {
            el: ".swiper-pagination",
            clickable: true,
          },
          navigation: {
            nextEl: ".carat_weight-slider-wrapper .slider-arrow.right",
            prevEl: ".carat_weight-slider-wrapper .slider-arrow.left",
          },
          breakpoints: {
            0: {
              slidesPerView: 5
            },
            400: {
              slidesPerView: 5
            },
            650: {
              slidesPerView: 5
            },
            992: {
              slidesPerView: 6
            },
            1099: {
              slidesPerView: 6
            },
            1200: {
              slidesPerView: 8
            }
          }
        });


        document.querySelector('.carat_weight_outer').classList.add('active_slider');
      }
    });
    // ensure block visible
    if (block) block.style.removeProperty('display');
  });

  // =========================
  // DIAMOND QUALITY
  // =========================
  // ==== DIAMOND QUALITY: hide when no data (structure untouched) ====
  (function (init) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    // ensure after other theme scripts too
    window.addEventListener('load', init);
  })(function () {
    var items = Array.isArray(window.PDP_ALL_SKUS) ? window.PDP_ALL_SKUS : [];
    var container = document.querySelector('[data-buttons-for="diamond_quality"]');
    if (!container) return;

    var norm = function (s) {
      return String(s == null ? '' : s).trim();
    };
    var isOk = function (v) {
      var t = norm(v);
      return t && t.toLowerCase() !== 'n/a' && t !== '-' && t !== '--';
    };
    var uniq = function (arr) {
      return Array.from(new Set(arr));
    };

    // find the correct block/label (both will be toggled)
    var block = container.closest('.pdpfx-block');
    var label = (function () {
      var els = document.querySelectorAll('.single_filter_title');
      for (var i = 0; i < els.length; i++) {
        if (norm(els[i].textContent).toUpperCase() === 'DIAMOND QUALITY') return els[i];
      }
      return null;
    })();
    var labelBlock = label ? label.closest('.pdpfx-block') : null;

    function hideAll() {
      if (container) container.innerHTML = '';
      [block, labelBlock].forEach(function (el) {
        if (el) el.style.setProperty('display', 'none', 'important');
      });
    }
    function showAll() {
      [block, labelBlock].forEach(function (el) {
        if (el) el.style.removeProperty('display');
      });
    }

    // collect quality values from all possible fields
    var KEYS = ['diamond_quality', 'center_stone_quality_1', 'center_stone_quality_2', 'center_stone_quality_3'];
    var vals = [];
    items.forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      KEYS.forEach(function (k) {
        var v = it[k];
        if (v == null) return;

        // accept array/object/comma-separated/string
        if (Array.isArray(v)) {
          v.forEach(function (x) {
            if (x && typeof x === 'object') {
              var pick = x.label || x.name || x.value || x.title || '';
              if (isOk(pick)) vals.push(norm(pick));
            } else if (isOk(x)) {
              vals.push(norm(x));
            }
          });
        } else if (typeof v === 'object') {
          var pick = v.label || v.name || v.value || v.title || '';
          if (isOk(pick)) vals.push(norm(pick));
        } else {
          String(v)
            .split(',')
            .map(norm)
            .filter(isOk)
            .forEach(function (s) {
              vals.push(s);
            });
        }
      });
    });

    vals = uniq(vals).sort(function (a, b) {
      return a.localeCompare(b);
    });


    if (vals.length === 0) {
      // ✅ no data: hide label + block completely
      hideAll();
      return;
    }

    // data present: build buttons & show
    container.innerHTML = '';
    const pref = ['Luxury', 'Signature', 'Classic'];
    vals = vals.sort((a, b) => {
      const ai = pref.findIndex((p) => a.startsWith(p));
      const bi = pref.findIndex((p) => b.startsWith(p));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    vals.forEach(function (v) {
      var btn = document.createElement('button');
      btn.className = 'pdpfx-btn';
      btn.type = 'button';
      btn.setAttribute('data-key', 'diamond_quality'); // raw key remains same
      btn.setAttribute('data-value', v);
      btn.textContent = v;
      container.appendChild(btn);
    });
    showAll();
    // ✅ restore active diamond quality after rebuild
    setTimeout(() => {
      const sel = (window.selected?.diamond_quality || '').toString().trim();
      if (!sel) return;

      const btns = container.querySelectorAll('.pdpfx-btn[data-key="diamond_quality"]');
      btns.forEach((b) => {
        const v = (b.getAttribute('data-value') || '').toString().trim();
        b.classList.toggle('active', v === sel);
      });
    }, 0);

  });

  (function (init) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    window.addEventListener('load', init);
  })(function () {
    // Collection handles from Liquid
    var HANDLES = window.COLLECTION_HANDLES;
    HANDLES = Array.isArray(HANDLES) ? HANDLES : [];

    // if any handle contains "necklace" or "bracelet" => hide ring size
    var hideRingSize = HANDLES.some(function (h) {
      return /necklace|bracelet/i.test(String(h || ''));
    });

    if (!hideRingSize) return;
  });
  (function () {
    const key = resolveKey(
      ['metal_color', 'metalColor', 'metal', 'metal_type', 'metal_colour', 'metalColour'],
      ['metal']
    );
    const metalLabel = Array.from(document.querySelectorAll('.single_filter_title')).find((el) =>
      el.textContent.trim().toUpperCase().startsWith('METAL')
    );
    const metalBlock = metalLabel ? metalLabel.closest('.metal-slider-wrapper') : null;
    if (!metalBlock) return;

    const metals = uniq(uniqueValsByKey(key).map((s) => norm(s).toLowerCase()));
    if (!metals.length) {
      metalBlock.style.display = 'none';
      return;
    }

    let firstUsable = null;
    metalBlock.querySelectorAll('.metal-colors .pdpfx-btn').forEach((btn) => {
      const name = norm(btn.getAttribute('data-value')).toLowerCase();
      if (!metals.includes(name)) {
        btn.style.opacity = '0.35';
        btn.style.pointerEvents = 'none';
        btn.classList.remove('active');
      } else if (!firstUsable) {
        firstUsable = btn;
      }
    });

    if (!firstUsable) {
      metalBlock.style.display = 'none';
    } else {
      metalBlock.style.display = '';

      const hasNewUrl = new URLSearchParams(location.search).has('new_url');
      const selMetal = (window.selected?.metal_color || '').trim();

      // ✅ if coming from new_url OR metal already selected → DO NOT override
      if (hasNewUrl || selMetal) {
        // just re-apply active state based on selected
        metalBlock.querySelectorAll('.metal-colors .pdpfx-btn').forEach((btn) => {
          const v = (btn.getAttribute('data-value') || '').trim();
          btn.classList.toggle('active', v === selMetal);
        });
        return;
      }

      // ✅ only when no new_url and no selection → default behavior
      firstUsable.classList.add('active');
      try { firstUsable.click(); } catch (e) { }
    }

  })();
});

(function () {
  function ensureInner(panel) {
    if (!panel) return;
    if (!panel.querySelector('.pdpfx-acc-inner')) {
      const inner = document.createElement('div');
      inner.className = 'pdpfx-acc-inner';
      // move children into inner
      while (panel.firstChild) inner.appendChild(panel.firstChild);
      panel.appendChild(inner);
    }
  }

  function setupAcc(acc) {
    if (acc.__pdpfx_ready) return;
    acc.__pdpfx_ready = true;
    const trigger = acc.querySelector('.pdpfx-acc-trigger,[aria-controls]');
    let panel = acc.querySelector('.pdpfx-acc-panel');
    // use aria-controls if present
    if (!panel && trigger && trigger.getAttribute('aria-controls')) {
      panel = document.getElementById(trigger.getAttribute('aria-controls'));
    }
    if (!trigger || !panel) return;

    ensureInner(panel);

    // initial state (prefer aria-expanded)
    const aria = trigger.getAttribute('aria-expanded');
    if (aria != null) {
      acc.setAttribute('data-open', aria === 'true' ? 'true' : 'false');
    } else if (!acc.hasAttribute('data-open')) {
      acc.setAttribute('data-open', 'false');
    }

    function toggle(ev) {
      // allow links with modifiers to pass through
      if (trigger.tagName === 'A' && (ev?.metaKey || ev?.ctrlKey || ev?.shiftKey)) return;
      ev?.preventDefault?.();
      const open = acc.getAttribute('data-open') === 'true';
      const next = !open;
      acc.setAttribute('data-open', next ? 'true' : 'false');
      trigger.setAttribute('aria-expanded', String(next));
    }

    trigger.addEventListener('click', toggle);
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        toggle(e);
      }
    });
  }

  function scan(root = document) {
    root.querySelectorAll('.pdpfx-acc').forEach(setupAcc);
  }

  // init and observe future nodes
  scan();
  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('.pdpfx-acc')) setupAcc(node);
        node.querySelectorAll?.('.pdpfx-acc')?.forEach(setupAcc);
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

setTimeout(() => {
  (function () {
    const ZOOM_SCALE = 2.3;

    document.querySelectorAll('.pdpfx-inner').forEach((zoomContainer) => {
      const img = zoomContainer.querySelector('img');
      // console.log('image zoom');
      if (!img) return;

      let isZoomActive = false;

      // Click to activate zoom
      zoomContainer.addEventListener('click', () => {
        isZoomActive = true;
        zoomContainer.classList.add('zoom-active');
        img.style.transform = `scale(${ZOOM_SCALE})`;
        img.style.transformOrigin = 'center center';
      });

      // Mouse move to pan
      zoomContainer.addEventListener('mousemove', (e) => {
        if (!isZoomActive) return;

        const rect = zoomContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        img.style.transformOrigin = `${x}% ${y}%`;
      });

      // Reset on mouse leave
      zoomContainer.addEventListener('mouseleave', () => {
        isZoomActive = false;
        zoomContainer.classList.remove('zoom-active');
        img.style.transform = 'scale(1)';
        img.style.transformOrigin = 'center center';
      });
    });
  })();
}, '1000');

(function () {
  if (window.__pdpSeoLiteV2) return;
  window.__pdpSeoLiteV2 = true;

  // helpers
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function upsert(sel, tag, attrs) {
    var el = qs(sel, document.head);
    if (!el) {
      el = document.createElement(tag);
      for (var k in attrs || {}) el.setAttribute(k, attrs[k]);
      document.head.appendChild(el);
    }
    return el;
  }
  function ensureTitle() {
    return upsert('title', 'title');
  }
  function setTitle(text) {
    if (!text) return;
    var t = ensureTitle();
    t.textContent = text;
    document.title = text; // favicon-side tab title
  }
  function setMetaName(name, content) {
    if (!content) return;
    upsert('meta[name="' + name + '"]', 'meta', { name: name }).setAttribute('content', content);
  }
  function setMetaProp(prop, content) {
    if (!content) return;
    upsert('meta[property="' + prop + '"]', 'meta', { property: prop }).setAttribute('content', content);
  }

  // build dynamic strings from your current JSON state
  function getState() {
    var cur = window.current || {};
    var sel = window.selected || {};

    var sku = cur.sku || cur.SKU || sel.sku || '';
    var metal = cur.metal || cur.metal_color || sel.metal || sel.metal_color || '';
    var karat = cur.karat || cur.k || '';
    var stone = cur.center_stone || cur.center_stone_type || cur.stone || '';
    var shape = cur.center_stone_shape || cur.shape || '';
    var size = sel.ring_size || cur.ring_size || '';
    var color = cur.gold_color || cur.color || '';

    var parts = [metal, karat, stone, shape, color, size && 'size ' + size]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Base product title (DOM first, fallback to liquid-baked)
    var baseTitle =
      (qs('.product__title, h1') && qs('.product__title, h1').textContent.trim()) ||
      (qs('meta[property="og:title"]') && qs('meta[property="og:title"]').content) ||
      window.ProductExtraDeatils.baseTitle;

    // Final strings
    var title = parts ? parts.charAt(0).toUpperCase() + parts.slice(1) + ' ' + baseTitle : baseTitle;
    var desc = ('Buy ' + baseTitle + (parts ? ' in ' + parts.toLowerCase() : '') + (sku ? '. SKU ' + sku : ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (desc.length > 155) desc = desc.slice(0, 155);

    return { title: title, desc: desc };
  }

  function applySEO() {
    var s = getState();
    setTitle(s.title);
    setMetaName('description', s.desc);
    // ✅ OG tags you asked for:
    setMetaProp('og:title', s.title);
    setMetaProp('og:description', s.desc);
  }

  // first paint
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(applySEO, 0);
  });

  // hook your updater
  try {
    if (typeof updateProduct === 'function' && !updateProduct.__seoLiteV2Patched) {
      var _u = updateProduct;
      updateProduct = function () {
        var r = _u.apply(this, arguments);
        setTimeout(applySEO, 0);
        return r;
      };
      updateProduct.__seoLiteV2Patched = true;
    }
  } catch (_) { }

  // react to UI interactions (chips/selects)
  document.addEventListener(
    'click',
    function (e) {
      if (e.target.closest('.pdpfx-btn, .pdpfx-chip, [data-key], .metal-colors, .diamond-shapes')) {
        setTimeout(applySEO, 0);
      }
    },
    true
  );
  document.addEventListener(
    'change',
    function (e) {
      if (
        e.target &&
        (e.target.matches('select, input') || /option|size|metal|quality|ring/i.test(e.target.name || ''))
      ) {
        setTimeout(applySEO, 0);
      }
    },
    true
  );
})();

(function () {
  if (window.__PDP_DYNAMIC_SEO__) return;
  window.__PDP_DYNAMIC_SEO__ = true;

  // --- Liquid fallbacks (product-level) ---
  var PRODUCT_TITLE_FB = window.ProductExtraDeatils.PRODUCT_TITLE_FB;
  var PRODUCT_DESC_FB = window.ProductExtraDeatils.PRODUCT_DESC_FB;
  var PRODUCT_TAGS_FB = window.ProductExtraDeatils.PRODUCT_TAGS_FB;

  // Collection awareness (carat key differs on wedding)
  var HANDLES = window.COLLECTION_HANDLES;
  HANDLES = Array.isArray(HANDLES) ? HANDLES : [];
  var IS_WEDDING = HANDLES.indexOf('wedding-bands') > -1;

  // ----- tiny utils -----
  var HEAD = document.head || document.getElementsByTagName('head')[0];
  function norm(s) {
    return String(s == null ? '' : s).trim();
  }
  function lowflat(s) {
    return norm(s).toLowerCase().replace(/\s+/g, '');
  }
  function csv(v) {
    return String(v == null ? '' : v)
      .split(',')
      .map(norm)
      .filter(Boolean);
  }

  function ensureMeta(name) {
    var el = HEAD.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      HEAD.appendChild(el);
    }
    return el;
  }
  function setTitle(t) {
    t = norm(t);
    if (!t) return;
    // set <title> node (for older browsers) + document.title (tab text beside favicon)
    var tEl = HEAD.querySelector('title');
    if (!tEl) {
      tEl = document.createElement('title');
      HEAD.appendChild(tEl);
    }
    tEl.textContent = t;
    document.title = t;
  }

  // ----- read current selection from PDP UI -----
  function pickActive(key) {
    var el = document.querySelector('.pdpfx-btn[data-key="' + key + '"].active');
    return el ? norm(el.getAttribute('data-value')) : '';
  }
  function pickRing() {
    var el = document.getElementById('pdp-ring-size');
    return el ? norm(el.value) : '';
  }

  // ----- best-match row from metafield JSON -----
  function selectedRow() {
    var ALL = Array.isArray(window.PDP_ALL_SKUS) ? window.PDP_ALL_SKUS : [];
    if (!ALL.length) return null;

    var sel = {
      metal_color: pickActive('metal_color'),
      center_stone_shape: pickActive('center_stone_shape'),
      diamond_quality: pickActive('diamond_quality'),
      ring_size: pickRing(),
      center_stone_carat_weight: pickActive('center_stone_carat_weight'),
      // diamond_carat_weight:pickActive('diamond_carat_weight'),
    };
    // sel[caratKey] = pickActive(caratKey);

    function matches(r) {
      if (!r) return false;
      if (sel.metal_color && norm(r.metal_color) !== sel.metal_color) return false;
      if (sel.center_stone_shape && norm(r.center_stone_shape) !== sel.center_stone_shape) return false;

      if (sel.diamond_carat_weight) {
        var parts = csv(r.diamond_carat_weight);
        if (parts.indexOf(sel.diamond_carat_weight) === -1) return false;
      }
      if (sel.center_stone_carat_weight) {
        var parts = csv(r.center_stone_carat_weight);
        if (parts.indexOf(sel.center_stone_carat_weight) === -1) return false;
      }
      if (sel.diamond_quality) {
        var ql = [r.center_stone_quality_1, r.center_stone_quality_2, r.center_stone_quality_3]
          .map(norm)
          .filter(Boolean);
        if (ql.indexOf(sel.diamond_quality) === -1) return false;
      }
      if (sel.ring_size) {
        var rs = csv(r.ring_size);
        if (rs.indexOf(sel.ring_size) === -1) return false;
      }
      return true;
    }

    return ALL.find(matches) || ALL[0] || null;
  }

  // ----- derive & apply META (title/description/keywords) -----
  function applyMeta() {
    var row = selectedRow();

    var metaTitle = '',
      metaDesc = '',
      metaKeys = '';

    if (row) {
      // support multiple possible key spellings
      metaTitle = row.meta_title || row.seo_title || row.title_tag || '';
      metaDesc = row.meta_description || row.seo_description || row.description_tag || '';
      metaKeys = row.meta_keywords || row.keywords || '';
    }

    // fallbacks (product-level)
    if (!norm(metaTitle)) metaTitle = PRODUCT_TITLE_FB;
    if (!norm(metaDesc)) metaDesc = PRODUCT_DESC_FB;
    if (!norm(metaKeys)) metaKeys = PRODUCT_TAGS_FB;

    // write to <head>
    setTitle(metaTitle);
    ensureMeta('description').setAttribute('content', metaDesc);
    ensureMeta('keywords').setAttribute('content', metaKeys);
  }

  // ----- boot & listeners -----
  function boot() {
    applyMeta();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', applyMeta);

  // filter buttons / ring size changes → re-apply
  document.addEventListener('click', function (e) {
    if (e.target.closest('.pdpfx-btn')) setTimeout(applyMeta, 0);
  });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'pdp-ring-size') setTimeout(applyMeta, 0);
  });

  // also observe PDP changes (theme may update title/sku asynchronously)
  try {
    var tgt =
      document.querySelector('[data-product-title]') || document.querySelector('[data-product-sku]') || document.body;
    if (tgt && window.MutationObserver) {
      var mo = new MutationObserver(function () {
        applyMeta();
      });
      mo.observe(tgt, { childList: true, subtree: true, characterData: true });
    }
  } catch (_) { }
})();

document.querySelectorAll('input[name="engraving"]').forEach((radio) => {
  radio.addEventListener('change', function () {
    const box = document.getElementById('engraving_div');
    if (this.value === 'yes') {
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  });
});
// new code
function updateNewUrlFromSelection(selection) {

  if (!window.PDP_ALL_SKUS || !selection) return;

  var matchedRow = null;

  for (var i = 0; i < window.PDP_ALL_SKUS.length; i++) {
    var row = window.PDP_ALL_SKUS[i];

    var isMatch = true;

    Object.keys(selection).forEach(function (key) {

      var selVal = selection[key];
      var rowVal = row[key];

      //  skip empty or unavailable filters
      if (
        selVal === undefined ||
        selVal === null ||
        selVal === '' ||
        rowVal === undefined ||
        rowVal === null ||
        rowVal === ''
      ) {
        return;
      }

      if (String(rowVal).trim() !== String(selVal).trim()) {
        isMatch = false;
      }
    });

    if (isMatch) {
      matchedRow = row;
      break;
    }
  }

  if (!matchedRow || !matchedRow.url_key) return;

  var current = new URL(window.location.href);
  var currentNewUrl = current.searchParams.get('new_url');

  // ✅ prevent blinking
  if (currentNewUrl === matchedRow.url_key) return;

  var cleanUrl =
    window.location.origin +
    window.location.pathname +
    '?new_url=' +
    encodeURIComponent(matchedRow.url_key);

  history.replaceState({}, '', cleanUrl);
}


(function keepOnlyNewUrl() {

  var originalReplace = history.replaceState;

  history.replaceState = function (state, title, url) {

    if (!url) {
      return originalReplace.apply(history, arguments);
    }

    var parsed = new URL(url, window.location.origin);

    // If new_url exists → keep only that
    if (parsed.searchParams.has('new_url')) {

      var cleanUrl =
        parsed.pathname +
        '?new_url=' + encodeURIComponent(parsed.searchParams.get('new_url'));

      return originalReplace.call(history, state, title, cleanUrl);
    }

    // If theme tries to push sku/metal/etc → ignore them
    var current = new URL(window.location.href);

    if (current.searchParams.has('new_url')) {
      return originalReplace.call(history, state, title, window.location.href);
    }

    return originalReplace.apply(history, arguments);
  };

})();

// new code
let galleryResize;

window.addEventListener('resize', function () {

  clearTimeout(galleryResize);

  galleryResize = setTimeout(function () {
    initGallerySlider();
  }, 300);

});

document.addEventListener("DOMContentLoaded", function () {
  const ringSizeSelect = document.getElementById("pdp-ring-size");
  if (!ringSizeSelect) return;

  function syncCustomRingSizeUI() {
    const existingInput = document.getElementById("custom-ring-size");
    if (existingInput) existingInput.remove();

    if (ringSizeSelect.value === "Custom") {
      const input = document.createElement("input");
      input.type = "text";
      input.id = "custom-ring-size";
      input.name = "custom_ring_size";
      input.placeholder = "Enter Your Ring Size";
      input.className = "custom-ring-input";

      ringSizeSelect.insertAdjacentElement("afterend", input);

      input.addEventListener("input", function () {
        this.classList.remove("error");
      });
    }
  }

  ringSizeSelect.addEventListener("change", function () {
    syncCustomRingSizeUI();

    if (window.selected) {
      window.selected.ring_size = this.value || "";
    }
  });

  syncCustomRingSizeUI();
});

(function () {
  function getWishlistCustomerId() {
    if (window.__CUSTOMER_ID__) {
      return String(window.__CUSTOMER_ID__);
    }

    let browserId = localStorage.getItem("wishlist_browser_id");

    if (!browserId) {
      browserId =
        "browser_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("wishlist_browser_id", browserId);
    }

    return browserId;
  }

  function getAllEngines() {
    return Array.from(document.querySelectorAll(".wishlist-engine"));
  }

  function setHeartUI(active) {
    getAllEngines().forEach((engine) => {
      engine.classList.toggle("is-active", active);

      engine.querySelectorAll("svg, svg path").forEach((el) => {
        el.style.fill = active ? "#c47881" : "";
        el.style.stroke = active ? "#c47881" : "";
      });

      engine.querySelectorAll("i").forEach((el) => {
        el.style.color = active ? "#c47881" : "";
      });
    });
  }

  function buildWishlistPayload(engineEl) {
    const row = window.current || {};
    const priceText =
      document.querySelector("[data-product-price]")?.textContent?.trim() || "";

    return {
      customerId: getWishlistCustomerId(),
      productId:
        engineEl?.dataset?.product_id ||
        String(window.__PARENT_PRODUCT_ID__ || ""),
      productHandle: String(window.__PARENT_HANDLE__ || ""),
      snapshot: {
        id:
          engineEl?.dataset?.product_id ||
          String(window.__PARENT_PRODUCT_ID__ || ""),
        handle: row.handle || String(window.__PARENT_HANDLE__ || ""),
        title:
          document.querySelector("[data-product-title]")?.textContent?.trim() ||
          row.pdp_name ||
          "",
        url: window.location.href,
        image: window.PDP_SELECTED_IMAGE || "",
        price: Number(String(priceText).replace(/[^0-9.]/g, "")) || 0,
        sku:
          document.querySelector("[data-product-sku]")?.textContent?.trim() ||
          row.sku ||
          "",
        metafields_data: row
      }
    };
  }

  async function checkExists(productId) {
    const url = new URL(
      "/apps/custom-forms/wishlist/check",
      location.origin
    );
    url.searchParams.set("customerId", getWishlistCustomerId());
    url.searchParams.set("productId", productId);

    const res = await fetch(url);
    const data = await res.json();

    return data.success && data.exists;
  }

  async function addWishlist(engine) {
    const payload = buildWishlistPayload(engine);

    const res = await fetch("/apps/custom-forms/wishlist/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) setHeartUI(true);
  }

  async function removeWishlist(engine) {
    const payload = {
      customerId: getWishlistCustomerId(),
      productId: engine.dataset.product_id
    };

    const res = await fetch("/apps/custom-forms/wishlist/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) setHeartUI(false);
  }

  async function toggleWishlist(engine) {
    const productId = engine.dataset.product_id;

    const exists = await checkExists(productId);

    if (exists) {
      await removeWishlist(engine);
    } else {
      await addWishlist(engine);
    }
    document.dispatchEvent(new CustomEvent("wishlist:updated"));
  }

  function bind() {
    const engines = document.querySelectorAll(".wishlist-engine");

    engines.forEach((engine) => {
      if (engine.dataset.bound) return;
      engine.dataset.bound = "1";

      engine.addEventListener(
        "click",
        function () {
          setTimeout(() => toggleWishlist(engine), 50);
        },
        true
      );
    });
  }

  async function initialSync() {
    const first = document.querySelector(".wishlist-engine");
    if (!first) return;

    const exists = await checkExists(first.dataset.product_id);
    setHeartUI(exists);
  }

  document.addEventListener("DOMContentLoaded", function () {
    bind();
    setTimeout(initialSync, 600);
  });

  document.addEventListener("shopify:section:load", function () {
    bind();
    setTimeout(initialSync, 600);
  });

  document.addEventListener("pdpfx:changed", function () {
    setTimeout(initialSync, 300);
  });

  new MutationObserver(() => bind()).observe(document.body, {
    childList: true,
    subtree: true
  });
})();