/* ---------------------------------------------------------------------------
   Site behaviour: navigation, theme, reveals, tabs, contact form, consent.

   Each unit runs inside safe(), so a failure in one leaves every other unit
   working and never leaves copy hidden. Nothing here is needed to read the
   site: with scripting off the pages stay complete.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';

  var CFG = window.IS_CONFIG || {};
  var loadedAt = Date.now();

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  }

  function safe(name, fn) {
    try {
      fn();
    } catch (err) {
      if (window.console && console.warn) console.warn('[site] ' + name + ' stopped:', err);
    }
  }

  /* --- Sticky header state ---------------------------------------------- */
  safe('header', function () {
    var bar = $('.site-header');
    if (!bar) return;

    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.className = 'header-sentinel';
    document.body.insertBefore(sentinel, document.body.firstChild);

    if (!('IntersectionObserver' in window)) { bar.setAttribute('data-stuck', 'true'); return; }

    new IntersectionObserver(function (entries) {
      bar.setAttribute('data-stuck', entries[0].isIntersecting ? 'false' : 'true');
    }, { rootMargin: '0px' }).observe(sentinel);
  });

  /* --- Mobile navigation ------------------------------------------------- */
  safe('nav', function () {
    var toggle = $('[data-nav-toggle]');
    var panel = $('#primary-nav');
    if (!toggle || !panel) return;

    function setOpen(open) {
      panel.setAttribute('data-open', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    setOpen(false);

    toggle.addEventListener('click', function () {
      setOpen(panel.getAttribute('data-open') !== 'true');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.getAttribute('data-open') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (panel.getAttribute('data-open') !== 'true') return;
      if (panel.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setOpen(false);
    }, { passive: true });
  });

  /* --- Theme toggle ------------------------------------------------------ */
  safe('theme', function () {
    var button = $('[data-theme-toggle]');
    if (!button) return;

    function current() {
      var set = document.documentElement.getAttribute('data-theme');
      if (set) return set;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function label(mode) {
      return mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    }

    function apply(next) {
      document.documentElement.setAttribute('data-theme', next);
      try { window.localStorage.setItem('is-theme', next); } catch (e) { /* ignore */ }
      button.setAttribute('aria-label', label(next));
      document.dispatchEvent(new CustomEvent('is:themechange', { detail: { theme: next } }));
    }

    button.setAttribute('aria-label', label(current()));
    button.addEventListener('click', function () {
      apply(current() === 'dark' ? 'light' : 'dark');
    });
  });

  /* --- Reveal on scroll -------------------------------------------------- */
  safe('reveal', function () {
    var items = $$('[data-reveal]');
    if (!items.length) return;

    function showAll() { items.forEach(function (el) { el.classList.add('is-in'); }); }

    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showAll();
      return;
    }

    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        watcher.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el, i) {
      el.style.setProperty('--reveal-delay', ((i % 4) * 70) + 'ms');
      watcher.observe(el);
    });

    /* Last line of defence: whatever happens, the copy shows. */
    window.setTimeout(showAll, 4000);
  });

  /* --- Tabs -------------------------------------------------------------- */
  safe('tabs', function () {
    $$('[data-tabs]').forEach(function (group) {
      var tabs = $$('[role="tab"]', group);
      var panels = tabs.map(function (tab) {
        return document.getElementById(tab.getAttribute('aria-controls'));
      });

      function select(index, moveFocus) {
        tabs.forEach(function (tab, i) {
          var on = i === index;
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
          tab.tabIndex = on ? 0 : -1;
          if (panels[i]) panels[i].hidden = !on;
        });
        if (moveFocus) tabs[index].focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(i, false); });
        tab.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
          if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
          if (e.key === 'Home') next = 0;
          if (e.key === 'End') next = tabs.length - 1;
          if (next === null) return;
          e.preventDefault();
          select(next, true);
        });
      });

      select(0, false);
    });
  });

  /* --- Copy to clipboard ------------------------------------------------- */
  safe('copy', function () {
    $$('[data-copy]').forEach(function (button) {
      var original = button.textContent;

      function done() {
        button.textContent = 'Copied';
        button.setAttribute('data-done', 'true');
        window.setTimeout(function () {
          button.textContent = original;
          button.removeAttribute('data-done');
        }, 1800);
      }

      button.addEventListener('click', function () {
        var value = button.getAttribute('data-copy');

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(done, function () {
            button.textContent = 'Copy blocked';
          });
          return;
        }

        var box = document.createElement('textarea');
        box.value = value;
        document.body.appendChild(box);
        box.select();
        try { document.execCommand('copy'); done(); } catch (e) { button.textContent = 'Copy blocked'; }
        document.body.removeChild(box);
      });
    });
  });

  /* --- Contact form ------------------------------------------------------ */
  safe('form', function () {
    var form = $('[data-form]');
    if (!form) return;

    var status = $('[data-form-status]', form);
    var submit = $('[type="submit"]', form);
    var checked = false;

    /* Native validation gets switched off here rather than in the markup, so a
       visitor with scripting disabled still gets the browser's own checks and
       the mailto action on the form element. */
    form.noValidate = true;

    var RULES = {
      name: function (v) {
        return v.trim().length >= 2 || 'Please give a name of at least two letters.';
      },
      email: function (v) {
        if (!v.trim()) return 'Please give an email address so a reply can reach you.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ||
          'That email address does not look complete.';
      },
      message: function (v) {
        return v.trim().length >= 10 || 'Please add a little detail, at least ten characters.';
      }
    };

    function validateField(input) {
      var rule = RULES[input.name];
      if (!rule) return true;

      var wrapper = input.closest('.form-field');
      var slot = wrapper ? $('.err', wrapper) : null;
      var verdict = rule(input.value);

      if (verdict === true) {
        if (wrapper) wrapper.removeAttribute('data-invalid');
        if (slot) slot.textContent = '';
        input.setAttribute('aria-invalid', 'false');
        return true;
      }

      if (wrapper) wrapper.setAttribute('data-invalid', 'true');
      if (slot) slot.textContent = verdict;
      input.setAttribute('aria-invalid', 'true');
      return false;
    }

    $$('input, textarea', form).forEach(function (input) {
      input.addEventListener('blur', function () { if (checked) validateField(input); });
      input.addEventListener('input', function () { if (checked) validateField(input); });
    });

    function say(message, tone) {
      if (!status) return;
      status.hidden = false;
      status.textContent = message;
      status.setAttribute('data-tone', tone);
    }

    function payload() {
      var data = {};
      $$('input, textarea, select', form).forEach(function (input) {
        if (input.type === 'submit' || input.name === 'website') return;
        if (input.name) data[input.name] = input.value.trim();
      });
      return data;
    }

    function mailFallback(data) {
      var to = CFG.email || 'me@hashaamshahid.com';
      var subject = 'Website enquiry from ' + (data.name || 'a visitor');
      var lines = [
        'Name: ' + (data.name || ''),
        'Email: ' + (data.email || ''),
        'Company: ' + (data.company || 'not given'),
        'Phone: ' + (data.phone || 'not given'),
        'Topic: ' + (data.topic || 'not given'),
        '',
        data.message || ''
      ];

      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));

      say('Your mail app should now hold a pre-filled message. Press send there and it ' +
          'reaches ' + to + '. No mail app on this device? Copy the address and write directly.', 'ok');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      checked = true;

      var fields = $$('input, textarea', form).filter(function (i) { return RULES[i.name]; });
      var bad = fields.filter(function (input) { return !validateField(input); });

      if (bad.length) {
        say('Please check the highlighted lines, then send again.', 'bad');
        bad[0].focus();
        return;
      }

      /* Two quiet spam traps: a field no person sees, and a floor on time
         spent with the page. Neither asks the visitor to prove anything.
         The floor sits low on purpose. Naive bots submit within milliseconds,
         while a person using autofill still needs longer than this, so a real
         enquiry never gets swallowed. */
      var trap = form.elements.website;
      if ((trap && trap.value) || (Date.now() - loadedAt) < 1200) {
        say('Thanks. The message went through.', 'ok');
        form.reset();
        return;
      }

      var data = payload();
      if (!CFG.formEndpoint) { mailFallback(data); return; }

      if (submit) submit.disabled = true;
      say('Sending...', 'ok');

      window.fetch(CFG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('status ' + res.status);
        form.reset();
        say('Thanks, the message landed. It gets read in the order received.', 'ok');
      }).catch(function () {
        say('The message did not send. Please call ' + (CFG.phoneDisplay || '') +
            ' or write to ' + (CFG.email || '') + ' directly.', 'bad');
      }).then(function () {
        if (submit) submit.disabled = false;
      });
    });
  });

  /* --- Consent notice ----------------------------------------------------
     Shown only when a measurement ID exists in config.js. With no ID the site
     sets no non-essential cookie, so no banner is warranted.
     ---------------------------------------------------------------------- */
  safe('consent', function () {
    var bar = $('[data-consent]');
    if (!bar) return;
    if (!CFG.analyticsId) { bar.remove(); return; }

    var KEY = 'is-consent';
    var saved = null;
    try { saved = window.localStorage.getItem(KEY); } catch (e) { /* ignore */ }

    function remember(value) {
      try { window.localStorage.setItem(KEY, value); } catch (e) { /* ignore */ }
    }

    function loadMeasurement() {
      /* Wire the chosen provider to this event. It fires only past consent,
         which keeps the promise made on the cookies page. */
      document.dispatchEvent(new CustomEvent('is:consentgranted', {
        detail: { id: CFG.analyticsId }
      }));
    }

    if (saved === 'yes') { bar.remove(); loadMeasurement(); return; }
    if (saved === 'no') { bar.remove(); return; }

    bar.hidden = false;
    $('[data-consent-yes]', bar).addEventListener('click', function () {
      remember('yes'); bar.remove(); loadMeasurement();
    });
    $('[data-consent-no]', bar).addEventListener('click', function () {
      remember('no'); bar.remove();
    });
  });

  /* --- Year stamp -------------------------------------------------------- */
  safe('year', function () {
    $$('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  });
})();
