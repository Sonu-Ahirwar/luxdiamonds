/**
 * wishlist-count.js — FIXED VERSION
 *
 * Changes:
 * 1. Console.log hataaye (production me noise nahi chahiye)
 * 2. wishlist:updated event pe double-call nahi hoga (debounce added)
 * 3. Count 0 hone par bhi element properly hide hoga
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

  async function updateHeaderWishlistCount() {
    try {
      const elements = document.querySelectorAll(".wishlist-total-count");
      if (!elements.length) return;

      const url = `/apps/custom-forms/wishlist/count?customerId=${encodeURIComponent(getWishlistCustomerId())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.success) {
        const count = data.count || 0;
        elements.forEach((el) => {
          el.textContent = count;
          el.setAttribute("data-total", count);
          el.style.display = count > 0 ? "inline-flex" : "none";
        });
      }
    } catch (e) {
      // Silent fail — count update na ho to bhi page break nahi hona chahiye
    }
  }

  // Global access (wdd-engagement-wishlist.js bhi use karta hai)
  window.updateHeaderWishlistCount = updateHeaderWishlistCount;

  // Page load pe run karo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(updateHeaderWishlistCount, 400));
  } else {
    setTimeout(updateHeaderWishlistCount, 400);
  }

  // Section reload
  document.addEventListener("shopify:section:load", function () {
    setTimeout(updateHeaderWishlistCount, 300);
  });

  // Add/remove ke baad — debounce rakho taaki double calls na ho
  let countDebounce = null;
  document.addEventListener("wishlist:updated", function () {
    clearTimeout(countDebounce);
    countDebounce = setTimeout(updateHeaderWishlistCount, 200);
  });

})();