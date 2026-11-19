let state = { shape: null, metal: null };
let cartIdcartIdValue = null;
const norm = v => (v||'').toString().trim().toLowerCase();
// shape carousel arrows

function parseJSON(text){ try { return JSON.parse(text || 'null'); } catch(e){ return null; } }
function coerceArray(val){
  try{
    if(Array.isArray(val)) return val;
    if(val && typeof val === 'object'){
      if(Array.isArray(val.value)) return val.value;
      if(typeof val.value === 'string') return JSON.parse(val.value);
    }
    if(typeof val === 'string' && val.trim()){
      const j = JSON.parse(val);
      if(Array.isArray(j)) return j;
      if(j && Array.isArray(j.value)) return j.value;
    }
  }catch(e){}
  return [];
}
function normMetal(v){
  v = (v||'').toString().trim().toLowerCase();
  if(!v) return '';
  if(v.indexOf('platinum')>-1) return 'platinum';
  if(v.indexOf('rose')>-1) return 'rose';
  if(v.indexOf('yellow')>-1) return 'yellow';
  if(v.indexOf('white')>-1 || v==='silver') return 'white';
  return v;
}
function minPriceCents(arr){
  let min = null;
  arr.forEach(it=>{
    let p = it.price || it.price_1 || it.price_2 || it.price_3;
    if(p!=null){
      p = String(p).replace(/[,$₹\sRs.]/g,'');
      const cents = Math.round(parseFloat(p||0)*100);
      if(!isNaN(cents) && (min===null || cents<min)) min = cents;
    }
  });
  return min;
}
function setActive(nodeList, key, val){
  nodeList.forEach(b=> b.classList.toggle('active', (b.dataset[key]||'')===val));
}
function pickItem(data){
  let list = data.filter(it =>
    (!state.shape || norm(it.center_stone_shape)===norm(state.shape)) &&
    (!state.metal || normMetal(it.metal_color)===norm(state.metal))
  );
  if(!list.length && state.shape){
    list = data.filter(it => norm(it.center_stone_shape)===norm(state.shape));
  }
  if(!list.length && state.metal){
    list = data.filter(it => normMetal(it.metal_color)===norm(state.metal));
  }
  return list[0] || data[0];
}
function updateCard(cartId){
      
  // Read metafield data (robust)
  const card = document.querySelector(`.productcard_${cartId}`);
  const valEl = card.querySelector('.wdd-skudata-val');
  const linkEl = card.querySelector('product-card-link a');
  const cardGalleryLink = card.querySelector('.wdd-card-link');
  const titleLink = card.querySelector('.card_productTitle');
  let data = coerceArray(parseJSON(valEl && valEl.textContent));
  let item = pickItem(data);
  // image
  const media = (item && item.media && item.media.length) ? item.media[0] : null;
  const img = card.querySelector('slideshow-slides slideshow-slide[aria-hidden="false"] img');
  console.log('media: ', media)
  if(media && img){
    img.srcset = media;
  }
  else {
    if(img.src) {
      img.src = media;
    }
  }
  // From price
  const priceStrong = card.querySelector('product-price .price');
  if(priceStrong){
    const subset = data.filter(it =>
      (!state.shape || norm(it.center_stone_shape)===norm(state.shape)) &&
      (!state.metal || normMetal(it.metal_color)===norm(state.metal))
    );
    const pmin = minPriceCents(subset.length? subset : data);
    if(pmin!=null){
      priceStrong.textContent = '$'+(pmin/100).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
    }
  }

  // link with params
  const base = new URL(card.dataset.productUrl || linkEl.getAttribute('href'), window.location.origin);
  base.searchParams.delete('metal_color'); base.searchParams.delete('center_stone_shape');
  if(state.metal) base.searchParams.set('metal_color', state.metal);
  if(state.shape) base.searchParams.set('center_stone_shape', state.shape);
  const href = base.pathname + base.search;
  linkEl.setAttribute('href', href);
  titleLink.setAttribute('href', href);
  cardGalleryLink.setAttribute('href', href);
}
function activeShap(btn, btnShap, shapeChipClass) {
  let cartId =  btnShap.target.getAttribute('data-productId');
  if(cartIdcartIdValue !== cartId){
    state = { shape: null, metal: null };
    cartIdcartIdValue = cartId
  } 
  if(shapeChipClass == 'button.shape-chip') state.shape = btn.dataset.shape;
  if(shapeChipClass == 'button.metal-chip') state.metal = btn.dataset.metal;
  document.querySelectorAll(`.productcard_${cartId} ${shapeChipClass}`).forEach((shapChip) =>{
  shapChip.classList.remove('active');
  });
  btn.classList.add('active')
  updateCard(cartId);
}
// function scrollBtnClick(btnShap, leftValue){
//   let cartId =  btnShap.target.getAttribute('data-productId');
//   document.querySelector(`.productcard_${cartId} [data-shapes]`).scrollBy({left: `${leftValue}140`, behavior:'smooth'});
// }

function scrollBtnClick(btnShap, direction){
  let cartId = btnShap.target.getAttribute('data-productId');
  const container = document.querySelector(`.productcard_${cartId} [data-shapes]`);
  
  const amount = direction === "next" ? 140 : -140;
  container.scrollBy({ left: amount, behavior: 'smooth' });
}

document.querySelectorAll('[data-shapes]').forEach((slider) => {
  let startX = 0;
  let endX = 0;

  slider.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });

  slider.addEventListener('touchmove', (e) => {
    endX = e.touches[0].clientX;
  });

  slider.addEventListener('touchend', () => {
    let diff = startX - endX;

    if (Math.abs(diff) > 50) {
      const scrollAmount = diff > 0 ? 140 : -140;
      slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  });
});
// Global click listener for all dynamic elements
document.addEventListener("click", function (e) {
  // ---- SHAPE CHIP ----
  const shapeChip = e.target.closest(".shape-chip");
  if (shapeChip) {
    activeShap(shapeChip, e, "button.shape-chip");
    return; 
  }

  // ---- METAL CHIP ----
  const metalChip = e.target.closest(".metal-chip");

  if (metalChip) {
    activeShap(metalChip, e, "button.metal-chip");
    return;
  }

  // ---- SHAPE NAV PREV ----
  const prevBtn = e.target.closest(".shape-nav.prev");
  if (prevBtn) {
    scrollBtnClick(e, "prev");
    return;
  }

  // ---- SHAPE NAV NEXT ----
  const nextBtn = e.target.closest(".shape-nav.next");
  if (nextBtn) {
    scrollBtnClick(e, "next");
    return;
  }

});

let checkbox__label = document.querySelectorAll(".checkbox__label-text");

checkbox__label.forEach((item) => {
  item.addEventListener("click", () => {
      item.classList.toggle("active");
  });
});

let facetsSummary = document.querySelectorAll(".filter_tab_wdd .facets__filters-wrapper .facets__panel .facets__summary");

facetsSummary.forEach((item) => {
    item.addEventListener("click", function () {

        // Remove "open" from parent of ALL panels
    if (window.innerWidth > 991) {
      document.querySelectorAll(".facets__filters-wrapper .facets__panel").forEach(panel => {
        console.log('innnn')
        if (panel.hasAttribute("open")) {
          panel.removeAttribute("open");
        }
      });
    }

        // console.log(this)

        // Add "open" ONLY to parent of the clicked item
        // this.closest(".facets__panel").setAttribute("open");
    });
});

document.querySelectorAll('.menu-list__list-item').forEach((item) => {
  const link = item.querySelector('.menu-list__link');

  item.addEventListener('mouseenter', () => {
    link.setAttribute('aria-expanded', 'true');
  });

  item.addEventListener('mouseleave', () => {
    link.setAttribute('aria-expanded', 'false');
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

// let lowerSlider = document.querySelectorAll('.lower');
// let upperSlider = document.querySelectorAll('.upper');

// // Set initial values
// document.querySelectorAll('.two').forEach((el, i) => {
//   el.value = upperSlider[i]?.value || "";
// });

// document.querySelectorAll('.one').forEach((el, i) => {
//   el.value = lowerSlider[i]?.value || "";
// });

// document.querySelectorAll('price-facet-component .Price-LTE').forEach((el, i) => {
//   el.value = upperSlider[i]?.value || "";
// });

// document.querySelectorAll('price-facet-component .Price-GTE').forEach((el, i) => {
//   el.value = lowerSlider[i]?.value || "";
// });


// ----------------------------
// UPPER SLIDER EVENTS
// ----------------------------
// upperSlider.forEach((slider, i) => {
//   slider.addEventListener("input", (event) => {
//     let val = parseFloat(event.target.value);
//     let minVal = parseFloat(lowerSlider[i].value);

//     if (val < minVal + 4) {
//       event.target.value = minVal + 4;
//       val = minVal + 4;
//     }

//     // Update UI
//     document.querySelectorAll('.two')[i].value = val;
//     document.querySelectorAll('price-facet-component .Price-LTE')[i].value = val;
//   });

//   slider.addEventListener("change", function () {
//     const form = this.closest('facets-form-component');
//     form?.updateFilters();
//   });
// });


// ----------------------------
// LOWER SLIDER EVENTS
// ----------------------------
// lowerSlider.forEach((slider, i) => {
//   slider.addEventListener("input", (event) => {
//     let val = parseFloat(event.target.value);
//     let maxVal = parseFloat(upperSlider[i].value);

//     if (val > maxVal - 4) {
//       event.target.value = maxVal - 4;
//       val = maxVal - 4;
//     }

//     // Update UI
//     document.querySelectorAll('.one')[i].value = val;
//     document.querySelectorAll('price-facet-component .Price-GTE')[i].value = val;
//   });

//   slider.addEventListener("change", function () {
//     const form = this.closest('facets-form-component');
//     form?.updateFilters();
//   });
// });
