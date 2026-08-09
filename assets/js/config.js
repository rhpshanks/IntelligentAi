/* ---------------------------------------------------------------------------
   Site configuration. Edit this one file to wire up live services.
   Nothing here is secret: treat every value as public.
   --------------------------------------------------------------------------- */
window.IS_CONFIG = {

  /* Contact form delivery.
     Leave empty and the form composes a pre-filled email in the visitor's mail
     app instead. Paste a POST endpoint (Formspree, Basin, Web3Forms, or your
     own handler) to switch to background submission with no mail app step.
     Remember to add the host to the connect-src list in each page's CSP. */
  formEndpoint: '',

  /* Where enquiries land. Used by the mail fallback and shown on the site. */
  email: 'me@hashaamshahid.com',

  /* Published phone line. Display and dial formats kept separate on purpose. */
  phoneDisplay: '+44 7848 174335',
  phoneDial: '+447848174335',

  /* Measurement. Any non-empty value switches on the consent notice; the
     measurement script then loads only once a visitor accepts, never before.
     Set this back to '' to remove the notice and all measurement.

     'vercel' selects Vercel Web Analytics, wired in assets/js/analytics.js.
     That script is served by Vercel's edge at /_vercel/insights/script.js, so
     it reports nothing on a host other than Vercel. */
  analyticsId: 'vercel'
};
