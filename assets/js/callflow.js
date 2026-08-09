/* ---------------------------------------------------------------------------
   Call flow simulation.

   Walks the path a call takes through the system: answered by the bot, handled
   from the organisation's knowledge base, booked, written to the calendar,
   confirmed to the client, reported to the organisation, then followed up on
   the day and again afterwards.

   The three switches change which branches run, so the diagram greys the parts
   that will not happen before anything is even played.

   Everything here is an illustration of sequence. The clock is scripted, not
   measured, and the number shown belongs to the range reserved for fiction.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';

  var CALLER = '+44 7700 900864';

  /* Each entry is one node in the diagram.
     at:    dt seconds forward, or set to jump the clock
     needs: which switches must be on for this node to run
     lines: log entries, as [tone, text] */
  var SCRIPT = [
    {
      id: 'call', at: { dt: 0 },
      lines: function () {
        return [['in', 'Inbound call from ' + CALLER]];
      }
    },
    {
      id: 'answer', at: { dt: 3 },
      lines: function () {
        return [
          ['out', 'Bot answered on the second ring.'],
          ['note', 'Number not recognised. Treated as a new contact.']
        ];
      }
    },
    {
      id: 'knowledge', at: { dt: 11 },
      lines: function () {
        return [
          ['in', 'Caller: "What do you charge for a callout?"'],
          ['out', 'Answered from the knowledge base, with the Saturday hours.']
        ];
      }
    },
    {
      id: 'ask', at: { dt: 9 }, branch: 'appointment',
      lines: function (s) {
        return s.appointment
          ? [['in', 'Caller: "Can someone come out on Tuesday?"']]
          : [
              ['in', 'Caller had nothing to book.'],
              ['note', 'Call summary written and sent to the organisation.'],
              ['note', 'Flow ends here.']
            ];
      }
    },
    {
      id: 'offer', at: { dt: 6 }, needs: 'appointment',
      lines: function () {
        return [['out', 'Offered Tue 14:00, Tue 16:30, Wed 09:30.']];
      }
    },
    {
      id: 'book', at: { dt: 8 }, needs: 'appointment',
      lines: function () {
        return [
          ['in', 'Caller took Tue 14:00.'],
          ['out', 'Slot held, then read back and confirmed on the call.']
        ];
      }
    },
    {
      id: 'calendar', at: { dt: 2 }, needs: 'appointment',
      lines: function () {
        return [['note', 'Calendar entry created for Tue 14:00, client details attached.']];
      }
    },
    {
      id: 'notify', at: { dt: 2 }, needs: 'appointment', branch: 'whatsapp',
      lines: function (s) {
        return s.whatsapp
          ? [['msg', 'WhatsApp confirmation sent to the client: date, time, address.']]
          : [['msg', 'No WhatsApp number on file. Confirmation sent by SMS instead.']];
      }
    },
    {
      id: 'alert', at: { dt: 1 }, needs: 'appointment orgalert',
      lines: function () {
        return [['msg', 'Organisation messaged: new booking Tue 14:00, with caller details.']];
      }
    },
    {
      id: 'remind', at: { set: [13, 0, 0], rule: 'Appointment day' }, needs: 'appointment',
      lines: function () {
        return [
          ['out', 'Bot called the client to confirm attendance.'],
          ['in', 'Client confirmed. Nothing passed to a person.']
        ];
      }
    },
    {
      id: 'review', at: { set: [16, 30, 0], rule: 'After the appointment' }, needs: 'appointment',
      lines: function (s) {
        return [['msg', 'Review request sent by ' + (s.whatsapp ? 'WhatsApp' : 'SMS') + '.']];
      }
    }
  ];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function count(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
  function clockText(sec) {
    var h = Math.floor(sec / 3600) % 24;
    var m = Math.floor(sec / 60) % 60;
    return pad(h) + ':' + pad(m) + ':' + pad(sec % 60);
  }

  function setup(root) {
    var flow = root.querySelector('[data-flow]');
    var log = root.querySelector('[data-log]');
    var shell = root.querySelector('[data-console]');
    var status = root.querySelector('[data-status]');
    var runBtn = root.querySelector('[data-act="run"]');

    var state = { appointment: true, whatsapp: true, orgalert: true, pace: 2 };
    var cursor = 0;
    var clock = 0;
    var timer = null;
    var playing = false;
    var stats = { steps: 0, calls: 0, messages: 0, booked: null, answered: null };

    function reads(node) {
      return root.querySelector('[data-step="' + node.id + '"]');
    }

    function runs(node) {
      if (!node.needs) return true;
      return node.needs.split(' ').every(function (key) { return state[key]; });
    }

    function plan() { return SCRIPT.filter(runs); }

    function paint() {
      var live = plan();
      SCRIPT.forEach(function (node) {
        var el = reads(node);
        if (!el) return;
        var index = live.indexOf(node);
        var mode;
        if (index < 0) mode = 'skipped';
        else if (index < cursor) mode = 'done';
        else if (index === cursor && playing) mode = 'active';
        else mode = 'idle';
        el.setAttribute('data-state', mode);
        if (mode === 'active') el.setAttribute('aria-current', 'step');
        else el.removeAttribute('aria-current');
      });

      root.querySelectorAll('[data-arm]').forEach(function (arm) {
        arm.setAttribute('data-state', state[arm.getAttribute('data-arm')] ? 'idle' : 'taken');
      });

      var total = live.length;
      set('steps', cursor + ' / ' + total);
      set('calls', String(stats.calls));
      set('messages', String(stats.messages));
      set('booked', stats.booked === null ? '--' : stats.booked + 's');
    }

    function set(key, value) {
      var el = root.querySelector('[data-stat="' + key + '"]');
      if (el) el.textContent = value;
    }

    function line(tone, text, stamp) {
      var li = document.createElement('li');
      li.setAttribute('data-tone', tone);

      if (tone === 'rule') {
        var only = document.createElement('p');
        only.textContent = text;
        li.appendChild(only);
      } else {
        var time = document.createElement('time');
        time.textContent = stamp;
        var body = document.createElement('p');
        body.textContent = text;
        li.appendChild(time);
        li.appendChild(body);
      }

      log.appendChild(li);
      log.scrollTop = log.scrollHeight;
    }

    function advance() {
      var live = plan();
      if (cursor >= live.length) { finish(); return false; }

      var node = live[cursor];

      if (node.at.set) {
        if (node.at.rule) line('rule', node.at.rule);
        clock = node.at.set[0] * 3600 + node.at.set[1] * 60 + node.at.set[2];
      } else {
        clock += node.at.dt;
      }

      node.lines(state).forEach(function (entry) {
        line(entry[0], entry[1], clockText(clock));
        if (entry[0] === 'msg') stats.messages++;
      });

      if (node.id === 'answer') { stats.calls++; stats.answered = clock; }
      if (node.id === 'remind') stats.calls++;
      if (node.id === 'calendar' && stats.answered !== null) stats.booked = clock - stats.answered;

      cursor++;
      stats.steps = cursor;

      var el = reads(node);
      if (status) {
        status.textContent = 'Step ' + cursor + ' of ' + live.length + ': ' +
          (el ? (el.querySelector('h3') || {}).textContent || node.id : node.id);
      }

      paint();
      return cursor < live.length;
    }

    function finish() {
      playing = false;
      window.clearTimeout(timer);
      timer = null;
      shell.setAttribute('data-live', 'false');
      runBtn.textContent = 'Run it again';
      paint();
      if (status) status.textContent = 'Flow complete. ' + count(stats.messages, 'message') +
        ' sent, ' + count(stats.calls, 'call') + ' placed.';
    }

    function tick() {
      var more = advance();
      if (!more) { finish(); return; }
      timer = window.setTimeout(tick, 1250 / state.pace);
    }

    function start() {
      if (cursor >= plan().length) reset();
      playing = true;
      shell.setAttribute('data-live', 'true');
      runBtn.textContent = 'Pause';
      paint();
      tick();
    }

    function pause() {
      playing = false;
      window.clearTimeout(timer);
      timer = null;
      shell.setAttribute('data-live', 'false');
      runBtn.textContent = 'Resume';
      paint();
    }

    function reset() {
      playing = false;
      window.clearTimeout(timer);
      timer = null;
      cursor = 0;
      clock = 9 * 3600 + 14 * 60 + 2;
      stats = { steps: 0, calls: 0, messages: 0, booked: null, answered: null };
      log.textContent = '';
      shell.setAttribute('data-live', 'false');
      runBtn.textContent = 'Run the call';
      if (status) status.textContent = 'Ready.';
      paint();
    }

    runBtn.addEventListener('click', function () {
      if (playing) { pause(); return; }
      start();
    });

    root.querySelector('[data-act="step"]').addEventListener('click', function () {
      if (playing) pause();
      if (cursor >= plan().length) reset();
      playing = true;
      advance();
      playing = false;
      paint();
      if (cursor >= plan().length) finish();
    });

    root.querySelector('[data-act="reset"]').addEventListener('click', reset);

    root.querySelectorAll('input[data-opt]').forEach(function (input) {
      var key = input.getAttribute('data-opt');

      if (input.type === 'range') {
        state.pace = parseInt(input.value, 10) || 2;
        input.style.setProperty('--fill',
          (((state.pace - input.min) / (input.max - input.min)) * 100) + '%');
      } else {
        state[key] = input.checked;
      }

      input.addEventListener('input', function () {
        if (input.type === 'range') {
          state.pace = parseInt(input.value, 10) || 2;
          input.style.setProperty('--fill',
            (((state.pace - input.min) / (input.max - input.min)) * 100) + '%');
          var out = input.parentNode.querySelector('output');
          if (out) out.textContent = input.value + 'x';
          return;
        }
        state[key] = input.checked;
        reset();
      });
    });

    reset();
  }

  function boot() {
    document.querySelectorAll('[data-callflow]').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
