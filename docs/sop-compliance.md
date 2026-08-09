# SOP-WEB-001 compliance record

How this build meets the standard set in the website SOP, clause by clause.
Anything not yet met is stated plainly rather than glossed.

Build date: 9 August 2026. Checked with `python tools/check-site.py`, which
reported 0 errors and 0 warnings across 9 pages.

---

## Section 5. Approved positioning and claims

| Clause | Status | Where |
|---|---|---|
| 5.1 Approved statements used | Met | Home hero, About, footer blurb. Wording stays inside the three approved statements |
| 5.2 No client names, logos, testimonials, case studies | Met | None anywhere. `about/` states this openly as a positioning point |
| 5.2 No customer counts or years in business | Met | None published |
| 5.2 No uptime, response time or performance benchmarks | Met | The only figures on the site come from the browser-side model, labelled as such on the page and in `terms/` section 3 |
| 5.2 No certifications, accreditations or awards | Met | None published |
| 5.2 No pricing or trial claims | Met | None published |
| 5.2 No competitor comparisons | Met | None published |
| 5.3 Tone: plain English, short sentences, second person | Met | Throughout |
| 5.3 First screen answers what, who, what next | Met | Home hero: statement, audience, two calls to action |

**Note on the model.** The interactive scheduler generates its own demand in the
browser. Utilisation, finish time and solve time describe that computation only.
This is stated under the model, in the terms of use, and in the source comments.

**Note on the call flow.** `/how-it-works/` runs a scripted walk through the
call handling sequence. Its clock is written into the script rather than
measured, the caller number sits inside the range Ofcom reserves for fiction,
and the page says both. No timing on that page should be read as a service
level, and no claim is made that any organisation is live on it.

**Positioning conflict, open.** The call flow describes an assistant that
answers calls and books appointments. The rest of the site describes
constraint based workforce scheduling: rotas, travel time, kit, bay capacity.
These are two different products and the copy has not yet been reconciled. Until
it is, a visitor arriving on the home page and a visitor arriving on the call
flow page will form different ideas of what the business sells. This is the
largest open item on the site.

---

## Section 6. Site structure

| Clause | Status | Note |
|---|---|---|
| Eight phase one pages | Met, plus one | All eight built at the paths named in the SOP. A ninth, `/how-it-works/`, was added later and is **not** in the SOP page list, so section 6.1 needs amending at the next review |
| Maximum two clicks to any page | Met | Every page is in the header or footer, so one click from anywhere |
| Phone and contact link in header and footer of every page | Met | Header call button plus footer contact column |
| One primary call to action per page | Met | Each page ends on a single call band |
| Unique title tag and meta description per page | Met | Enforced by `tools/check-site.py` |

Phase two items (insights, downloadable guide, booking calendar, careers) are
not built, per the SOP instruction to wait 30 days after launch.

---

## Section 7. Contact details standard

| Clause | Status |
|---|---|
| Phone shown as +44 7848 174335 | Met, identical on every page |
| Phone linked as `tel:+447848174335` | Met. The checker fails the build if any link drifts |
| Tappable link, never plain text or an image | Met, header, footer and call bands |
| Email | Met, `me@hashaamshahid.com`, in the footer, on `contact/`, and in the form fallback |
| Registered address, registration number, business hours | **Not met.** Still unconfirmed. See README |

---

## Section 8. Technical standards

### 8.1 Performance

| Clause | Status |
|---|---|
| Page weight under 2 MB | Met by a wide margin. Largest page is 19 KB of HTML; CSS and JS together are about 60 KB uncompressed; the heaviest image is the 1200x630 social card, which no page loads inline |
| Images compressed, modern format, dimensions set | Partly met. All page graphics are inline SVG, which needs no compression and causes no layout shift. No raster image loads on any page |
| Layout shift under 0.1 | Met by construction. No web fonts, no late-loading images, and the scheduler renders inside a fixed height board |
| Visible copy within 2.5 s on mid-range mobile over 4G | Expected to pass comfortably: no third party requests, no render-blocking font, four small same-origin files. **Confirm with a field test after launch** |

### 8.2 Compatibility

| Clause | Status |
|---|---|
| Chrome, Safari, Edge, Firefox | Expected. Only widely supported features are used. `color-mix` and `backdrop-filter` degrade to a solid panel where absent |
| Phone, tablet, desktop | Met. Verified with no horizontal page overflow at 375 px. The one wide element, the schedule board, scrolls inside its own container |
| Every function usable by keyboard alone | Met. Tabs support arrow keys, Home and End; the menu closes on Escape and returns focus; all controls are native elements |

### 8.3 Accessibility

| Clause | Status |
|---|---|
| WCAG 2.2 AA target | Met on the points testable without a screen reader run |
| Text contrast at least 4.5:1 | Met. Measured on rendered pages with backgrounds composited: minimum 6.68 in dark, 5.82 in light. Even over the brightest block the canvas draws, muted text measures 5.59 |
| Every image carries alt text | Met. Decorative SVG is `aria-hidden` with `focusable="false"` |
| Form fields carry visible labels | Met. Every control has a visible `<label>`, and the switches use label wrapping |
| Additional | Skip link, one `h1` per page, no heading level skips, visible focus rings, `prefers-reduced-motion` honoured, and a text equivalent of the schedule board for screen readers |

**Still to do:** a screen reader pass (NVDA or VoiceOver) before launch. Nothing
found so far suggests a problem, but automated checks cannot replace it.

### 8.4 Security

| Clause | Status |
|---|---|
| HTTPS enforced | Pending host setup. Every page sends `upgrade-insecure-requests`; tick Enforce HTTPS in GitHub Pages once the certificate issues |
| Spam protection that does not block real visitors | Met. A hidden honeypot field plus a 1.2 second floor on time with the page. No CAPTCHA, no puzzle, nothing for a visitor to solve |
| Dependencies patched within 14 days | Met. Nothing from `node_modules` is served: the pages ship no bundled or vendored third party code, so there is no runtime supply chain to patch. One npm entry, `@vercel/analytics`, is recorded in `package.json` as the reference for the measurement behaviour and should be kept current with `npm outdated` at the monthly maintenance point |
| Two-factor on admin logins | Owner action, outside the codebase |
| Additional | A strict `Content-Security-Policy` on every page: no inline script, no inline style, no third party origin |

### 8.5 Search visibility

| Clause | Status |
|---|---|
| Valid `sitemap.xml` and `robots.txt` | Met. The sitemap lists the six indexable pages |
| Canonical URL per page | Met, except `404.html`, which correctly has none |
| Structured data for business type, phone, address | Partly met. Organization JSON-LD on the home page carries name, URL, logo, email and phone. Address is omitted because it is unconfirmed: a fabricated one would be worse than none |
| No page indexed while it holds placeholder wording | Met. `privacy/` and `terms/` are `noindex, follow` until their bracketed details get filled in |

### 8.6 Measurement

| Clause | Status |
|---|---|
| One analytics tool, loading only after consent | Met. Vercel Web Analytics, and nothing else. Verified in the browser: no measurement script exists in the document before a visitor accepts; declining leaves none and records the refusal; accepting injects it; a returning visitor who accepted gets it on load without being asked twice |
| Goal tracking for form submission, phone tap, email tap | **Not met.** Page views only. Custom events on Vercel Web Analytics need a paid plan, so this waits on that decision |

**Hosting dependency worth recording.** The script is served by Vercel's edge at
`/_vercel/insights/script.js`. On GitHub Pages, where the site is published
today, that path returns 404 and no measurement happens. The loader handles the
failure quietly, though the browser still logs the failed request. Measurement
starts working the moment hosting moves to Vercel, with no code change.
Setting `analyticsId` to `''` in `config.js` removes the notice and the request
entirely in the meantime.

**Why the consent notice stays.** Vercel publishes Web Analytics as a cookieless
product, which arguably places it outside the storage rules that make a banner
compulsory. The notice stays anyway, because the cookie notice published to
visitors promises that nothing loads before they choose. Keeping a published
promise is worth more than the small friction of asking.

**Verification still owed:** confirm Vercel's current published position on what
Web Analytics collects and how long it retains it, then fill the retention
placeholder in `privacy/index.html` and add a link to the provider's own notice
from `cookies/index.html`.

---

## Section 9. Build and publish workflow

- Step 5, the pre-release checklist, is automated in `tools/check-site.py` for
  everything a machine can judge: links, assets, IDs, headings, alt text, labels,
  metadata, inline styles, and phone link consistency.
- Steps needing a person: claim check against section 5, review on staging,
  written approval, backup, and the change log entry.
- Rollback is `git revert` plus a redeploy. Every published state is a commit.

---

## Section 13. Access control

Outside the codebase. One point matters here: nothing secret lives in this
repository. `config.js` holds only public values. The measurement setting is the
word `vercel`, which is a provider selector and not a key: Vercel Web Analytics
carries no token, because it identifies the project by the deployment serving it.
No form endpoint is committed either. Treat every file here as public, because
it is.

---

## Open items carried from SOP-WEB-001 section 16

1. Registered company name, number and address
2. Governing jurisdiction for the terms
3. Business hours and time zone, needed before any response promise gets published
4. Retention period for enquiry correspondence
5. Target sectors, to confirm the four on `who-we-serve/` match the real market
6. Whether the offer is a product, a build service, or both. This one shapes the
   home page more than any other open item
7. Launch date
8. Retention period for page view measurement, to confirm from the provider
9. Whether hosting moves to Vercel, which decides whether measurement works at all

Items 1, 2, 4 and 8 block indexing of the two legal pages. The rest do not block
launch, but each one currently costs sharpness in the copy.
