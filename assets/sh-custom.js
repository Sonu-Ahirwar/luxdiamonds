// accordion code start

document.addEventListener('DOMContentLoaded', () => {
    document
      .querySelectorAll('.accordion details')
      .forEach((details) => {
        details.addEventListener('toggle', () => {
          if (!details.open) return;

          document
            .querySelectorAll('.accordion details')
            .forEach((other) => {
              if (other !== details) {
                other.removeAttribute('open');
              }
            });
        });
      });
});

// accordion code end


