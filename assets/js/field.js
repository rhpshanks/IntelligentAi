/* ---------------------------------------------------------------------------
   Background field: schedule blocks drifting along lanes.
   Design rules honoured here:
     - stops entirely when the visitor prefers reduced motion (one static frame)
     - stops when the tab sits in the background
     - device pixel ratio capped at 2 so high density screens stay cheap
     - no allocation inside the animation loop
   --------------------------------------------------------------------------- */
(function () {
  'use strict';

  var canvas = document.getElementById('field');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var blocks = [];
  var w = 0, h = 0, dpr = 1;
  var frame = null;
  var last = 0;

  function readInk() {
    var styles = getComputedStyle(document.documentElement);
    var glow = styles.getPropertyValue('--glow').trim() || '67 229 200';
    return glow.split(/[\s,]+/).slice(0, 3).join(', ');
  }

  var ink = readInk();

  function build() {
    var rect = canvas.getBoundingClientRect();

    /* A tab that loads in the background can report a zero box. Wait for a
       real measurement rather than baking in a one pixel canvas. */
    if (rect.width < 2 || rect.height < 2) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var laneGap = 74;
    var lanes = Math.max(4, Math.round(h / laneGap));
    var perLane = w < 640 ? 2 : w < 1200 ? 3 : 4;

    blocks.length = 0;
    for (var l = 0; l < lanes; l++) {
      var y = (l + 0.5) * (h / lanes);
      for (var i = 0; i < perLane; i++) {
        blocks.push({
          x: Math.random() * (w + 400) - 200,
          y: y + (Math.random() * 12 - 6),
          w: 40 + Math.random() * 150,
          h: 7,
          v: 6 + Math.random() * 20,
          a: 0.05 + Math.random() * 0.13
        });
      }
    }
    return true;
  }

  function rounded(x, y, bw, bh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + bw - r, y);
    ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
    ctx.lineTo(x + bw, y + bh - r);
    ctx.quadraticCurveTo(x + bw, y + bh, x + bw - r, y + bh);
    ctx.lineTo(x + r, y + bh);
    ctx.quadraticCurveTo(x, y + bh, x, y + bh - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  function paint() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      ctx.fillStyle = 'rgba(' + ink + ', ' + b.a.toFixed(3) + ')';
      rounded(b.x, b.y, b.w, b.h, 3);
    }
  }

  function step(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      b.x += b.v * dt;
      if (b.x > w + 220) {
        b.x = -b.w - Math.random() * 260;
        b.v = 6 + Math.random() * 20;
        b.a = 0.05 + Math.random() * 0.13;
      }
    }

    paint();
    frame = window.requestAnimationFrame(step);
  }

  function start() {
    if (frame !== null || !blocks.length) return;
    if (motionQuery.matches) { paint(); return; }
    last = window.performance.now();
    frame = window.requestAnimationFrame(step);
  }

  function stop() {
    if (frame === null) return;
    window.cancelAnimationFrame(frame);
    frame = null;
  }

  var resizeTimer = null;
  function rebuild(delay) {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      stop();
      if (build()) start();
    }, delay);
  }

  if (build()) start();

  /* ResizeObserver covers the case the window resize event misses: a box that
     only gains its true size after the first frame, such as a background tab. */
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { rebuild(140); }).observe(canvas);
  } else {
    window.addEventListener('resize', function () { rebuild(180); }, { passive: true });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stop(); } else { last = window.performance.now(); start(); }
  });

  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', function () { stop(); start(); });
  }

  /* The theme toggle swaps the accent, so the field re-reads it. */
  document.addEventListener('is:themechange', function () {
    ink = readInk();
    paint();
  });
})();
