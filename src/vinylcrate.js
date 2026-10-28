/* ============================================================
   PastForward — "the crate": a diagonal row of real records.
   Appended to the vinyl3d.js module by build.py, so it shares that
   file's THREE import and createVinylKit() (same realistic pressing
   as the hero).

   Moving between records: the arrow buttons, ←/→ keys, a horizontal
   swipe or drag, or clicking a neighbour. Page scroll is left alone —
   the section is one screen tall and scrolls past like any other.

   mountCrate(root, items, { onActive, onOpen, reducedMotion })
     → { cleanup, goTo, next, prev, active }
   ============================================================ */

export function mountCrate(root, items, opts = {}) {
  const RM = !!opts.reducedMotion;
  const N = items.length;
  const stage = root.querySelector(".crate__stage");
  const host = root.querySelector(".crate__gl");
  const svg = root.querySelector(".crate__scribble");
  const ink = svg.querySelector("path");
  const onActive = opts.onActive || (() => {});
  const onOpen = opts.onOpen || (() => {});

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  const kit = createVinylKit(renderer);
  const studio = kit.makeStudio();
  scene.environment = studio.texture;
  const parts = kit.recordParts();

  const light = new THREE.PointLight("#f6f2ec", 70, 80, 2);
  light.position.set(-3, 4, 9);
  scene.add(light);
  scene.add(new THREE.AmbientLight("#ffffff", 0.3));

  let dirty = true;

  /* ---- one record per item: holder (place in the row) → tilt (lean + hover) → spin ---- */
  const records = items.map((item, i) => {
    const holder = new THREE.Group(), tilt = new THREE.Group(), spin = new THREE.Group();
    holder.add(tilt); tilt.add(spin); scene.add(holder);
    const body = new THREE.Mesh(parts.bodyGeometry, parts.bodyMaterial);
    const surface = new THREE.Mesh(parts.surfaceGeometry, parts.vinylMaterial);
    surface.position.z = 0.030;
    const lc = kit.makeCanvas(512), lctx = lc.getContext("2d");
    lctx.fillStyle = "#1a1718"; lctx.fillRect(0, 0, 512, 512);
    const tex = kit.textureFrom(lc, true);
    const label = new THREE.Mesh(parts.labelGeometry, new THREE.MeshStandardMaterial({
      map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.9,
      color: new THREE.Color(0.14, 0.14, 0.14), roughness: 0.9, metalness: 0,
      envMapIntensity: 0.12, toneMapped: false
    }));
    label.position.z = 0.034;
    spin.add(body, surface, label);
    [body, surface, label].forEach(m => { m.userData.index = i; });
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const s = Math.max(512 / img.naturalWidth, 512 / img.naturalHeight);
      lctx.drawImage(img, 256 - img.naturalWidth * s / 2, 256 - img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s);
      const g = lctx.createRadialGradient(256, 256, 256 * 0.62, 256, 256, 256);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.8, "rgba(0,0,0,0.06)"); g.addColorStop(1, "rgba(0,0,0,0.26)");
      lctx.fillStyle = g; lctx.fillRect(0, 0, 512, 512);
      tex.needsUpdate = true; dirty = true; wake();
    };
    img.src = item.image;
    return { holder, tilt, spin, hit: [body, surface, label], angle: 0, hover: 0, tx: 0, ty: 0, lift: 0 };
  });
  const hitMeshes = records.flatMap(r => r.hit);

  /* ---- layout, measured from the reference: the record in front fills ~60% of the
          screen height; the next one sits up and to the right and a little closer,
          the previous one down and to the left and a little further away ---- */
  let W = 1, H = 1, portrait = false, LIFT_Y = 0;
  const STEP = new THREE.Vector3();
  const LEAN_X = -0.32, LEAN_Y = 0.26;
  function resize() {
    W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    portrait = W / H < 0.8;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const D = portrait ? 6 / (0.84 * 2 * t * camera.aspect) : 6 / (0.6 * 2 * t);
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const z1 = D * (portrait ? 0.06 : 0.11);                  // the next record is this much closer
    const d1 = D - z1, visW = 2 * t * d1 * camera.aspect, visH = 2 * t * d1;
    // screen offset of the neighbour, as a share of the screen
    STEP.set(visW * (portrait ? 0.74 : 0.36), visH * (portrait ? 0.15 : 0.19), z1);
    LIFT_Y = 2 * t * D * (portrait ? 0.05 : 0.035);
    dirty = true;
  }

  /* ---- navigation ---- */
  let target = 0, visual = 0, active = -1, spinBoost = 0, dragOffset = 0;
  function goTo(i) {
    const t = Math.max(0, Math.min(N - 1, i));
    if (t === target && !dragOffset) return;
    target = t; dirty = true; wake();
  }
  const next = () => goTo(target + 1), prev = () => goTo(target - 1);

  /* ---- pointer: hover → the loop draws round the record and chases the pointer;
          drag/swipe sideways → previous/next; click the front record → open it ---- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), local = new THREE.Vector3();
  let hovered = -1, pointerIn = false, lastMove = 0, down = null, opening = false;
  const touchOnly = window.matchMedia("(hover: none)").matches;
  function pick(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(hitMeshes.filter(m => m.parent.parent.parent.visible), false);
    if (!hits.length) return null;
    const i = hits[0].object.userData.index;
    local.copy(hits[0].point); records[i].tilt.worldToLocal(local);
    return { i, x: local.x / 3, y: local.y / 3 };
  }
  const lightTarget = new THREE.Vector3(-3, 4, 9);
  function onMove(e) {
    if (down && down.id === e.pointerId) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        down.dragging = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (down.dragging) {
        dragOffset = -dx / (W * (portrait ? 0.7 : 0.38));     // the row follows the finger
        dirty = true; wake();
        return;
      }
    }
    if (e.pointerType === "touch") return;
    pointerIn = true; lastMove = performance.now();
    const r = canvas.getBoundingClientRect();
    lightTarget.set(((e.clientX - r.left) / r.width - 0.5) * 18, -((e.clientY - r.top) / r.height - 0.5) * 11, 9);
    const h = pick(e.clientX, e.clientY);
    if (h) {
      records[h.i].tx = h.x; records[h.i].ty = h.y;
      chase = Math.atan2(h.y, h.x);
      if (hovered !== h.i) { if (hovered !== -1) { records[hovered].tx = records[hovered].ty = 0; } hovered = h.i; drawOn(h.i); }
      canvas.style.cursor = "pointer";
    } else if (hovered !== -1) {
      records[hovered].tx = records[hovered].ty = 0;
      hovered = -1; drawOff(); canvas.style.cursor = "";
    }
    dirty = true; wake();
  }
  function onLeave() {
    pointerIn = false;
    if (hovered !== -1) { records[hovered].tx = records[hovered].ty = 0; hovered = -1; drawOff(); }
    canvas.style.cursor = ""; dirty = true; wake();
  }
  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), dragging: false };
  }
  function onUp(e) {
    if (!down || down.id !== e.pointerId) return;
    const d = down; down = null;
    if (d.dragging) {
      const moved = dragOffset;
      dragOffset = 0;
      // a flick of a fifth of a record is enough; a long drag can travel several
      const steps = Math.abs(moved) < 0.18 ? 0 : Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)));
      target = Math.max(0, Math.min(N - 1, target + steps));
      visual = Math.max(-0.4, Math.min(N - 0.6, visual + moved));   // continue from where the finger left it
      dirty = true; wake();
      return;
    }
    if (performance.now() - d.t > 900) return;
    const h = pick(e.clientX, e.clientY);
    if (!h) return;
    if (h.i === target && Math.abs(visual - target) < 0.2) {
      if (e.pointerType === "touch" && drawnAround !== h.i) { drawOn(h.i); setTimeout(() => open(h.i), 380); }
      else open(h.i);
    } else goTo(h.i);
  }
  function onCancel() { if (down && down.dragging) { dragOffset = 0; dirty = true; wake(); } down = null; }
  function open(i) {
    if (opening) return; opening = true;
    if (RM) { onOpen(items[i], i); return; }
    const r = records[i], t0 = performance.now();
    (function lift(now) {
      const k = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - k, 3);
      r.lift = e; dirty = true; wake();
      if (k < 1) requestAnimationFrame(lift); else onOpen(items[i], i);
    })(t0);
  }
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);

  /* ---- the loop: a loose ring of ink around the record, in screen space, built from
          points on the record's own rim so it follows the lean; it re-draws itself a few
          times a second while the pointer moves, and leans toward the pointer ---- */
  let seed = 7, chase = 2.2, drawnAround = -1, drawn = 0, lastBoil = 0, startAngle = 1.1, drawAnim = null;
  const P = new THREE.Vector3();
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function scribblePath(i) {
    const rec = records[i], rnd = mulberry(seed);
    const ph1 = rnd() * 6.28, ph2 = rnd() * 6.28, wob = 0.025 + rnd() * 0.02;
    const turns = 1.32 + rnd() * 0.18, steps = 120;
    const ox = rec.tx * 0.18, oy = rec.ty * 0.18;
    let d = "";
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, a = startAngle + t * turns * Math.PI * 2;
      const rr = 3.0 * (1.07 + wob * Math.sin(a * 2 + ph1) + 0.018 * Math.sin(a * 5 + ph2) + 0.05 * t);
      P.set(ox + rr * Math.cos(a), oy + rr * 0.985 * Math.sin(a), 0.05);
      rec.tilt.localToWorld(P); P.project(camera);
      d += (k ? "L" : "M") + ((P.x + 1) / 2 * W).toFixed(1) + " " + ((1 - P.y) / 2 * H).toFixed(1);
    }
    return d;
  }
  function drawOn(i) {
    drawnAround = i; seed = (seed * 9301 + 49297) % 233280;
    startAngle = chase - 1.1;
    ink.setAttribute("d", scribblePath(i));
    svg.style.opacity = "1";
    if (drawAnim) drawAnim.cancel();
    drawn = 1;
    if (RM) { ink.style.strokeDashoffset = "0"; return; }
    drawAnim = ink.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 620, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" });
  }
  function drawOff() {
    if (drawAnim) drawAnim.cancel();
    drawn = 0;
    if (RM) { svg.style.opacity = "0"; drawnAround = -1; return; }
    const was = drawnAround;
    drawAnim = ink.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }], { duration: 360, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
    drawAnim.onfinish = () => { if (drawnAround === was && !drawn) { svg.style.opacity = "0"; drawnAround = -1; } };
  }

  /* ---- frame loop: only while on screen and something is changing ---- */
  let raf = 0, last = performance.now(), visible = false, disposed = false;
  function wake() { if (!raf && visible && !disposed) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    let moving = false;

    const goal = target + dragOffset;
    const before = visual;
    const k = RM ? 1 : 1 - Math.exp(-dt * (dragOffset ? 18 : 6.5));
    visual += (goal - visual) * k;
    if (Math.abs(goal - visual) < 1e-4) visual = goal; else moving = true;
    if (!RM) spinBoost = Math.min(900, spinBoost + Math.abs(visual - before) * 600);

    const a = Math.max(0, Math.min(N - 1, Math.round(visual)));
    if (a !== active) { active = a; onActive(items[a], a); }
    if (touchOnly && !pointerIn) {
      // no hover on phones: the record that settles in front gets the loop
      const settled = Math.abs(visual - target) < 0.03 && !dragOffset;
      if (settled && drawnAround !== target) { chase = 2.2; drawOn(target); }
      else if (!settled && drawnAround !== -1 && drawn) drawOff();
    }

    spinBoost *= Math.pow(0.9, dt * 60);
    const settling = spinBoost < 4;
    records.forEach((r, i) => {
      const d = i - visual;
      const on = Math.abs(d) < 2.7;
      r.holder.visible = on;
      if (!on) return;
      r.holder.position.copy(STEP).multiplyScalar(d);
      if (d < 0) r.holder.position.z *= 1.9;          // records already passed sink further back, clear of the text
      r.holder.position.y += LIFT_Y;
      r.holder.position.z += r.lift * 2.4;
      // records turn while the row moves, then come to rest with the art upright
      r.angle += spinBoost * (Math.abs(d) < 0.6 ? 1 : 0.6) * dt;
      if (settling) {
        const rest = Math.round(r.angle / 360) * 360, gap = rest - r.angle;
        if (Math.abs(gap) > 0.05) { r.angle += gap * (RM ? 1 : 1 - Math.exp(-dt * 2.6)); moving = true; } else r.angle = rest;
      }
      r.spin.rotation.z = -r.angle * Math.PI / 180;
      const want = i === hovered ? 1 : 0;
      r.hover += (want - r.hover) * (RM ? 1 : 1 - Math.exp(-dt * 10));
      if (Math.abs(r.hover - want) > 0.002) moving = true;
      r.tilt.rotation.set(LEAN_X - r.ty * 0.12 * r.hover, LEAN_Y + r.tx * 0.14 * r.hover, 0, "YXZ");
      r.tilt.scale.setScalar(1 + 0.025 * r.hover);
    });
    if (spinBoost > 0.5) moving = true;

    if (!pointerIn) {
      const t = now * 0.001;
      lightTarget.set(Math.cos(t * 0.5) * 7, 3 + Math.sin(t * 0.35) * 3, 9);
      if (!RM) moving = true;     // the light keeps drifting over the grooves while on screen
    }
    light.position.lerp(lightTarget, 1 - Math.exp(-5 * dt));

    if (drawnAround >= 0) {
      startAngle += ((chase - 1.1) - startAngle) * (1 - Math.exp(-dt * 4));
      if (!RM && pointerIn && now - lastBoil > 110 && now - lastMove < 300) { seed = (seed * 9301 + 49297) % 233280; lastBoil = now; }
      ink.setAttribute("d", scribblePath(drawnAround));
    }

    renderer.render(scene, camera);
    dirty = false;
    if ((moving || dirty) && visible) raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { dirty = true; wake(); } }, { rootMargin: "60px" });
  io.observe(stage);
  const ro = new ResizeObserver(() => { resize(); wake(); });
  ro.observe(stage);
  const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); };
  document.addEventListener("visibilitychange", onVis);
  resize();

  function cleanup() {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(raf);
    io.disconnect(); ro.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onCancel);
    const geos = new Set(), mats = new Set();
    scene.traverse(o => { if (o.geometry) geos.add(o.geometry); if (o.material) mats.add(o.material); });
    geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose());
    kit.textures.forEach(t => t.dispose()); studio.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  }
  return { cleanup, goTo, next, prev, get active() { return target; } };
}
window.mountCrate = mountCrate;
