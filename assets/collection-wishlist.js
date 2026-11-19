/**
 * collection-wishlist.js — FIXED VERSION
 *
 * Changes:
 * 1. SPEED FIX: Individual /check calls hataye, ek /batch-check call lagti hai
 *    (24 products = 1 API call instead of 24+)
 * 2. Optimistic UI: click pe heart turant fill hota hai, API ke wait kiye bina
 * 3. MutationObserver me debounce — DOM changes pe bar-bar sync nahi hota
 */
(function () {

  function getWishlistCustomerId() {
    if (window.__CUSTOMER_ID__) return String(window.__CUSTOMER_ID__);
    let id = localStorage.getItem("wishlist_browser_id");
    if (!id) {
      id = "browser_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("wishlist_browser_id", id);
    }
    return id;
  }

  function getEnginesByProductId(productId) {
    return Array.from(
      document.querySelectorAll(`.wishlist-engine[data-product_id="${productId}"]`)
    );
  }

  function setHeartUi(productId, active) {
    getEnginesByProductId(productId).forEach((engine) => {
      engine.classList.toggle("is-active", !!active);
      engine.querySelectorAll("svg").forEach((svg) => {
        svg.style.fill = active ? "#c47881" : "";
        svg.style.stroke = active ? "#c47881" : "";
      });
      engine.querySelectorAll("svg path").forEach((path) => {
        path.style.fill = active ? "#c47881" : "";
        path.style.stroke = active ? "#c47881" : "";
      });
      engine.querySelectorAll("i").forEach((icon) => {
        icon.style.color = active ? "#c47881" : "";
      });
    });
  }

  function parseMetafields(engine) {
    try { return JSON.parse(engine.dataset.metafields || "{}"); }
    catch (e) { return {}; }
  }

  function getPriceFromCard(engine) {
    const card = engine.closest(".product-grid__item");
    if (!card) return 0;
    const priceEl = card.querySelector(".js-card-price");
    if (!priceEl) return 0;
    return Number(priceEl.textContent.replace(/[^\d.]/g, ""));
  }

  function buildWishlistPayload(engine) {
    return {
      customerId: getWishlistCustomerId(),
      productId: engine.dataset.product_id || "",
      productHandle: engine.dataset.product_handle || "",
      snapshot: {
        id: engine.dataset.product_id || "",
        handle: engine.dataset.product_handle || "",
        title: engine.dataset.title || "",
        url: engine.dataset.url || "",
        image: engine.dataset.image || "",
        price: getPriceFromCard(engine),
        sku: engine.dataset.sku || "",
        metafields_data: parseMetafields(engine)
      }
    };
  }

  // --- BATCH CHECK (Speed Fix) ---
  // Ek call me saare products check — O(1) instead of O(n)
  async function batchCheckWishlist(productIds) {
    if (!productIds || productIds.length === 0) return {};
    try {
      const url = new URL("/apps/custom-forms/wishlist/batch-check", window.location.origin);
      url.searchParams.set("customerId", getWishlistCustomerId());
      url.searchParams.set("productIds", productIds.join(","));
      const res = await fetch(url.toString(), { method: "GET" });
      const data = await res.json();
      return (data && data.success && data.data) ? data.data : {};
    } catch (e) {
      return {};
    }
  }

  async function addWishlist(engine) {
    const payload = buildWishlistPayload(engine);
    try {
      const res = await fetch("/apps/custom-forms/wishlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHeartUi(engine.dataset.product_id, true);
      }
    } catch (e) {}
  }

  async function removeWishlist(engine) {
    try {
      const res = await fetch("/apps/custom-forms/wishlist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: getWishlistCustomerId(),
          productId: engine.dataset.product_id
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHeartUi(engine.dataset.product_id, false);
      }
    } catch (e) {}
  }

  async function toggleWishlist(engine) {
    const productId = engine.dataset.product_id;
    if (!productId) return;
    if (engine.dataset.wishlistBusy === "true") return;
    engine.dataset.wishlistBusy = "true";

    try {
      // Optimistic UI: turant state flip karo
      const isActive = engine.classList.contains("is-active");
      setHeartUi(productId, !isActive);

      if (isActive) {
        await removeWishlist(engine);
      } else {
        await addWishlist(engine);
      }

      document.dispatchEvent(new CustomEvent("wishlist:updated"));
    } finally {
      setTimeout(() => { engine.dataset.wishlistBusy = "false"; }, 300);
    }
  }

  function bindWishlistEngines(scope) {
    const engines = (scope || document).querySelectorAll(".wishlist-engine");
    engines.forEach((engine) => {
      if (engine.dataset.listWishlistBound === "true") return;
      engine.dataset.listWishlistBound = "true";

      engine.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(engine);
      });
    });
  }

  // SPEED FIX: Ek batch call se saare products sync karo
  async function initialSyncAll() {
    const ids = Array.from(
      new Set(
        Array.from(document.querySelectorAll(".wishlist-engine"))
          .map((el) => el.dataset.product_id)
          .filter(Boolean)
      )
    );

    if (ids.length === 0) return;

    const results = await batchCheckWishlist(ids);

    Object.entries(results).forEach(([productId, exists]) => {
      setHeartUi(productId, exists);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindWishlistEngines(document);
    setTimeout(initialSyncAll, 400);
  });

  document.addEventListener("shopify:section:load", function (event) {
    bindWishlistEngines(event.target);
    setTimeout(initialSyncAll, 400);
  });

  // MutationObserver me debounce — DOM thrash pe bar-bar sync nahi hoga
  let syncTimer = null;
  const observer = new MutationObserver(function (mutations) {
    let newEnginesFound = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1 &&
            (node.classList?.contains("wishlist-engine") ||
             node.querySelector?.(".wishlist-engine"))) {
          newEnginesFound = true;
          break;
        }
      }
      if (newEnginesFound) break;
    }
    if (!newEnginesFound) return;

    bindWishlistEngines(document);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(initialSyncAll, 500);
  });

  observer.observe(document.body, { childList: true, subtree: true });

})();