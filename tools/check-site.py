#!/usr/bin/env python3
"""
Static checks for the Intelligentside site. No dependencies beyond the
standard library, so it runs anywhere Python 3 runs.

    python tools/check-site.py

Covers the mechanical half of the pre-release checklist in SOP-WEB-001
section 9.1: broken links, missing assets, heading order, duplicate IDs,
missing alt text, metadata completeness, and inline styles that would break
the Content Security Policy.

Exit code 0 means every check passed. Exit code 1 means at least one error.
"""

import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKIP_SCHEMES = ("http:", "https:", "mailto:", "tel:", "data:", "javascript:")

errors = []
warnings = []


def err(page, msg):
    errors.append(f"{page}: {msg}")


def warn(page, msg):
    warnings.append(f"{page}: {msg}")


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []          # (attr_name, value)
        self.headings = []       # (level, text)
        self.ids = []
        self.images = []         # (src, alt_or_None)
        self.metas = {}
        self.title = None
        self.lang = None
        self.inline_styles = 0
        self.labels = []         # for attribute values
        self.form_controls = []  # (tag, id, labelled)
        self._in_title = False
        self._in_heading = None
        self._label_depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)

        if tag == "html":
            self.lang = a.get("lang")

        if "id" in a:
            self.ids.append(a["id"])

        if "style" in a:
            self.inline_styles += 1

        for attr in ("href", "src"):
            if attr in a and a[attr]:
                self.links.append((tag, a[attr]))

        if tag == "img":
            self.images.append((a.get("src", ""), a.get("alt")))

        if tag == "title":
            self._in_title = True

        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self._in_heading = int(tag[1])
            self.headings.append([self._in_heading, ""])

        if tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.metas[key] = a.get("content", "")

        if tag == "label":
            self._label_depth += 1
            if "for" in a:
                self.labels.append(a["for"])

        if tag in ("input", "select", "textarea"):
            if a.get("type") not in ("submit", "hidden", "button"):
                # A control wrapped by a <label> is labelled implicitly, which is
                # every bit as valid as a for/id pair.
                named = bool(a.get("aria-label") or a.get("aria-labelledby")) \
                    or self._label_depth > 0
                self.form_controls.append((tag, a.get("id"), named))

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        if tag == "label":
            self._label_depth = max(0, self._label_depth - 1)
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self._in_heading = None

    def handle_data(self, data):
        if self._in_title:
            self.title = (self.title or "") + data.strip()
        if self._in_heading and self.headings:
            self.headings[-1][1] += data


def resolve(page_path, target):
    """Map an href or src to a path on disk. Returns None when not local."""
    if target.startswith(SKIP_SCHEMES) or target.startswith("#") or target.startswith("//"):
        return None

    clean = unquote(urlparse(target).path)
    if not clean:
        return None

    if clean.startswith("/"):
        base = os.path.join(ROOT, clean.lstrip("/"))
    else:
        base = os.path.join(os.path.dirname(page_path), clean)

    base = os.path.normpath(base)
    if os.path.isdir(base):
        base = os.path.join(base, "index.html")
    return base


def check(path):
    rel = os.path.relpath(path, ROOT).replace("\\", "/")

    with open(path, encoding="utf-8") as fh:
        raw = fh.read()

    page = Page()
    page.feed(raw)

    # --- links and assets ---
    for tag, target in page.links:
        dest = resolve(path, target)
        if dest is None:
            continue
        if not os.path.exists(dest):
            err(rel, f"<{tag}> points at a missing file: {target}")

    # --- fragments ---
    for tag, target in page.links:
        if target.startswith("#") and len(target) > 1:
            if target[1:] not in page.ids:
                err(rel, f"link to #{target[1:]} but no element carries that id")

    # --- duplicate ids ---
    seen = set()
    for one in page.ids:
        if one in seen:
            err(rel, f"duplicate id: {one}")
        seen.add(one)

    # --- headings ---
    h1s = [h for h in page.headings if h[0] == 1]
    if len(h1s) != 1:
        err(rel, f"expected exactly one h1, found {len(h1s)}")

    level = 0
    for lvl, text in page.headings:
        if level and lvl > level + 1:
            warn(rel, f"heading jumps from h{level} to h{lvl} at '{text.strip()[:40]}'")
        level = lvl

    # --- metadata ---
    if not page.lang:
        err(rel, "no lang attribute on <html>")
    if not page.title:
        err(rel, "no <title>")
    elif len(page.title) > 65:
        warn(rel, f"title is {len(page.title)} characters, over the 65 guide")

    desc = page.metas.get("description", "")
    if not desc:
        err(rel, "no meta description")
    elif not (50 <= len(desc) <= 165):
        warn(rel, f"meta description is {len(desc)} characters, outside 50 to 165")

    # A 404 page carries no canonical on purpose: it has no single true URL.
    if rel != "404.html" and 'rel="canonical"' not in raw:
        err(rel, "no canonical link")

    if "Content-Security-Policy" not in raw:
        err(rel, "no Content Security Policy")

    if rel != "404.html" and "og:title" not in page.metas:
        warn(rel, "no Open Graph title")

    # --- accessibility ---
    if page.inline_styles:
        err(rel, f"{page.inline_styles} inline style attribute(s), blocked by the CSP")

    for src, alt in page.images:
        if alt is None:
            err(rel, f"<img> with no alt attribute: {src}")

    for tag, cid, named in page.form_controls:
        if named:
            continue
        if not cid:
            err(rel, f"<{tag}> has no id and no aria-label, so no label can attach")
        elif cid not in page.labels:
            err(rel, f"<{tag} id={cid}> has no matching <label for>")

    # --- phone number consistency ---
    for bad in re.findall(r'href="tel:([^"]+)"', raw):
        if bad != "+447848174335":
            err(rel, f"phone link uses {bad}, expected +447848174335")

    return rel


def main():
    pages = []
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in (".git", ".github", "tools")]
        for name in files:
            if name.endswith(".html"):
                pages.append(os.path.join(base, name))

    pages.sort()
    for path in pages:
        check(path)

    print(f"Checked {len(pages)} pages.\n")

    for line in warnings:
        print(f"  WARN   {line}")
    for line in errors:
        print(f"  ERROR  {line}")

    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
