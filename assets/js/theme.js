/* Runs before first paint so the stored theme never flashes.
   Kept deliberately tiny and dependency free. */
(function () {
  /* Marks the page as script capable. Anything that hides copy until script
     runs is gated on this class, so a script failure never leaves a blank
     page behind. */
  document.documentElement.classList.add('js');

  try {
    var t = window.localStorage.getItem('is-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch (e) {
    /* storage blocked: system preference applies via CSS */
  }
})();
