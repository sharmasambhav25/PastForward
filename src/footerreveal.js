/* PastForward — footer reveal
   A grid of record-sleeve credits that lights up under the cursor and fades behind it.
   Usage: <footer data-footer-reveal> <div class="rv-content">…</div> </footer>, then PFFooterReveal(el)
   Colours/fonts are read from the host's CSS variables (all optional):
   --rv-accent (#C0353F)  --rv-fill (#8E1F2B)  --rv-cream (#F3EFE8)  --rv-ink (#060506)  --mono
*/
(function () {
  'use strict';

  // Sleeve / label vocabulary only. No figures, no claims.
  var TOKENS = [
    'SIDE A', 'SIDE B', '33⅓ RPM', '45 RPM', '12" LP', '7" SINGLE', 'STEREO', 'MONO',
    'TRACK 01', 'TRACK 02', 'TRACK 03', 'B-SIDE', 'LEAD-IN', 'RUN-OUT', 'GROOVE', 'NEEDLE DROP',
    'FIRST PRESS', 'RE-PRESS', 'EST. 2025', 'PAST ▸ FORWARD', 'LINER NOTES', 'FROM MEMORY',
    'FOR NOW', 'PLAY LOUD', '◂◂ REWIND', 'SKIP ▸▸', 'REPEAT ↻', 'SOUND OFF',
    'VINYL', 'POSTER', 'POLAROID', 'CUSTOM PRESS', 'WALL DECOR', 'ECHO', 'REPLAY', 'CUE',
    'FADE OUT', 'HI-FI', 'DEEP CUT', 'ENCORE', 'HIDDEN TRACK', 'MIXTAPE', 'AIRPLAY', 'ON REPEAT'
  ];

  function hash(a, b) {
    var h = (Math.imul(a + 1, 374761393) + Math.imul(b + 1, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function rgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function FooterReveal(el, opts) {
    var o = Object.assign({ cellW: 176, cellH: 48, radius: 3.1, life: 1100, fontSize: 10.5 }, opts || {});
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var coarse = window.matchMedia('(pointer: coarse)').matches;

    var cv = document.createElement('canvas');
    cv.className = 'rv-canvas';
    cv.setAttribute('aria-hidden', 'true');
    el.insertBefore(cv, el.firstChild);
    var ctx = cv.getContext('2d');

    var W = 0, H = 0, cols = 0, rows = 0, cw = 0, ch = 0, dpr = 1;
    var I, T, V;                  // intensity, birth time, variant per cell
    var sel = -1, selT = 0;       // selected cell + when the pointer last touched it
    var raf = 0, last = 0, visible = true, hasPointer = false;
    var col = {};

    function readTheme() {
      var s = getComputedStyle(el);
      var g = function (n, d) { return s.getPropertyValue(n).trim() || d; };
      col.accent = g('--rv-accent', '#C0353F');
      col.fill = g('--rv-fill', '#8E1F2B');
      col.cream = g('--rv-cream', '#F3EFE8');
      col.ink = g('--rv-ink', '#060506');
      col.font = g('--mono', '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace');
    }

    function layout() {
      var r = el.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var targetW = W < 640 ? o.cellW * 0.74 : o.cellW;
      cols = Math.max(2, Math.round(W / targetW));
      rows = Math.max(2, Math.round(H / o.cellH));
      cw = W / cols; ch = H / rows;            // grid fits edge to edge
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      el.style.setProperty('--rv-cw', cw + 'px');
      el.style.setProperty('--rv-ch', ch + 'px');
      I = new Float32Array(cols * rows);
      T = new Float64Array(cols * rows);
      V = new Uint16Array(cols * rows);
      sel = -1;
      if (reduce) staticFrame(); else draw(performance.now());
    }

    // Light cells around (x, y) in element-local px.
    function touch(x, y, now) {
      if (!I) return;
      var c0 = Math.floor(x / cw), r0 = Math.floor(y / ch);
      var span = Math.ceil(o.radius) + 1;
      for (var dr = -span; dr <= span; dr++) {
        for (var dc = -span; dc <= span; dc++) {
          var c = c0 + dc, r = r0 + dr;
          if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
          var d = Math.hypot(((c + 0.5) * cw - x) / cw, ((r + 0.5) * ch - y) / ch);
          if (d >= o.radius) continue;
          var v = Math.pow(1 - d / o.radius, 1.6);
          var i = r * cols + c;
          if (I[i] < 0.02) { T[i] = now; V[i] = (V[i] + 1) % 997; }   // new token each time a cell re-lights
          if (v > I[i]) I[i] = v;
        }
      }
      if (c0 >= 0 && r0 >= 0 && c0 < cols && r0 < rows) {
        var s = r0 * cols + c0;
        if (s !== sel) { if (I[s] < 0.02) { T[s] = now; V[s] = (V[s] + 1) % 997; } sel = s; }
        I[s] = 1; selT = now;
      }
      kick();
    }

    function tokenFor(i) {
      var c = i % cols, r = (i / cols) | 0;
      return TOKENS[(hash(c, r) + V[i] * 7) % TOKENS.length];
    }

    function drawCell(i, now, typed) {
      var a = I[i];
      var c = i % cols, r = (i / cols) | 0;
      var x = c * cw, y = r * ch;
      var isSel = i === sel && a > 0.3;
      var pad = 12;

      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(col.accent, 0.12 + 0.5 * a);
      ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);

      if (isSel) {
        ctx.fillStyle = rgba(col.fill, 0.88 * a);
        ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
        ctx.strokeStyle = rgba(col.accent, a);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
        ctx.fillStyle = rgba(col.cream, a);              // fill handle, like a selected cell
        ctx.fillRect(x + cw - 6, y + ch - 6, 6, 6);
      }

      var tok = tokenFor(i);
      var n = typed ? tok.length : Math.min(tok.length, Math.floor((now - T[i]) / 22) + 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 2, y + 2, cw - 4, ch - 4); ctx.clip();
      ctx.fillStyle = isSel ? rgba(col.cream, Math.min(1, a * 1.2)) : rgba(col.accent, 0.2 + 0.8 * a);
      ctx.fillText(tok.slice(0, n), x + pad, y + ch / 2 + 0.5);
      ctx.restore();
    }

    function setFont() {
      ctx.font = '500 ' + o.fontSize + 'px ' + col.font;
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1.3px';
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      if (!I) return 0;
      setFont();
      var live = 0;
      for (var i = 0; i < I.length; i++) {
        if (I[i] > 0.015) { drawCell(i, now, false); live++; }
      }
      return live;
    }

    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (coarse && visible && !hasPointer) wander(now);
      // the selected cell holds while the pointer is moving, then lets go
      if (sel >= 0 && now - selT < 650) I[sel] = 1;
      var k = dt / o.life;
      for (var i = 0; i < I.length; i++) if (I[i] > 0) I[i] = Math.max(0, I[i] - k);
      var live = draw(now);
      var again = live || (coarse && visible && !hasPointer);
      if (again && !raf) raf = requestAnimationFrame(frame);   // touch() may already have queued one
      else if (!again) last = 0;
    }

    function kick() { if (!raf && !reduce && visible) raf = requestAnimationFrame(frame); }

    // Touch screens have no hover, so a slow virtual cursor drifts across the grid.
    function wander(now) {
      var t = now / 1000;
      touch(W * (0.5 + 0.4 * Math.sin(t * 0.37)), H * (0.5 + 0.36 * Math.sin(t * 0.53 + 1.2)), now);
    }

    // Reduced motion: no tracking, no animation. A few cells simply sit lit.
    function staticFrame() {
      I.fill(0);
      var picks = [[6, 3], [5, 5], [7, 4], [2, 7], [4, 8], [6, 8], [1, 9]];   // lower right and bottom, clear of nav and headline
      picks.forEach(function (p, k) {
        var c = Math.min(cols - 1, p[0]), r = Math.min(rows - 1, p[1]);
        I[r * cols + c] = k === 0 ? 1 : 0.35 + 0.08 * k;
        if (k === 0) sel = r * cols + c;
      });
      ctx.clearRect(0, 0, W, H); setFont();
      for (var i = 0; i < I.length; i++) if (I[i] > 0) drawCell(i, 0, true);
    }

    function onMove(e) {
      if (reduce || e.pointerType === 'touch') return;
      hasPointer = true;
      var r = el.getBoundingClientRect();
      touch(e.clientX - r.left, e.clientY - r.top, performance.now());
    }
    function onLeave() { selT = 0; }

    readTheme();
    layout();
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { readTheme(); layout(); }) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', layout);

    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) kick();
    }) : null;
    if (io) io.observe(el);

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { readTheme(); if (reduce) layout(); });
    if (coarse && !reduce) kick();

    return {
      destroy: function () {
        cancelAnimationFrame(raf);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
        if (ro) ro.disconnect(); if (io) io.disconnect();
        cv.remove();
      }
    };
  }

  // Started from pfStart() once the footer exists (see boot.js).
  window.PFFooterReveal = FooterReveal;
})();
