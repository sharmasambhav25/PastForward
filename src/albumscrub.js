/* ============================================================
   PastForward — hero disc "album scrub" (adapted from a reference
   build; classic script, no imports). As the pointer moves across
   the hero disc, it scrubs through real PastForward catalogue
   albums — crossfading each one's actual cover art and real
   artist/album name onto the centre label — then fades back to the
   default PASTFORWARD label when the pointer leaves. The list of
   albums is supplied by the caller (vinyl3d.js) from the site's own
   catalogue data; this module never invents artist or album names.
   ============================================================ */
function mountAlbumScrub(containerEl, labelCanvas, ctx, opts) {
  var albums = opts.albums || [];
  var drawDefault = opts.drawDefaultLabel;
  var onRedraw = opts.onNeedsRedraw || null;
  var FADE_MS = opts.fadeDuration != null ? opts.fadeDuration : 300;

  if (!albums.length) {
    return {
      update: function () { return false; },
      cleanup: function () {}
    };
  }

  var W = labelCanvas.width;
  var H = labelCanvas.height;
  var CX = W / 2;
  var CY = H / 2;
  var R = Math.min(W, H) / 2;

  var imgCache = Object.create(null);

  function loadImage(url) {
    if (!url || imgCache[url]) return;
    var img = new Image();
    var entry = { img: img, ready: false };
    imgCache[url] = entry;
    img.onload = function () {
      entry.ready = true;
      onImageReady(url);
    };
    img.onerror = function () {};
    if (url.slice(0, 5) !== 'data:') img.crossOrigin = 'anonymous';
    img.src = url;
  }

  for (var i = 0; i < albums.length; i++) {
    loadImage(albums[i].imageUrl);
  }

  function makeBuffer() {
    var c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return { cvs: c, ctx: c.getContext('2d') };
  }

  var bufFrom = makeBuffer();
  var bufTo = makeBuffer();

  var activeIdx = -1;
  var fading = false;
  var fadeT0 = 0;
  var hovering = false;
  var destroyed = false;

  function paintDefault(tgt) {
    tgt.save();
    tgt.setTransform(1, 0, 0, 1, 0, 0);
    tgt.globalAlpha = 1;
    tgt.clearRect(0, 0, W, H);
    if (drawDefault) drawDefault(tgt, W, H);
    tgt.restore();
  }

  function paintAlbum(tgt, entry) {
    tgt.save();
    tgt.setTransform(1, 0, 0, 1, 0, 0);
    tgt.globalAlpha = 1;
    tgt.clearRect(0, 0, W, H);

    tgt.beginPath();
    tgt.arc(CX, CY, R, 0, Math.PI * 2);
    tgt.clip();

    var c = imgCache[entry.imageUrl];
    if (c && c.ready) {
      var img = c.img;
      var s = Math.max((2 * R) / img.naturalWidth, (2 * R) / img.naturalHeight);
      var dw = img.naturalWidth * s;
      var dh = img.naturalHeight * s;
      tgt.drawImage(img, CX - dw / 2, CY - dh / 2, dw, dh);
    } else {
      tgt.fillStyle = '#111';
      tgt.fill();
    }

    var g = tgt.createRadialGradient(CX, CY, R * 0.05, CX, CY, R);
    g.addColorStop(0, 'rgba(0,0,0,0.52)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.30)');
    g.addColorStop(1, 'rgba(0,0,0,0.62)');
    tgt.fillStyle = g;
    tgt.beginPath();
    tgt.arc(CX, CY, R, 0, Math.PI * 2);
    tgt.fill();

    tgt.beginPath();
    tgt.arc(CX, CY, R * 0.035, 0, Math.PI * 2);
    tgt.fillStyle = '#000';
    tgt.fill();

    tgt.textAlign = 'center';
    tgt.textBaseline = 'middle';
    var maxTW = R * 1.4;

    var aPx = Math.round(R * 0.14);
    tgt.font = 'small-caps bold ' + aPx + 'px Georgia, "Palatino Linotype", "Book Antiqua", serif';
    tgt.fillStyle = '#ffffff';
    tgt.fillText(entry.artist, CX, CY - R * 0.17, maxTW);

    var ry = CY - R * 0.015;
    var gap = R * 0.06;
    var half = R * 0.28;
    tgt.strokeStyle = 'rgba(255,255,255,0.35)';
    tgt.lineWidth = 1;
    tgt.beginPath();
    tgt.moveTo(CX - half, ry);
    tgt.lineTo(CX - gap, ry);
    tgt.moveTo(CX + gap, ry);
    tgt.lineTo(CX + half, ry);
    tgt.stroke();

    var tPx = Math.round(R * 0.115);
    tgt.font = 'italic ' + tPx + 'px Georgia, "Palatino Linotype", "Book Antiqua", serif';
    tgt.fillStyle = 'rgba(255,255,255,0.88)';
    tgt.fillText(entry.album, CX, CY + R * 0.15, maxTW);

    tgt.restore();
  }

  function paintState(tgt, idx) {
    if (idx < 0) paintDefault(tgt);
    else paintAlbum(tgt, albums[idx]);
  }

  paintDefault(ctx);
  paintDefault(bufFrom.ctx);
  if (onRedraw) onRedraw();

  function beginFade(toIdx) {
    if (toIdx === activeIdx && !fading) return;

    bufFrom.ctx.globalAlpha = 1;
    bufFrom.ctx.clearRect(0, 0, W, H);
    bufFrom.ctx.drawImage(labelCanvas, 0, 0);

    paintState(bufTo.ctx, toIdx);

    activeIdx = toIdx;
    fadeT0 = performance.now();
    fading = true;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function onImageReady(url) {
    if (destroyed || activeIdx < 0) return;
    if (albums[activeIdx].imageUrl !== url) return;

    if (fading) {
      paintState(bufTo.ctx, activeIdx);
    } else {
      paintState(bufFrom.ctx, activeIdx);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bufFrom.cvs, 0, 0);
      ctx.restore();
      if (onRedraw) onRedraw();
    }
  }

  function clientXToIndex(clientX) {
    var rect = containerEl.getBoundingClientRect();
    var norm = (clientX - rect.left) / rect.width;
    norm = Math.max(0, Math.min(1 - 1e-9, norm));
    return Math.floor(norm * albums.length);
  }

  function onEnter(e) {
    if (destroyed) return;
    hovering = true;
    beginFade(clientXToIndex(e.clientX));
  }

  function onMove(e) {
    if (destroyed || !hovering) return;
    var idx = clientXToIndex(e.clientX);
    if (idx !== activeIdx) beginFade(idx);
  }

  function onLeave() {
    if (destroyed) return;
    hovering = false;
    beginFade(-1);
  }

  containerEl.addEventListener('pointerenter', onEnter);
  containerEl.addEventListener('pointermove', onMove);
  containerEl.addEventListener('pointerleave', onLeave);

  function update() {
    if (destroyed || !fading) return false;

    var elapsed = performance.now() - fadeT0;
    var t = Math.min(elapsed / FADE_MS, 1);
    var e = easeInOut(t);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (t >= 1) {
      fading = false;
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bufTo.cvs, 0, 0);

      bufFrom.ctx.clearRect(0, 0, W, H);
      bufFrom.ctx.drawImage(bufTo.cvs, 0, 0);
    } else {
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 1 - e;
      ctx.drawImage(bufFrom.cvs, 0, 0);
      ctx.globalAlpha = e;
      ctx.drawImage(bufTo.cvs, 0, 0);
    }

    ctx.restore();
    if (onRedraw) onRedraw();
    return true;
  }

  function cleanup() {
    if (destroyed) return;
    destroyed = true;

    containerEl.removeEventListener('pointerenter', onEnter);
    containerEl.removeEventListener('pointermove', onMove);
    containerEl.removeEventListener('pointerleave', onLeave);

    fading = false;
    hovering = false;
    activeIdx = -1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    if (drawDefault) drawDefault(ctx, W, H);
    ctx.restore();

    if (onRedraw) onRedraw();
  }

  return { update: update, cleanup: cleanup };
}
window.mountAlbumScrub = mountAlbumScrub;
