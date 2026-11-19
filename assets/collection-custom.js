(function addPLPLoaderCSS(){
  if (document.getElementById('wdd-plp-loader-css')) return;

  const css = `
  product-card.wdd-loading {
    position: relative;
  }

  product-card.wdd-loading .wdd-plp-skeleton{
    position:absolute;
    inset:0;
    z-index: 9;
    background:#fff;
  }

  product-card.wdd-loading .wdd-plp-skeleton::after{
    content:"";
    position:absolute;
    inset:0;
    background: linear-gradient(90deg,#f5f5f5 0%,#eaeaea 50%,#f5f5f5 100%);
    animation: shimmer 1.2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* ❗ Default content completely hide while loading */
  product-card.wdd-loading .card-gallery,
  product-card.wdd-loading .product-card__title,
  product-card.wdd-loading .card_productTitle,
  product-card.wdd-loading .js-card-price,
  product-card.wdd-loading .price {
    opacity:0 !important;
    visibility:hidden !important;
  }
  `;

  const style = document.createElement('style');
  style.id = 'wdd-plp-loader-css';
  style.textContent = css;
  document.head.appendChild(style);
})();

window.collection = {
  CDN: "https://im.lgdus.co/Jwl/",

  _cache: new Map(),
  _inflight: new Map(),

  _io: null,
  _mo: null,
  _initedCards: new WeakSet(),

  _maxConcurrent: 12,
_currentFetches: 0,
_queue: [],

async _enqueueFetch(fn) {
  if (this._currentFetches >= this._maxConcurrent) {
    await new Promise(res => this._queue.push(res));
  }

  this._currentFetches++;

  try {
    return await fn();
  } finally {
    this._currentFetches--;
    if (this._queue.length) this._queue.shift()();
  }
},

  /* ---------------- HELPERS ---------------- */
  showLoader(card){
    if (!card) return;
    card.classList.add("wdd-loading");

    let sk = card.querySelector(".wdd-plp-skeleton");
    if (!sk) {
      sk = document.createElement("div");
      sk.className = "wdd-plp-skeleton";
      card.appendChild(sk);
    }

    card._loaderTimeout = setTimeout(() => {
      this.hideLoader(card);
    }, 8000);

  },

  hideLoader(card){
    if (!card) return;

    card.classList.remove("wdd-loading");

    const sk = card.querySelector(".wdd-plp-skeleton");
    if (sk) sk.remove();

    // ✅ booting OFF
    if (document.documentElement.classList.contains("wdd-plp-booting")) {
      document.documentElement.classList.remove("wdd-plp-booting");
    }

    clearTimeout(card._loaderTimeout);

  },

  getEl(target) {
    return target && target.nodeType === 1 ? target : target?.parentElement;
  },
  norm(v) {
    return (v || "").toString().trim().toLowerCase();
  },
  normMetal(v) {
    v = this.norm(v);
    if (!v) return "";
    if (v.includes("platinum")) return "platinum";
    if (v.includes("rose")) return "rose";
    if (v.includes("yellow")) return "yellow";
    if (v.includes("white")) return "white";
    if (v.includes("silver")) return "silver";
    return v;
  },
  parseJSON(text) {
    try {
      return JSON.parse(text || "null");
    } catch (e) {
      return null;
    }
  },
  coerceArray(val) {
    try {
      if (Array.isArray(val)) return val;
      if (val && typeof val === "object" && Array.isArray(val.value)) return val.value;
      if (val && typeof val === "object") return [val];
      if (typeof val === "string" && val.trim()) {
        const j = JSON.parse(val);
        if (Array.isArray(j)) return j;
        if (j && typeof j === "object") return [j];
      }
    } catch (e) {}
    return [];
  },
  toAbsMedia(path) {
    const p = (path || "").toString().trim();
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    return this.CDN + p.replace(/^\//, "");
  },
  parsePriceToNumber(v) {
    const n = parseFloat(String(v ?? "").replace(/[,$₹\sRs.]/g, ""));
    return isNaN(n) ? null : n;
  },

  /* ---------------- URL FILTERS (PLP) ---------------- */
  getPLPFiltersFromUrl() {
    const u = new URL(window.location.href);

    // Shopify Search & Discovery filters (most common)
    const metal =
      (u.searchParams.get("filter.p.m.custom.metal") || "").trim() ||
      (u.searchParams.get("metal_color") || "").trim();

    const shape =
      (u.searchParams.get("filter.p.m.custom.shape") || "").trim() ||
      (u.searchParams.get("center_stone_shape") || "").trim();
      
      const gemstone =
      (u.searchParams.get("filter.p.m.custom.gemstone") || "").trim() ||
      (u.searchParams.get("gemstone") || "").trim();

    return { metal, shape ,gemstone};
  },
  hasActivePLPFilters() {
    const { metal, shape , gemstone} = this.getPLPFiltersFromUrl();
    return !!(metal || shape || gemstone);
  },

  /* ---------------- PER-CARD SELECTION (NO GLOBAL RESET BUG) ---------------- */
  getSelected(card) {
    return {
      sku: (card?.dataset?.selectedSku || "").trim(),
      metal: (card?.dataset?.selectedMetal || card?.dataset?.defaultMetal).trim(),
      shape: (card?.dataset?.selectedShape || card?.dataset?.defaultShape).trim(),
      user: card?.dataset?.userSelected === "1",
    };
  },
  setSelected(card, patch = {}) {
    if (!card) return;
    if ("sku" in patch) card.dataset.selectedSku = (patch.sku || "").trim();
    if ("metal" in patch) card.dataset.selectedMetal = (patch.metal || "").trim();
    if ("shape" in patch) card.dataset.selectedShape = (patch.shape || "").trim();
  },
  findBySku(data, sku) {
    const s = this.norm(sku);
    if (!s) return null;
    return data.find((it) => this.norm(it.sku) === s) || null;
  },

  /* ---------------- DATA LOAD ---------------- */
  async getSkuDataForCard(card, forceFull = false) {
    if (!card) return [];
    const handle = card.dataset.handle;
    if (!handle) return [];

    const jsonEl = card.querySelector(".wdd-skudata-val");

    // inline json (PLP picked row) only when not forcing full
    if (!forceFull) {
      const inline = this.coerceArray(this.parseJSON(jsonEl?.textContent || ""));
      if (inline && inline.length) {
        this._cache.set(handle, inline);
        return inline;
      }
    }

    if (this._cache.has(handle)) return this._cache.get(handle);
    if (this._inflight.has(handle)) return await this._inflight.get(handle);

    const p = (async () => {
      try {
        // const res = await fetch(`/products/${handle}?view=wdd-sku-json`, {
        //   credentials: "same-origin",
        //   cache: "no-store",
        // });
        const res = await this._enqueueFetch(() =>
  fetch(`/products/${handle}?view=wdd-sku-json`, {
    credentials: "same-origin",
    cache: "force-cache",
  })
);

// 👇 ADD THIS CHECK
if (!res.ok) {
  console.warn("Fetch failed:", handle, res.status);
  return [];
}
        // const text = await res.text();
        // const data = this.coerceArray(this.parseJSON(text));
        let data = [];
try {
  const text = await res.text();
  data = this.coerceArray(this.parseJSON(text));

  // console.log('data: ', data)
} catch (e) {
  console.error("JSON parse failed:", handle, e);
}
        this._cache.set(handle, data);
        if (jsonEl) jsonEl.textContent = JSON.stringify(data);
        // console.log('data: ', data)
        return data;
      } catch (e) {
        console.error("SKU JSON fetch failed:", handle, e);
        return [];
      } finally {
        this._inflight.delete(handle);
      }
    })();

    this._inflight.set(handle, p);
    return await p;
  },

  async ensureFullJsonForCard(card) {
    if (!card) return;
    const handle = card.dataset.handle;
    if (!handle) return;

    const cached = this._cache.get(handle);
    if (cached && cached.length > 1) return;

    this._cache.delete(handle);
    await this.getSkuDataForCard(card, true);
  },

  /* ---------------- PICK ROW ---------------- */
  // Priority:
  // 1) selectedSku (ONLY when not filtered)
  // 2) selected metal + shape strict
  // 3) selected metal only
  // 4) selected shape only
  // 5) show_on_plp === 'YES'
  // 6) first
  pickItem(data, card) {
    if (!data || !data.length || !card) return null;
    const sel = this.getSelected(card);
    
    const hasFilters = this.hasActivePLPFilters();
    const getFilters = this.getPLPFiltersFromUrl();
    // ✅ 1) selectedSku only if NO filters active and user hasn't interacted
    if (!hasFilters && !sel.user && sel.sku) {
      const bySku = this.findBySku(data, sel.sku);
      if (bySku) return bySku;
    }

      const selMetal = this.normMetal(sel.metal);
      const selShape = this.norm(sel.shape);
      const defaultName = this.norm(card.dataset.defaultProductname);
      const selgemstone = this.norm(getFilters.gemstone);

      // 1️⃣ Filter by metal first
      let filtered = data.filter(
        (it) => this.normMetal(it.metal_color) === selMetal
      );
           
     if (selgemstone) {
        const wantGem = this.norm(selgemstone);
        console.log('wantGem: ', wantGem)
        const gemstoneMatch = filtered.filter((it) => {
          if (!it.gemstone_type) return false;
          return String(it.gemstone_type)
            .split(',')
            .map(v => this.norm(v.trim()))
            .some(v => v.includes(wantGem)); // ✅ contains match
        });
        if (gemstoneMatch.length) {
          filtered = gemstoneMatch;
        }
      }

      if (!filtered.length) return null;
      // 2️⃣ Check if defaultName match exists
      if (defaultName) {
        const defaultMatch = filtered.filter(
          (it) => this.norm(it.name) === defaultName
        );

        if (defaultMatch.length) {
          filtered = defaultMatch;
        }
      }
 
      // 3️⃣ Check shape (only if matches exist)
      if (selShape) {
        const shapeMatch = filtered.filter(
          (it) => this.norm(it.center_stone_shape) === selShape
        );

        if (shapeMatch.length) {
          filtered = shapeMatch;
        }
      }

      // 4️⃣ Pick lowest center_stone_size_filter (if exists)
      const withSize = filtered.filter(
        (it) => it.center_stone_size_filter != null
      );

      let result;

      if (withSize.length) {
        result = withSize.reduce((lowest, current) =>
          Number(current.center_stone_size_filter) <
          Number(lowest.center_stone_size_filter)
            ? current
            : lowest
        );
      } else {
        result = filtered[0];
      }

      // console.log("FINAL RESULT 👉", result);

      return result;


    // ✅ 3) metal only
    if (selMetal) {
      const byMetal = data.find((it) => this.normMetal(it.metal_color) === selMetal);
      if (byMetal) return byMetal;
    }
    // ✅ 4) shape only
    if (selShape) {
      const byShape = data.find((it) => this.norm(it.center_stone_shape) === selShape);
      if (byShape) return byShape;
    }

    // ✅ 5) show_on_plp YES fallback
    const plpYes = data.find((it) => (it.show_on_plp || "").toString().toUpperCase() === "YES");

    return plpYes || data[0];
  },

  /* ---------------- IMAGES ---------------- */
  setImg(img, url) {
    if (!img || !url) return;
    img.setAttribute("src", url);
    img.setAttribute("data-src", url);
    const srcset = `${url} 900w`;
    img.setAttribute("srcset", srcset);
    img.setAttribute("data-srcset", srcset);

    const pic = img.closest("picture");
    const source = pic ? pic.querySelector("source") : null;
    if (source) {
      source.setAttribute("srcset", srcset);
      source.setAttribute("data-srcset", srcset);
    }
  },

  getProductImgs(card) {
    const wrap = card.querySelector("a.wdd-card-link") || card;
    const imgs = wrap.querySelectorAll("img.product-media__image, img");

    const clean = [...imgs].filter((img) => {
      const src = (img.getAttribute("src") || "") + (img.getAttribute("data-src") || "");
      return (
        src &&
        !src.includes("shipping") &&
        !src.includes("wishlist") &&
        !src.includes("wdd/images") &&
        !src.includes("dl2vs6wk2ewna.cloudfront.net/wdd/images")
      );
    });

    return { img1: clean[0] || null, img2: clean[1] || null };
  },
  scrollActiveChipIntoView(card) {
    if (!card) return;
    const slider = card.querySelector("[data-shapes]");
    if (!slider) return;

    const activeChip = slider.querySelector(".shape-chip.active");
    if (!activeChip) return;

    setTimeout(() => {
      const chipLeft = activeChip.offsetLeft;
      const chipCenter = chipLeft - slider.offsetWidth / 2 + activeChip.offsetWidth / 2 + 20;
      slider.scrollTo({ left: chipCenter, behavior: "smooth" });
    }, 100);
  },
 
  /* ---------------- UPDATE CARD ---------------- */
  
  async updateCard(productId) {
    const card =
    document.querySelector(`product-card[data-product-id="${productId}"]`) ||
    document.querySelector(`.productcard_${productId}`);
    if (!card) return;

    try{
      const data = await this.getSkuDataForCard(card)
  
      // if (!data || !data.length) return;
      if (!data || !data.length) {
        this.hideLoader(card);
        return;
      }
      const hasFilters = this.hasActivePLPFilters();
      const plp = this.getPLPFiltersFromUrl();
  
      // ✅ If filters active: disable SKU lock + treat as user intent
      if (hasFilters) {

        if (plp.metal) card.dataset.selectedMetal = plp.metal;
        if (plp.shape) card.dataset.selectedShape = plp.shape;
      }
  
      const cardSku = (card.dataset.cardSku || "").trim();
      const sel0 = this.getSelected(card);
      // ✅ Only set selectedSku from cardSku when NO filters active
      if (!hasFilters && !sel0.user && !sel0.sku && cardSku) {
        this.setSelected(card, { sku: cardSku });
      }
  
      const item = this.pickItem(data, card);
      if (!item) {
        // this.hideLoader(card);
        return;
      }
      const sel1 = this.getSelected(card);
  
      // ✅ First render (non-user) set metal/shape from picked item
      if (!sel1.user) {
        this.setSelected(card, {
          metal: sel1.metal || item.metal_color,
          shape: sel1.shape || item.center_stone_shape
        });
      }
  
      // ✅ DO NOT programmatically click chips here (it triggers activate + clears SKU)
      // console.log('item: ', item)
  
      // images
      const m1 = this.toAbsMedia(item.media1 || item.media || item.image1);
      const hover = this.toAbsMedia(item.hover_image1 || item.media2 || item.hover || item.image2);
  // console.log('hover: ', hover)
      const { img1, img2 } = this.getProductImgs(card);
      if (m1 && img1) this.setImg(img1, m1);
      if (hover && img2) this.setImg(img2, hover);
  
      // store hover base only for image area
      const gallery = card.querySelector(".card-gallery");
      if (gallery) {
        if (m1) gallery.dataset.wddBaseMedia1 = m1;
        if (hover) gallery.dataset.wddBaseMedia2 = hover;
        if(hover == ''){
          gallery.dataset.wddBaseMedia2 = m1;
        }
      }
  
      // price
      const priceStrong =
        card.querySelector(".js-card-price") ||
        card.querySelector("product-price .price strong") ||
        card.querySelector(".price strong");
        const del_price = card.querySelector("product-price .price del");
        const pn = this.parsePriceToNumber(item.price);
        const pn_d = parseFloat(item.special_price);

      let finalPrice = pn;
      // console.log('pn_d: ', pn_d)
      // console.log('finalPrice: ', finalPrice)
      // apply discount only if pn_d is valid
      if (pn_d !== null && pn_d !== undefined && pn_d > 0) {
        finalPrice = pn - (pn * pn_d / 100);
      }

      if (finalPrice != null && priceStrong) {
        if (pn >finalPrice ){
        del_price.textContent = "$" + Math.round(pn).toLocaleString();
        }else{
          if (del_price){
            del_price.textContent = "" ;
         }
        }
        priceStrong.textContent = "$" + Math.round(finalPrice).toLocaleString();
      }
  
      // title (name only)
      const titleEl =
        card.querySelector("[data-card-title]") ||
        card.querySelector(".card_productTitle") ||
        card.querySelector(".product-card__title") ||
        card.querySelector("product-title .title-text");
      if (titleEl && item?.name) titleEl.textContent = item.name;
  
      // active chip UI based on selected values
      const sel2 = this.getSelected(card);
      const wm = this.normMetal(sel2.metal || "");
      const ws = this.norm(sel2.shape || "");
  
      if (wm) {
        card.querySelectorAll("button.metal-chip").forEach((b) => {
          b.classList.toggle("active", this.normMetal(b.dataset.metal) === wm);
        });
      }
      if (ws) {
        card.querySelectorAll("button.shape-chip").forEach((b) => {
          b.classList.toggle("active", this.norm(b.dataset.shape) === ws);
        });
      }
     
      // links keep selected
      const linkEl = card.querySelector("a.product-card__link");
      const galleryLink = card.querySelector("a.wdd-card-link");
      const titleLink = card.querySelector("a.card_productTitle");
  
      const baseHref = card.dataset.productUrl || linkEl?.getAttribute("href") || "";
      if (baseHref) {
        let base;
        try {
          base = new URL(baseHref, window.location.origin);
        // remove only ?variantpart
        // base = base.split("?variant")[0];

        // console.log("cleanHref:", base);
        } catch (e) {
          console.warn("Invalid baseHref, skip URL update:", baseHref);
          base = null;
        }
        if (base) {
          base.searchParams.delete("metal_color");
          base.searchParams.delete("variant");
          base.searchParams.delete("center_stone_shape");
  
          const sel3 = this.getSelected(card);
          if (sel3.metal) base.searchParams.set("metal_color", sel3.metal);
          if (sel3.shape) base.searchParams.set("center_stone_shape", sel3.shape);
          const href = base.pathname + '?new_url='+ item.url_key;
          // const href = base.pathname + base.search;
          // const href = base.pathname + item.url_key;
          if (linkEl) linkEl.setAttribute("href", href);
          if (galleryLink) galleryLink.setAttribute("href", href);
          if (titleLink) titleLink.setAttribute("href", href);
        }
      }
      //  requestAnimationFrame(() => this.scrollActiveChipIntoView(card));
    }catch (err) {
      console.error("[PLP updateCard error]", err);
    }finally {
      // ✅ loader OFF (har condition me)
      card.dataset.loading = "0";
      card.dataset.loaded = "true";
      this.hideLoader(card);
    }

  },

  /* ---------------- CHIP CLICK ---------------- */
  activate(btn, type) {
    const productId = btn.dataset.productid || btn.getAttribute("data-productId") || btn.getAttribute("data-productid");
    if (!productId) return;

    const card = document.querySelector(`.productcard_${productId}`);
    if (!card) return;

    // ✅ user interaction ON (disable SKU default priority)
    card.dataset.userSelected = "1";
    // ✅ unlock SKU so selection can change
    card.dataset.selectedSku = "";

    // ✅ update only clicked dimension
    if (type === "metal") card.dataset.selectedMetal = btn.dataset.metal || "";
    if (type === "shape") card.dataset.selectedShape = btn.dataset.shape || "";
    // immediate UI
    card.querySelectorAll(`.${type}-chip`).forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    
    // requestAnimationFrame(() => this.scrollActiveChipIntoView(card));

    // full json only on click (speed safe)
    this.showLoader(card);
    this.ensureFullJsonForCard(card).finally(() => this.updateCard(productId));
  },

  scrollBtnClick(btnEvent, dir) {
    const t = this.getEl(btnEvent.target);
    if (!t) return;
    const btn = t.closest("button");
    if (!btn) return;
    const pid = btn.getAttribute("data-productId") || btn.dataset.productid;
    const wrap = document.querySelector(`.productcard_${pid} [data-shapes]`);
    if (wrap) wrap.scrollBy({ left: dir === "-" ? -140 : 140, behavior: "smooth" });
  },

  observeCards(root = document) {
    const cards = root.querySelectorAll("product-card[data-product-id]");
    cards.forEach((card) => {
      // console.log('card: ', card)
      if (this._initedCards.has(card)) return;
      this._initedCards.add(card);
      this._io?.observe(card);
    });
  },

  /* ---------------- INIT ---------------- */
  init() {
    // hover sync (ignore chips)
    document.addEventListener(
      "pointerenter",
      (e) => {
        const t = this.getEl(e.target);
        if (!t) return;
        if (t.closest("button.shape-chip, button.metal-chip")) return;

        const gallery = t.closest(".card-gallery");
        if (!gallery) return;

        const card = gallery.closest("product-card");
        if (!card) return;

        const m1 = gallery.dataset.wddBaseMedia1;
        const m2 = gallery.dataset.wddBaseMedia2;
        const { img1, img2 } = this.getProductImgs(card);

        if (m1 && img1) this.setImg(img1, m1);
        if (m2 && img2) this.setImg(img2, m2);
      },
      true
    );

    
    // ✅ CAPTURE click (chips should always win)
    document.addEventListener(
      "click",
      (e) => {
        const t = this.getEl(e.target);
        if (!t) return;

        const shapeChip = t.closest("button.shape-chip");
        if (shapeChip) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.activate(shapeChip, "shape");
          return;
        }else{
          const grid = t.closest(".product-grid__item"); // change selector if needed
          if (!grid) return;

          // find active shape chip inside grid
          const activeChip = grid.querySelector("button.shape-chip.active"); 
          if (activeChip) {
            this.activate(activeChip, "shape");
          }
        }

        const metalChip = t.closest("button.metal-chip");
        // console.log('metalChip: ', metalChip)
        
        if (metalChip) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.activate(metalChip, "metal");
          return;
        }

        const prevBtn = t.closest("button.shape-nav.prev");
        if (prevBtn) {
          this.scrollBtnClick(e, "-");
          return;
        }

        const nextBtn = t.closest("button.shape-nav.next");
        if (nextBtn) {
          this.scrollBtnClick(e, "+");
          return;
        }
      },
      true
    );

    // IO once (pagination safe)
    if (!this._io) {
      this._io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;

            const card = en.target;
            this._io.unobserve(card);

            const productId = card.dataset.productId;
            if (!productId) return;

            const hasFilters = this.hasActivePLPFilters();
            const plp = this.getPLPFiltersFromUrl();

            // ✅ filters active => disable sku lock + treat as user intent
            if (hasFilters) {
              card.dataset.userSelected = "1";
              card.dataset.selectedSku = "";
            }
            // defaults (URL filter > liquid defaults)
            if (!card.dataset.selectedMetal) card.dataset.selectedMetal = plp.metal || card.dataset.defaultMetal || "";
            if (!card.dataset.selectedShape) card.dataset.selectedShape = plp.shape || card.dataset.defaultShape || "";
            if (!card.dataset.selectedSku) card.dataset.selectedSku = "";
            this.showLoader(card);
            this.updateCard(productId);
          });
        },
        // { rootMargin: "900px 0px" }
        { rootMargin: "300px 0px" }
      );
    }

    this.observeCards(document);

    // pagination observer
    if (!this._mo) {
      this._mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes?.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches?.("product-card[data-product-id]")) {
              this.observeCards(node.parentNode || document);
              return;
            }
            if (node.querySelector?.("product-card[data-product-id]")) {
              this.observeCards(node);
            }
            
          });
        }
      });

      const grid =
        document.querySelector("[data-section-type='collection']") ||
        document.querySelector("#MainContent") ||
        document.body;

      this._mo.observe(grid, { childList: true, subtree: true });
    }
  },
};

window.collection.init();

// all new js 

document.addEventListener("click", function(e){

  const prevBtn = e.target.closest(".custom_slider_mobile .custom-prev");
  const nextBtn = e.target.closest(".custom_slider_mobile .custom-next");

  if(!prevBtn && !nextBtn) return;

  const slideshow = e.target.closest(".custom_slider_mobile");

  if(!slideshow) return;

  if(nextBtn && typeof slideshow.next === "function"){
    slideshow.next();
  }

  if(prevBtn && typeof slideshow.previous === "function"){
    slideshow.previous();
  }

});

document.querySelectorAll(".custom_slider_mobile").forEach(slider => {
  const slides = slider.querySelectorAll("slideshow-slide");

  if(slides.length <= 1){
    slider.querySelectorAll(".custom-mobile-arrow").forEach(btn => {
      btn.style.display = "none";
    });
  }
});

document.addEventListener("click", function(e){

  const control = e.target.closest(
    ".custom_slider_mobile .slideshow-control, .custom_slider_mobile slideshow-pagination button"
  );

  if (!control) return;

  const anchor = e.target.closest("a.contents");
  if (anchor) {
    anchor.dataset.preventNavigation = "true";
  }

  e.stopPropagation();

});
document.addEventListener("click", function(e){

  const anchor = e.target.closest("a.contents");

  if (!anchor) return;

  if (anchor.dataset.preventNavigation === "true") {
    e.preventDefault();
    anchor.dataset.preventNavigation = "false";
  }

}, true);



document.querySelectorAll(".custom_slider_mobile").forEach(slider => {

  const slides = slider.querySelector("slideshow-slides");

  if(!slides) return;

  slider.addEventListener("pointerdown", () => {
    slides.style.transition = "none";
    slides.style.cursor = "grabbing";
  });

  slider.addEventListener("pointerup", () => {
    slides.style.transition = "";
    slides.style.cursor = "";
  });

});

document.addEventListener("DOMContentLoaded", function () {
  try {
    const pathParts = window.location.pathname.split("/").filter(Boolean);

    // No tag → do nothing
    if (pathParts.length < 3) return;

    const collectionHandle = pathParts[1];
    const currentTag = decodeURIComponent(pathParts[2]).toLowerCase();

    // Clean URL (remove tag BEFORE running filters)
    const cleanUrl = `/collections/${collectionHandle}`;
    window.history.replaceState({}, "", cleanUrl);

    // Wait a bit for filters to be ready
    setTimeout(() => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');

  let matchedCheckbox = null;

  // normalize currentTag
  const normalizedTag = currentTag
    .toLowerCase()
    .replace(/[-\s]+/g, '');

  checkboxes.forEach(cb => {
    const normalizedValue = cb.value
      ?.toLowerCase()
      .replace(/[-\s]+/g, '');

    console.log('normalizedValue:', normalizedValue);
    console.log('normalizedTag:', normalizedTag);

    if (normalizedValue === normalizedTag) {
      matchedCheckbox = cb;
    }
  });

  console.log('matchedCheckbox:', matchedCheckbox);

  if (!matchedCheckbox) return;

  matchedCheckbox.checked = true;
  matchedCheckbox.dispatchEvent(
    new Event("change", { bubbles: true })
  );

}, 200);


//     requestAnimationFrame(() => {
//   matchedCheckbox.checked = true;
//   matchedCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
// });
  } catch (e) {
    console.warn("Tag-to-filter sync error:", e);
  }
});
