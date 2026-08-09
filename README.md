# intelligentside.com

The public website for Intelligentside, built to the standard set in
`SOP-WEB-001`. Static HTML, CSS and JavaScript, served exactly as committed.

There is no build step. Nothing gets compiled, bundled or transpiled, and
`node_modules` never reaches the server. The single npm dependency,
`@vercel/analytics`, is recorded in `package.json` as the reference for the
measurement behaviour described below; the pages themselves load nothing from
it. Serving this repository as plain files is the whole deployment.

---

## Run it locally

Any static file server works. With Python already installed:

```bash
python -m http.server 5173 --directory .
```

Then open `http://localhost:5173`.

---

## Check it before publishing

```bash
python tools/check-site.py
```

This covers the mechanical half of the pre-release checklist in SOP-WEB-001
section 9.1: broken internal links, missing assets, duplicate IDs, heading
order, missing alt text, unlabelled form controls, metadata completeness, and
inline styles that the Content Security Policy would block. Exit code 0 means
everything passed.

Run it after every edit. It takes under a second.

---

## What has to be filled in before launch

These sit in square brackets in the page copy. Search the repository for `[`
to find every one.

| Where | What is missing |
|---|---|
| `privacy/index.html` | Registered company name, registration number, registered address |
| `privacy/index.html` | Retention period for enquiry correspondence (24 months suggested) |
| `privacy/index.html` | Supervisory authority for complaints (the ICO, for a UK controller) |
| `terms/index.html` | Registered company name, registration number, registered address |
| `terms/index.html` | Governing jurisdiction, in two places |

Both of those pages carry `<meta name="robots" content="noindex, follow">` and
a visible pre-launch note, so search engines skip them while the placeholders
remain. **Once the details go in, delete the `robots` meta tag and the
`<p class="todo">` block from each page.** Nothing else needs changing.

Four further items sit in SOP-WEB-001 section 16 and shape the copy rather than
the code: confirmed business hours, the target sectors on `who-we-serve/`,
whether the offer is a product or a build service, and the launch date.

---

## Configuration

Everything adjustable lives in `assets/js/config.js`.

| Key | Effect |
|---|---|
| `formEndpoint` | Empty by default. The contact form then opens a pre-filled message in the visitor's mail app. Paste a POST endpoint (Formspree, Basin, Web3Forms) to switch to background submission. **Also add that host to `connect-src` in the contact page's CSP, or the browser blocks the request.** |
| `email` | Where enquiries land. Currently `me@hashaamshahid.com` |
| `phoneDisplay` / `phoneDial` | Display and dial formats, kept separate on purpose |
| `analyticsId` | Currently `'vercel'`. Any non-empty value switches on the consent notice and fires `is:consentgranted` once a visitor accepts. Set it to `''` to remove the notice and all measurement. See below. |

Changing the phone number or email means editing the HTML too: both appear in
the markup so they work without JavaScript. `tools/check-site.py` fails the
build if a `tel:` link drifts out of step.

---

## Analytics

Vercel Web Analytics, counting page views, held behind the consent notice.

**It only reports data when the site is served from Vercel.** The script lives
at `/_vercel/insights/script.js`, a path Vercel's edge serves. On GitHub Pages,
or any other host, that request returns 404, the loader in
`assets/js/analytics.js` catches it, and nothing else is affected. The browser
still logs the failed request, so expect one console 404 per page load while the
site sits anywhere other than Vercel. Set `analyticsId` to `''` in
`config.js` to silence it until hosting moves.

Two properties are worth preserving if this ever gets changed:

1. **Same origin.** Because the script is served from this domain, the strict
   `Content-Security-Policy` on every page needs no third party host added to it.
   A provider that loads from its own domain would mean widening `script-src`
   and `connect-src` on all nine pages.
2. **Consent first.** `analytics.js` only ever loads on the `is:consentgranted`
   event, which `site.js` fires after a visitor accepts. That ordering is in the
   code rather than in configuration, and the cookie notice makes it a promise
   to visitors. Loading measurement earlier would make that notice untrue.

`assets/js/analytics.js` must stay ahead of `site.js` in the page, because
`site.js` fires the event the moment it runs for a visitor who accepted on an
earlier visit.

### If the provider changes

Three files carry statements that must stay true: `cookies/index.html`,
`privacy/index.html`, and `docs/sop-compliance.md`. Update all three in the same
commit as any change to what loads.

---

## Publishing to GitHub Pages

The repository is ready to serve as-is. Two routes:

**Route A, deploy from a branch.** Repository settings, then Pages, then set
Source to *Deploy from a branch*, branch `main`, folder `/ (root)`. Nothing
else needed: `.nojekyll` is already present so the files get served untouched.

**Route B, deploy with Actions.** Repository settings, then Pages, then set
Source to *GitHub Actions*. The workflow in `.github/workflows/pages.yml` then
runs the site checker on every push and publishes only when it passes.

### Pointing intelligentside.com at it

1. At the domain registrar, create four `A` records for the apex pointing at
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`,
   and a `CNAME` for `www` pointing at `rhpshanks.github.io`.
2. In repository settings, Pages, enter `intelligentside.com` as the custom
   domain. GitHub writes a `CNAME` file into the repository.
3. Wait for the certificate, then tick **Enforce HTTPS**.

No `CNAME` file is committed here on purpose. Adding one before DNS is ready
stops the site loading at the `github.io` address, which makes testing harder.

**Note on paths.** Every page uses relative asset paths, so the site works at a
domain root, at a project subpath, and straight off the file system. The one
exception is `404.html`, which uses root absolute paths because a 404 can be
served from any depth. Its styling only loads when the site sits at a domain
root, which is the intended production setup.

---

## Layout

```
.
├── index.html                  Home, with the live scheduling model
├── scheduling-systems/         Capability detail, second model under load
├── who-we-serve/               Four problem shapes, tabbed
├── about/                      Position, definitions, what is not claimed
├── contact/                    Form, phone, email
├── privacy/  terms/  cookies/  Legal
├── 404.html
├── assets/
│   ├── css/site.css            Whole design system, one file
│   ├── js/theme.js             Runs before paint: theme, and the .js flag
│   ├── js/config.js            The only file to edit for configuration
│   ├── js/analytics.js         Measurement loader, consent gated
│   ├── js/site.js              Nav, theme, reveals, tabs, form, consent
│   ├── js/field.js             Canvas background
│   ├── js/scheduler.js         The interactive scheduling engine
│   └── img/                    Icons and the social card
├── tools/check-site.py         Pre-release checker
├── package.json                Records @vercel/analytics. No build step
└── docs/sop-compliance.md      Line by line against SOP-WEB-001
```

---

## Design decisions worth knowing

- **No third party origins.** No web fonts, no CDN, no embeds, no tag manager.
  A strict `Content-Security-Policy` on every page enforces it rather than
  merely promising it, and it permits no external host. Measurement is the one
  addition, and it loads same origin behind consent, so the policy stays intact.
- **System font stack.** Nothing to download, nothing that blocks the first paint.
- **Graphics are SVG or small PNG.** Total page weight stays far inside the 2 MB
  ceiling in SOP-WEB-001 section 8.1.
- **Scripting is optional.** Copy is never hidden behind JavaScript: the reveal
  animation is gated on a `.js` class added before first paint, and every unit in
  `site.js` runs inside a `safe()` wrapper so one failure cannot blank the page.
  The contact form falls back to a `mailto:` action.
- **Motion respects `prefers-reduced-motion`.** The canvas paints one static
  frame, reveals show immediately, and the schedule places without animating.
- **The demonstration model makes no business claims.** It generates its own
  demand in the browser. Every figure on screen describes that computation and
  nothing else, which is stated on the page and in the terms.
