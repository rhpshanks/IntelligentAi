/* ---------------------------------------------------------------------------
   Interactive appointment diary.

   The assistant books into a diary with real limits, and this models that
   diary. It places booking requests across the people taking appointments,
   respecting linked visits (a follow-up cannot precede the first appointment),
   earliest availability and the length of the working day, then reports how
   full the diary ended up and when it finishes.

   Every figure it shows is computed live in the visitor's browser. No claim
   about real client bookings is made or implied anywhere in this module.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';

  var SLOT_MINUTES = 30;
  var DAY_START = 9 * 60;

  var LABELS = [
    'New client', 'Follow-up', 'Consultation', 'Check-up', 'Fitting',
    'Assessment', 'Treatment', 'Repair', 'Service', 'Callout',
    'Inspection', 'Valuation', 'Deep clean', 'Scan', 'Test',
    'Quote visit', 'Diagnostic', 'Handover', 'Review visit', 'Trim',
    'Colour', 'Second opinion'
  ];

  var TEAMS = ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5', 'Room 6'];

  function clockOf(slot) {
    var mins = DAY_START + slot * SLOT_MINUTES;
    var hh = Math.floor(mins / 60);
    var mm = mins % 60;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  /* Deterministic pseudo random so a given seed replays the same demand. */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildDemand(count, seed, withOrder) {
    var rand = rng(seed);
    var pool = LABELS.slice();
    var jobs = [];

    for (var i = 0; i < count; i++) {
      var pick = Math.floor(rand() * pool.length);
      var label = pool.length ? pool.splice(pick, 1)[0] : 'Task ' + (i + 1);
      var priority = rand() < 0.22 ? 3 : rand() < 0.55 ? 2 : 1;

      jobs.push({
        id: i,
        label: label,
        span: 1 + Math.floor(rand() * 4),
        priority: priority,
        kind: priority === 3 ? 'c' : priority === 2 ? 'b' : 'a',
        release: Math.floor(rand() * 4),
        needs: -1,
        lane: -1,
        start: -1
      });
    }

    if (withOrder) {
      for (var j = 2; j < jobs.length; j++) {
        if (rand() < 0.3) jobs[j].needs = Math.floor(rand() * (j - 1));
      }
    }

    return jobs;
  }

  function solve(jobs, laneCount, horizon, opts) {
    var began = (window.performance && performance.now) ? performance.now() : Date.now();

    var timeline = [];
    var load = [];
    var l, t;
    for (l = 0; l < laneCount; l++) {
      timeline.push(new Uint8Array(horizon));
      load.push(0);
    }

    var pending = jobs.slice();
    var done = {};
    var placed = [];
    var unplaced = [];
    var guard = 0;

    jobs.forEach(function (job) { job.lane = -1; job.start = -1; });

    while (pending.length && guard++ < 500) {
      /* Ready set: everything whose predecessor already finished. */
      var ready = pending.filter(function (job) {
        if (!opts.order || job.needs < 0) return true;
        return Object.prototype.hasOwnProperty.call(done, job.needs);
      });

      if (!ready.length) {
        /* Order rules left nothing runnable, so release the remainder. */
        ready = pending.slice();
      }

      /* Highest priority first, then longest job, a standard list rule. */
      ready.sort(function (a, b) {
        return (b.priority - a.priority) || (b.span - a.span) || (a.id - b.id);
      });

      var job = ready[0];
      pending.splice(pending.indexOf(job), 1);

      var earliest = job.release;
      if (opts.order && job.needs >= 0 && done[job.needs] !== undefined) {
        earliest = Math.max(earliest, done[job.needs]);
      }

      var bestLane = -1;
      var bestStart = -1;

      for (l = 0; l < laneCount; l++) {
        var found = -1;
        for (t = earliest; t + job.span <= horizon; t++) {
          var clear = true;
          for (var k = 0; k < job.span; k++) {
            if (timeline[l][t + k]) { clear = false; t += k; break; }
          }
          if (clear) { found = t; break; }
        }
        if (found < 0) continue;

        if (bestLane < 0) {
          bestLane = l; bestStart = found;
        } else if (found < bestStart) {
          bestLane = l; bestStart = found;
        } else if (found === bestStart && opts.balance && load[l] < load[bestLane]) {
          bestLane = l; bestStart = found;
        }
      }

      if (bestLane < 0) {
        unplaced.push(job);
        continue;
      }

      for (var m = 0; m < job.span; m++) timeline[bestLane][bestStart + m] = 1;
      load[bestLane] += job.span;
      job.lane = bestLane;
      job.start = bestStart;
      done[job.id] = bestStart + job.span;
      placed.push(job);
    }

    var makespan = 0;
    placed.forEach(function (job) { makespan = Math.max(makespan, job.start + job.span); });

    var booked = placed.reduce(function (sum, job) { return sum + job.span; }, 0);
    var capacity = laneCount * (makespan || 1);
    var ended = (window.performance && performance.now) ? performance.now() : Date.now();

    return {
      placed: placed,
      unplaced: unplaced,
      makespan: makespan,
      utilisation: capacity ? Math.round((booked / capacity) * 100) : 0,
      millis: Math.max(ended - began, 0.01),
      laneCount: laneCount,
      horizon: horizon
    };
  }

  function setup(root) {
    var baseSlots = parseInt(root.getAttribute('data-slots'), 10) || 16;
    var state = {
      lanes: parseInt(root.getAttribute('data-lanes'), 10) || 4,
      count: parseInt(root.getAttribute('data-jobs'), 10) || 14,
      order: root.getAttribute('data-order') !== 'false',
      balance: true,
      extend: false,
      seed: Math.floor(Math.random() * 100000)
    };

    /* A browser restores form values across a reload, so the controls, not the
       data attributes, hold the truth once the page has been used. Seeding from
       them keeps the sliders and the board in agreement. */
    root.querySelectorAll('input[data-bind]').forEach(function (input) {
      var key = input.getAttribute('data-bind');
      if (input.type === 'checkbox') {
        state[key] = input.checked;
        return;
      }
      var value = parseInt(input.value, 10);
      if (isNaN(value)) return;
      if (key === 'lanes') state.lanes = value;
      if (key === 'count') state.count = value;
    });

    var board = root.querySelector('[data-board]');
    var status = root.querySelector('[data-status]');
    var alt = root.querySelector('[data-alt]');
    var leftover = root.querySelector('[data-leftover]');
    var stats = {
      placed: root.querySelector('[data-stat="placed"]'),
      finish: root.querySelector('[data-stat="finish"]'),
      used: root.querySelector('[data-stat="used"]'),
      speed: root.querySelector('[data-stat="speed"]')
    };

    var jobs = buildDemand(state.count, state.seed, state.order);
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function paintSlider(input) {
      var min = parseFloat(input.min || 0);
      var max = parseFloat(input.max || 100);
      var pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
      input.style.setProperty('--fill', pct + '%');
      var out = input.parentNode.querySelector('output');
      if (out) out.textContent = input.value;
    }

    function render(result) {
      var horizon = result.horizon;
      var byLane = [];
      var i;
      for (i = 0; i < result.laneCount; i++) byLane.push([]);
      result.placed.forEach(function (job) { byLane[job.lane].push(job); });
      byLane.forEach(function (list) { list.sort(function (a, b) { return a.start - b.start; }); });

      board.textContent = '';
      var inner = document.createElement('div');
      inner.className = 'board-inner';
      inner.style.setProperty('--slots', String(horizon));

      var axis = document.createElement('div');
      axis.className = 'board-axis';
      var corner = document.createElement('span');
      corner.textContent = 'Time';
      axis.appendChild(corner);
      for (i = 0; i < horizon; i++) {
        var tick = document.createElement('span');
        tick.textContent = i % 2 === 0 ? clockOf(i) : '';
        axis.appendChild(tick);
      }
      inner.appendChild(axis);

      var order = 0;
      byLane.forEach(function (list, laneIndex) {
        var row = document.createElement('div');
        row.className = 'board-row';

        var name = document.createElement('span');
        name.className = 'lane-name';
        name.textContent = TEAMS[laneIndex];
        row.appendChild(name);

        var cursor = 0;
        list.forEach(function (job) {
          while (cursor < job.start) {
            row.appendChild(emptySlot());
            cursor++;
          }
          var block = document.createElement('div');
          block.className = 'job';
          block.setAttribute('data-kind', job.kind);
          if (job.start + job.span > baseSlots) block.setAttribute('data-late', 'true');
          block.style.gridColumn = 'span ' + job.span;
          block.style.setProperty('--delay', (reduced ? 0 : order * 45) + 'ms');
          block.textContent = job.span > 1 ? job.label : job.label.slice(0, 3);
          block.title = job.label + ', ' + clockOf(job.start) + ' to ' + clockOf(job.start + job.span);
          row.appendChild(block);
          cursor = job.start + job.span;
          order++;
        });
        while (cursor < horizon) {
          row.appendChild(emptySlot());
          cursor++;
        }
        inner.appendChild(row);
      });

      board.appendChild(inner);

      /* Text equivalent for assistive technology and for anyone with the
         visual board switched off. */
      alt.textContent = '';
      byLane.forEach(function (list, laneIndex) {
        var li = document.createElement('li');
        li.textContent = TEAMS[laneIndex] + ': ' + (list.length
          ? list.map(function (job) {
              return job.label + ' ' + clockOf(job.start) + ' to ' + clockOf(job.start + job.span);
            }).join('; ')
          : 'no jobs assigned');
        alt.appendChild(li);
      });

      var total = result.placed.length + result.unplaced.length;
      stats.placed.textContent = result.placed.length + ' / ' + total;
      stats.finish.textContent = result.makespan ? clockOf(result.makespan) : '--:--';
      stats.used.textContent = result.utilisation + '%';
      stats.speed.textContent = result.millis.toFixed(1);

      if (result.unplaced.length) {
        leftover.hidden = false;
        leftover.textContent = 'Beyond capacity today: ' +
          result.unplaced.map(function (job) { return job.label; }).join(', ') +
          '. The assistant offers these callers the next open day rather than ' +
          'squeezing them in. Add a room or open late slots to take them today.';
      } else {
        leftover.hidden = true;
        leftover.textContent = '';
      }

      status.textContent = 'Diary rebuilt. ' + result.placed.length + ' of ' + total +
        ' bookings placed across ' + result.laneCount + ' rooms. Day ends ' +
        (result.makespan ? clockOf(result.makespan) : 'none') + '. Diary ' +
        result.utilisation + ' percent full. Rebuilt in ' + result.millis.toFixed(1) +
        ' milliseconds.';
    }

    function emptySlot() {
      var cell = document.createElement('div');
      cell.className = 'slot';
      return cell;
    }

    function run() {
      var horizon = baseSlots + (state.extend ? 4 : 0);
      render(solve(jobs, state.lanes, horizon, { order: state.order, balance: state.balance }));
    }

    function reseed() {
      state.seed = Math.floor(Math.random() * 100000);
      jobs = buildDemand(state.count, state.seed, state.order);
      run();
    }

    root.querySelectorAll('input[data-bind]').forEach(function (input) {
      var key = input.getAttribute('data-bind');
      if (input.type === 'range') paintSlider(input);

      input.addEventListener('input', function () {
        if (input.type === 'range') {
          paintSlider(input);
          var value = parseInt(input.value, 10);
          if (key === 'lanes') {
            state.lanes = value;
            run();
          } else if (key === 'count') {
            state.count = value;
            jobs = buildDemand(state.count, state.seed, state.order);
            run();
          }
        } else {
          state[key] = input.checked;
          if (key === 'order') jobs = buildDemand(state.count, state.seed, state.order);
          run();
        }
      });
    });

    root.querySelectorAll('[data-act]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.getAttribute('data-act') === 'shuffle') reseed(); else run();
      });
    });

    run();
  }

  function boot() {
    document.querySelectorAll('[data-scheduler]').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
