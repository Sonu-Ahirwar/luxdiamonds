console.log("WISHLIST JS LOADED");
(function () {
  function getWishlistCustomerId() {
    if (window.__CUSTOMER_ID__) {
      return String(window.__CUSTOMER_ID__);
    }

    let browserId = localStorage.getItem("wishlist_browser_id");
    if (!browserId) {
      browserId = "browser_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("wishlist_browser_id", browserId);
    }

    return browserId;
  }

  function renderCard(item) {
    const p = item.snapshot || {};
    const image = p.image || "";
    const title = p.title || "";
    const price = p.price || 0;
    const url = p.url || "#";
    const sku = p.metafields_data.sku || "";

    return `
      <div class="wishlist_grid_item">
        <div class="wishlist-product-wrap">
          <a href="${url}">
            <img src="${image}" alt="${title}">
          </a>
          <div class="wishlist_product_info">
            <a href="${url}">
              <h3>${title}</h3>
            </a>
            <h5 class="product-SKU">${sku}</h5>
            <p>$${price}</p>
          </div>
        </div>
        <button type="button" class="wishlist_addtocart">
          Add to Cart
        </button>
      </div>
    `;
  }

  async function loadWishlistData() {
    const loading = document.getElementById("wishlist-loading");
    const empty = document.getElementById("wishlist-empty");
    const grid = document.getElementById("wishlist-grid");
    const shareBtn = document.getElementById("wishlist-share-open");

    const customerId = getWishlistCustomerId();

    try {
      loading.style.display = "block";
      grid.innerHTML = "";
      empty.style.display = "none";
      if (shareBtn) shareBtn.style.display = "none";

      const url = new URL("/apps/custom-forms/wishlist/list", window.location.origin);
      url.searchParams.set("customerId", customerId);

      const res = await fetch(url.toString());
      const data = await res.json();

      // console.log("wishlist data:", data);

      if (!data.success || !data.data.length) {
        empty.style.display = "block";
        return;
      }

      grid.innerHTML = data.data.map(renderCard).join("");
      if (shareBtn) shareBtn.style.display = "inline-block";
    } catch (err) {
      // console.error(err);
      empty.style.display = "block";
      if (shareBtn) shareBtn.style.display = "none";
    } finally {
      loading.style.display = "none";
    }
  }

  // ---------- Share Wishlist ----------
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showShareMessage(text, isError) {
    const msg = document.getElementById("wishlist-share-message");
    if (!msg) return;
    msg.textContent = text;
    msg.style.display = "block";
    msg.classList.toggle("is-error", !!isError);
    msg.classList.toggle("is-success", !isError);
  }

  function openShareModal() {
    const modal = document.getElementById("wishlist-share-modal");
    if (!modal) return;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    const emailInput = document.getElementById("wishlist-share-email");
    if (emailInput) {
      emailInput.value = "";
      emailInput.focus();
    }
    const msg = document.getElementById("wishlist-share-message");
    if (msg) {
      msg.style.display = "none";
      msg.textContent = "";
    }
  }

  function closeShareModal() {
    const modal = document.getElementById("wishlist-share-modal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }

  async function submitShareWishlist(email) {
    const submitBtn = document.getElementById("wishlist-share-submit");

    const payload = {
      customerId: getWishlistCustomerId(), // apni wishlist ki id (login = customer.id, warna browser_id)
      email: email // jisko wishlist share karni hai
    };

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }

      const res = await fetch("/apps/custom-forms/wishlist/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showShareMessage("Wishlist shared successfully!", false);
        setTimeout(closeShareModal, 1500);
      } else {
        showShareMessage((data && data.message) || "Something went wrong. Please try again.", true);
      }
    } catch (err) {
      showShareMessage("Something went wrong. Please try again.", true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send";
      }
    }
  }

  function initShareWishlist() {
    const openBtn = document.getElementById("wishlist-share-open");
    const closeBtn = document.getElementById("wishlist-share-close");
    const overlay = document.getElementById("wishlist-share-overlay");
    const form = document.getElementById("wishlist-share-form");
    const emailInput = document.getElementById("wishlist-share-email");

    if (openBtn) openBtn.addEventListener("click", openShareModal);
    if (closeBtn) closeBtn.addEventListener("click", closeShareModal);
    if (overlay) overlay.addEventListener("click", closeShareModal);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeShareModal();
    });

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const email = (emailInput && emailInput.value || "").trim();

        if (!isValidEmail(email)) {
          showShareMessage("Please enter a valid email address.", true);
          return;
        }

        submitShareWishlist(email);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadWishlistData();
    initShareWishlist();
  });
})();