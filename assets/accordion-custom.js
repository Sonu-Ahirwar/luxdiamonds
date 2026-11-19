import { mediaQueryLarge, isMobileBreakpoint } from '@theme/utilities';

// Accordion
class AccordionCustom extends HTMLElement {
  /** @type {HTMLDetailsElement} */
  get #isMobile991() {
  return window.matchMedia('(max-width: 991px)').matches;
}

  get details() {
    const details = this.querySelector('details');

    if (!(details instanceof HTMLDetailsElement)) throw new Error('Details element not found');

    return details;
  }

  /** @type {HTMLElement} */
  get summary() {
    const summary = this.details.querySelector('summary');

    if (!(summary instanceof HTMLElement)) throw new Error('Summary element not found');

    return summary;
  }

  get #disableOnMobile() {
    return this.dataset.disableOnMobile === 'true';
  }

  get #disableOnDesktop() {
    return this.dataset.disableOnDesktop === 'true';
  }

  get #closeWithEscape() {
    return this.dataset.closeWithEscape === 'true';
  }

  #controller = new AbortController();

  connectedCallback() {
    const { signal } = this.#controller;

    this.#setDefaultOpenState();

    this.addEventListener('keydown', this.#handleKeyDown, { signal });
    this.summary.addEventListener('click', this.handleClick, { signal });
    mediaQueryLarge.addEventListener('change', this.#handleMediaQueryChange, { signal });
  }

  /**
   * Handles the disconnect event.
   */
  disconnectedCallback() {
    // Disconnect all the event listeners
    this.#controller.abort();
  }

  /**
   * Handles the click event.
   * @param {Event} event - The event.
   */
handleClick = (event) => {

  const isMobile = this.#isMobile991;
  const isDesktop = !isMobile;


  const details = this.details;
// open close collection filter
  const wrapper = this.closest('.facets__filters-wrapper');

  if (wrapper) {
    setTimeout(() => {
      wrapper.querySelectorAll('accordion-custom details').forEach(detail => {
        if (detail !== details) {
          detail.removeAttribute('open');
        }
      });
    }, 0);
  }

  if ((isMobile && this.#disableOnMobile) || (isDesktop && this.#disableOnDesktop)) {
    event.preventDefault();
    return;
  }


  /* ===========================
   FACETS ACCORDION
   (.facets__overflow-list)
   =========================== */
  const facetsParent = details.closest('.facets__overflow-list');

  if (facetsParent) {

    // prevent closing if already open
    if (details.open) {
      event.preventDefault();
      return;
    }

    // allow open + close other tabs
    setTimeout(() => {

      facetsParent.querySelectorAll('details').forEach(d => {
        if (d !== details) d.removeAttribute('open');
      });

    }, 0);

    return;
  }

    /* ===========================
      CARET ACCORDION
      (.accordion--caret)
      =========================== */
    const caretParent = details.closest('.accordion--caret');

    if (caretParent) {

      event.preventDefault(); // disable native toggle

      const isOpen = details.hasAttribute('open');

      // close siblings
      caretParent.querySelectorAll('details').forEach(d => {
        d.removeAttribute('open');
      });

      // toggle current
      if (!isOpen) {
        details.setAttribute('open', '');
      }

      return;
    }

};


  /**
   * Handles the media query change event.
   */
  #handleMediaQueryChange = () => {
    this.#setDefaultOpenState();
  };

  /**
   * Sets the default open state of the accordion based on the `open-by-default-on-mobile` and `open-by-default-on-desktop` attributes.
   */
  #setDefaultOpenState() {
      // If data-open-by-default is set, always keep it open (e.g., first filter)
    if (this.hasAttribute('data-open-by-default')) {
      this.details.open = true;
      return;
    }

    const isMobile = isMobileBreakpoint();

    this.details.open =
      (isMobile && this.hasAttribute('open-by-default-on-mobile')) ||
      (!isMobile && this.hasAttribute('open-by-default-on-desktop'));
  }

  /**
   * Handles keydown events for the accordion
   *
   * @param {KeyboardEvent} event - The keyboard event.
   */
  #handleKeyDown(event) {
    // Close the accordion when used as a menu
    if (event.key === 'Escape' && this.#closeWithEscape) {
      event.preventDefault();

      this.details.open = false;
      this.summary.focus();
    }
  }
}

if (!customElements.get('accordion-custom')) {
  customElements.define('accordion-custom', AccordionCustom);
}
