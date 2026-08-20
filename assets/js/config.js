/* ---------------------------------------------------------------------------
   Site configuration. Edit this one file to wire up live services.
   Nothing here is secret: treat every value as public.
   --------------------------------------------------------------------------- */
window.IS_CONFIG = {

  /* WhatsApp is the way in. Every phone control on the site opens a chat with
     a message already written, so nobody has to compose anything.

     The links sit in the page markup rather than being built here, so they
     work without scripting and search engines can see them. That means the
     number lives in eleven pages at once, which is why check-site.py fails the
     build the moment one of them drifts. Change the number by search and
     replace across the HTML, then run the checker.

     Number in link form: 447848174335, with no plus, spaces or dashes.

     ---

     Contact form delivery, through Web3Forms. DORMANT: the contact page no
     longer carries a form, so nothing below runs today. It stays because the
     handler in site.js is guarded and costs nothing, and putting a form back
     needs only the markup returning. */

     Both values below have to be set before background sending switches on.
     With either one empty the form keeps working through the visitor's own
     mail app, so the page is never broken while this gets configured.

     To switch it on:
       1. Go to web3forms.com, enter me@hashaamshahid.com, and they email an
          access key straight back.
       2. Paste that key into formAccessKey below.
       3. Nothing else. The endpoint and the page security policy already
          allow it.

     The access key belongs in public page code by design: it only permits
     sending to the address it was issued for, so it cannot be used to mail
     anybody else. It is not a password and it is not a secret. */
  formEndpoint: 'https://api.web3forms.com/submit',
  formAccessKey: '75dcfcdc-4715-4eb4-aa2d-88bd6fba2b84',

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
