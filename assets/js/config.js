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

  /* Measurement. While this stays empty the site sets no non-essential
     cookies, loads no third party script, and shows no consent banner,
     which is the correct position under UK and EU cookie rules.
     Set an ID to switch on the consent banner and the loader in site.js. */
  analyticsId: ''
};
