// loader.js
// Handles the loading screen + page reveal.
// Waits for resources, fonts, and a minimum display time before fading out.

(function() {
  const loader = document.getElementById('loader-overlay');
  const mainContent = document.getElementById('main-content');

  // Minimum time to show the loader (ms)
  const MIN_DISPLAY_MS = 2000;

  const startTime = performance.now();

  function revealPage() {
    if (!loader || !mainContent) return;
    if (loader.classList.contains('fade-out')) return;

    loader.classList.add('fade-out');

    setTimeout(() => {
      loader.style.display = 'none';
    }, 800);

    mainContent.style.display = 'block';
    void mainContent.offsetWidth; // force reflow
    mainContent.classList.add('visible');

    // Tell all the sim scripts it's safe to initialize
    window.dispatchEvent(new CustomEvent('pageRevealed'));
  }

  function waitForResources() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve());
      }
    });
  }

  function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready;
    }
    return Promise.resolve();
  }

  Promise.all([
    waitForResources(),
    waitForFonts(),
    new Promise(resolve => setTimeout(resolve, MIN_DISPLAY_MS))
  ]).then(() => {
    revealPage();
  });
})();
