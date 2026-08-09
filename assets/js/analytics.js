/* ---------------------------------------------------------------------------
   Vercel Web Analytics, held behind the consent gate.

   Why a script path rather than the npm module
   -------------------------------------------
   @vercel/analytics is recorded in package.json and is the reference for this
   behaviour, but it ships as an ES module meant for a bundler. This site has
   no build step, so importing it in the browser is not possible. Its inject()
   does exactly one thing in production: append a deferred script pointing at
   /_vercel/insights/script.js. That is what happens below, so the runtime
   behaviour matches the package while the site stays dependency free at serve
   time. Swap this file for an import if a bundler ever gets added.

   Two properties worth keeping
   ----------------------------
   1. The script is same origin, so the strict Content Security Policy on every
      page needs no third party host added to it.
   2. Nothing loads until the visitor accepts. site.js fires the event below
      only past that point, which is the promise the cookie notice makes.

   Hosting note: /_vercel/insights/ is served by Vercel's edge. On any other
   host the request returns 404 and no measurement happens.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';

  var SRC = '/_vercel/insights/script.js';
  var started = false;

  function load() {
    if (started) return;
    started = true;

    var tag = document.createElement('script');
    tag.src = SRC;
    tag.defer = true;
    tag.addEventListener('error', function () {
      /* Most likely the site is not served from Vercel. Measurement simply
         does not happen; nothing else on the page depends on this. */
      if (window.console && console.info) {
        console.info('[analytics] measurement script unavailable on this host');
      }
    });

    document.head.appendChild(tag);
  }

  /* Registered before site.js runs, because site.js may fire this event the
     moment it executes when consent was granted on an earlier visit. */
  document.addEventListener('is:consentgranted', load);
})();
