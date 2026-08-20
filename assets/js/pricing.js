/* ---------------------------------------------------------------------------
   Pricing switcher.

   Prices sit here as one table so a change happens in a single place. They are
   local price points set per market, not conversions of a base rate, which is
   why the numbers do not line up against any exchange rate. The yearly figure
   is always ten times the monthly one, so a year costs ten months.

   The tier names, the wording and the included lines all live in the markup,
   so the page reads correctly with scripting switched off. Only the numbers
   and the billing label change here.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';

  var MONEY = {
    GBP: { sym: '\u00A3', gap: false, label: 'GBP' },
    USD: { sym: '$',      gap: false, label: 'USD' },
    EUR: { sym: '\u20AC', gap: false, label: 'EUR' },
    AED: { sym: 'AED',    gap: true,  label: 'AED' },
    AUD: { sym: 'A$',     gap: false, label: 'AUD' },
    CAD: { sym: 'C$',     gap: false, label: 'CAD' }
  };

  /* Monthly retainer per tier, per market. */
  var MONTHLY = {
    answer: { GBP:  499, USD:  649, EUR:  579, AED:  2400, AUD:  999, CAD:  899 },
    grow:   { GBP: 1199, USD: 1549, EUR: 1399, AED:  5700, AUD: 2399, CAD: 2149 },
    scale:  { GBP: 2499, USD: 3199, EUR: 2899, AED: 11800, AUD: 4999, CAD: 4499 }
  };

  var MONTHS_PER_YEAR_BILLED = 10;

  /* Locale is a hint about which market somebody sits in, never a decision.
     Any guess made here is one click away from being changed. */
  var LOCALE_HINT = {
    US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'AUD',
    AE: 'AED', SA: 'AED', QA: 'AED', KW: 'AED', BH: 'AED', OM: 'AED',
    IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
    PT: 'EUR', BE: 'EUR', AT: 'EUR', GR: 'EUR', FI: 'EUR'
  };

  function guessMarket() {
    try {
      var tag = (navigator.language || '').toUpperCase();
      var bits = tag.split('-');
      var region = bits.length > 1 ? bits[bits.length - 1] : '';
      if (LOCALE_HINT[region]) return LOCALE_HINT[region];
    } catch (e) { /* ignore */ }
    return 'GBP';
  }

  function remember(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function recall(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function group(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function setup(root) {
    var state = {
      money: recall('is-currency') || guessMarket(),
      yearly: recall('is-billing') === 'yearly'
    };
    if (!MONEY[state.money]) state.money = 'GBP';

    var status = root.querySelector('[data-price-status]');

    function paint() {
      var unit = MONEY[state.money];

      root.querySelectorAll('[data-tier]').forEach(function (card) {
        var key = card.getAttribute('data-tier');
        var base = MONTHLY[key];
        if (!base) return;

        var amount = base[state.money];
        if (state.yearly) amount = amount * MONTHS_PER_YEAR_BILLED;

        var sym = card.querySelector('[data-sym]');
        var num = card.querySelector('[data-num]');
        var per = card.querySelector('[data-per]');
        var note = card.querySelector('[data-note]');

        if (sym) sym.textContent = unit.sym + (unit.gap ? '\u00A0' : '');
        if (num) num.textContent = group(amount);
        if (per) per.textContent = state.yearly ? 'per year' : 'per month';
        if (note) {
          note.textContent = state.yearly
            ? 'Billed yearly. Ten months paid, twelve months served.'
            : 'Billed monthly. Stop with 30 days notice.';
        }
      });

      root.querySelectorAll('[data-money]').forEach(function (button) {
        var on = button.getAttribute('data-money') === state.money;
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      root.querySelectorAll('[data-billing]').forEach(function (button) {
        var on = (button.getAttribute('data-billing') === 'yearly') === state.yearly;
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      if (status) {
        status.textContent = 'Prices showing in ' + unit.label + ', billed ' +
          (state.yearly ? 'yearly' : 'monthly') + '.';
      }
    }

    root.querySelectorAll('[data-money]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.money = button.getAttribute('data-money');
        remember('is-currency', state.money);
        paint();
      });
    });

    root.querySelectorAll('[data-billing]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.yearly = button.getAttribute('data-billing') === 'yearly';
        remember('is-billing', state.yearly ? 'yearly' : 'monthly');
        paint();
      });
    });

    paint();
  }

  function boot() {
    document.querySelectorAll('[data-pricing]').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
