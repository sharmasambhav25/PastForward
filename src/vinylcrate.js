/* ============================================================
   PastForward — "the crate": a diagonal row of real records.
   Appended to the vinyl3d.js module by build.py, so it shares that
   file's THREE import and createVinylKit() (same realistic pressing
   as the hero). The page's own scroll drives it: the section is tall,
   its stage is sticky, and scroll position maps to which record sits
   in the middle. Nothing is scroll-jacked, so phones swipe natively.

   mountCrate(root, items, { onOpen, reducedMotion }) → { cleanup, onScroll }
   items: [{ slug, artist, album, image (url), ... }] — DOM text is
   rendered by routes.js; this file only moves records and the scribble.
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
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  const kit = createVinylKit(renderer);
  const studio = kit.makeStudio();
  scene.environment = studio.texture;
  const parts = kit.recordParts();

  const light = new THREE.PointLight("#f6f2ec", 60, 60, 2);
  light.position.set(-3, 4, 7);
  scene.add(light);
  scene.add(new THREE.AmbientLight("#ffffff", 0.25));

  /* ---- one record per item: tilt (fixed lean, like a record propped in a crate)
          → spin (turns with scroll) → body / grooves / printed label ---- */
  const labelGeo = parts.labelGeometry;
  const records = items.map((item, i) => {
    const holder = new THREE.Group();          // position along the diagonal
    const tilt = new THREE.Group();            // lean + hover tilt
    const spin = new THREE.Group();            // rotation about the spindle
    holder.add(tilt); tilt.add(spin); scene.add(holder);
    const body = new THREE.Mesh(parts.bodyGeometry, parts.bodyMaterial);
    const surface = new THREE.Mesh(parts.surfaceGeometry, parts.vinylMaterial);
    surface.position.z = 0.030;
    const lc = kit.makeCanvas(512), lctx = lc.getContext("2d");
    lctx.fillStyle = "#1a1718"; lctx.fillRect(0, 0, 512, 512);
    const tex = kit.textureFrom(lc, true);
    const label = new THREE.Mesh(labelGeo, new THREE.MeshStandardMaterial({
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
      // the printed label: album art cropped to the circle, a hairline ring at the edge
      const s = Math.max(512 / img.naturalWidth, 512 / img.naturalHeight);
      lctx.drawImage(img, 256 - img.naturalWidth * s / 2, 256 - img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s);
      const g = lctx.createRadialGradient(256, 256, 256 * 0.62, 256, 256, 256);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.8, "rgba(0,0,0,0.06)"); g.addColorStop(1, "rgba(0,0,0,0.26)");
      lctx.fillStyle = g; lctx.fillRect(0, 0, 512, 512);
      tex.needsUpdate = true; dirty = true;
    };
    img.src = item.image;
    return { holder, tilt, spin, hit: [body, surface, label], angle: 0, hover: 0, tx: 0, ty: 0 };
  });
  const hitMeshes = records.flatMap(r => r.hit);

  /* ---- layout ---- */
  let W = 1, H = 1, portrait = false, DIAG = new THREE.Vector3(), SPACING = 7.4, LIFT_Y = 0;
  const LEAN_X = -0.62, LEAN_Y = 0.36;          // record faces the viewer, top tipped away, turned toward the row
  function resize() {
    W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    portrait = W / H < 0.8;
    // fit: the active record fills ~56% of the height on wide screens, ~84% of the width on phones
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const visH = portrait ? 6.2 / 0.74 / camera.aspect : 6.2 / 0.56;
    camera.position.set(0, 0, visH / (2 * Math.tan(vfov / 2)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // phones: a steeper row with wider gaps, so neighbours only peek from the corners
    // and never sit under the text; the active record rides a little above centre
    DIAG.set(portrait ? 0.55 : 1, portrait ? 0.835 : 0.56, 0).normalize();
    SPACING = portrait ? 11 : 8.3;
    LIFT_Y = portrait ? visH * 0.045 : 0;
    dirty = true;
  }

  /* ---- scroll → progress ---- */
  let target = 0, visual = 0, lastTarget = 0, spinBoost = 0, active = -1;
  // scroll distance per record, measured from the laid-out section (CSS decides it via --step)
  const stepPx = () => Math.max(1, (root.offsetHeight - stage.offsetHeight) / Math.max(1, N - 1));
  function readScroll() {
    const r = root.getBoundingClientRect();
    target = Math.min(N - 1, Math.max(0, -r.top / stepPx()));
    return r;
  }
  let snapTimer = 0;
  function onScroll() {
    readScroll();
    const dv = Math.abs(target - lastTarget); lastTarget = target;
    if (!RM) spinBoost = Math.min(900, spinBoost + dv * 900);
    dirty = true; wake();
    clearTimeout(snapTimer);
    snapTimer = setTimeout(snap, 150);
  }
  function snap() {
    const r = root.getBoundingClientRect();
    const pinned = r.top < -2 && r.bottom > innerHeight + 2;
    const t = Math.round(target);
    if (!pinned || Math.abs(t - target) < 0.02) return;
    scrollToIndex(t);
  }
  function scrollToIndex(i) {
    const top = window.scrollY + root.getBoundingClientRect().top + i * stepPx() + 1;
    window.scrollTo({ top, behavior: RM ? "auto" : "smooth" });
  }

  /* ---- pointer: hover a record → scribble chases the pointer; click/tap opens or goes to it ---- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovered = -1, pointerIn = false, lastMove = 0, downAt = null;
  const local = new THREE.Vector3();
  const touchOnly = window.matchMedia("(hover: none)").matches;
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(hitMeshes.filter(m => m.parent.parent.parent.visible), false);
    if (!hits.length) return null;
    const i = hits[0].object.userData.index;
    local.copy(hits[0].point); records[i].tilt.worldToLocal(local);
    return { i, x: local.x / 3, y: local.y / 3 };
  }
  function onMove(e) {
    if (e.pointerType === "touch") return;
    const h = pick(e);
    pointerIn = true; lastMove = performance.now();
    // the light follows the pointer across the stage
    const r = canvas.getBoundingClientRect();
    lightTarget.set(((e.clientX - r.left) / r.width - 0.5) * 16, -((e.clientY - r.top) / r.height - 0.5) * 10, 7);
    if (h) {
      records[h.i].tx = h.x; records[h.i].ty = h.y;
      chase = Math.atan2(h.y, h.x);
      if (hovered !== h.i) { hovered = h.i; drawOn(h.i); }
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
  function onDown(e) { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; }
  function onUp(e) {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8 || performance.now() - downAt.t > 900;
    downAt = null;
    if (moved) return;
    const h = pick(e);
    if (!h) return;
    if (h.i === Math.round(visual) && Math.abs(visual - h.i) < 0.15) {
      if (e.pointerType === "touch" && hovered !== h.i) { hovered = h.i; drawOn(h.i); setTimeout(() => open(h.i), 380); }
      else open(h.i);
    } else scrollToIndex(h.i);
  }
  let opening = false;
  function open(i) {
    if (opening) return; opening = true;
    if (RM) { onOpen(items[i], i); return; }
    // the chosen record lifts toward the viewer, then the product page takes over
    const r = records[i], t0 = performance.now();
    (function lift(now) {
      const k = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - k, 3);
      r.lift = e; dirty = true;
      if (k < 1) requestAnimationFrame(lift); else onOpen(items[i], i);
    })(t0);
  }
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);

  /* ---- the scribble: a loose ink loop drawn around a record, in screen space.
          It's built from points on the record's own rim, so it follows the
          perspective lean, and it "boils" (re-seeds) while the pointer moves. ---- */
  let seed = 7, chase = 2.2, drawnAround = -1, drawn = 0, lastBoil = 0;
  const startAngle = { v: 2.2 };
  const P = new THREE.Vector3();
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function scribblePath(i) {
    const rec = records[i], rnd = mulberry(seed);
    const ph1 = rnd() * 6.28, ph2 = rnd() * 6.28, wob = 0.025 + rnd() * 0.02;
    const turns = 1.32 + rnd() * 0.18, steps = 120;
    const ox = rec.tx * 0.18, oy = rec.ty * 0.18;              // the loop leans toward the pointer
    let d = "";
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, a = startAngle.v + t * turns * Math.PI * 2;
      const rr = 3.0 * (1.07 + wob * Math.sin(a * 2 + ph1) + 0.018 * Math.sin(a * 5 + ph2) + 0.05 * t);
      P.set(ox + rr * Math.cos(a), oy + rr * 0.985 * Math.sin(a), 0.05);
      rec.tilt.localToWorld(P); P.project(camera);
      d += (k ? "L" : "M") + ((P.x + 1) / 2 * W).toFixed(1) + " " + ((1 - P.y) / 2 * H).toFixed(1);
    }
    return d;
  }
  let drawAnim = null;
  function drawOn(i) {
    drawnAround = i; seed = (seed * 9301 + 49297) % 233280;
    startAngle.v = chase - 1.1;
    ink.setAttribute("d", scribblePath(i));
    svg.style.opacity = "1";
    if (drawAnim) drawAnim.cancel();
    if (RM) { ink.style.strokeDashoffset = "0"; drawn = 1; return; }
    drawAnim = ink.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 620, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" });
    drawn = 1;
  }
  function drawOff() {
    if (drawAnim) drawAnim.cancel();
    if (RM) { svg.style.opacity = "0"; drawn = 0; drawnAround = -1; return; }
    drawAnim = ink.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }], { duration: 360, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
    drawn = 0; const was = drawnAround;
    drawAnim.onfinish = () => { if (drawnAround === was && !drawn) { svg.style.opacity = "0"; drawnAround = -1; } };
  }

  /* ---- frame loop: runs only while the section is on screen ---- */
  const lightTarget = light.position.clone();
  let raf = 0, last = performance.now(), visible = false, dirty = true, disposed = false;
  function wake() { if (!raf && visible && !disposed) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    let moving = false;

    const k = RM ? 1 : 1 - Math.exp(-dt * 8);
    const nv = visual + (target - visual) * k;
    if (Math.abs(nv - visual) > 1e-4) moving = true;
    visual = Math.abs(target - nv) < 1e-4 ? target : nv;

    const a = Math.round(visual);
    if (a !== active) { active = a; onActive(items[a], a); }
    if (touchOnly && !pointerIn) {
      // no hover on phones: the record that settles in the middle gets the loop
      const settled = Math.abs(visual - a) < 0.03;
      if (settled && drawnAround !== a) { hovered = -1; chase = 2.2; drawOn(a); }
      else if (!settled && drawnAround !== -1 && drawn) drawOff();
    }

    spinBoost *= Math.pow(0.9, dt * 60);
    // records turn only while you scroll; once the row settles each one comes to rest
    // with its label upright, so the art reads the right way up
    const settling = spinBoost < 4;
    records.forEach((r, i) => {
      const d = i - visual;
      const on = Math.abs(d) < 2.6;
      r.holder.visible = on;
      if (!on) return;
      r.holder.position.copy(DIAG).multiplyScalar(d * SPACING);
      r.holder.position.y += LIFT_Y;
      r.holder.position.z = (r.lift || 0) * 2.2;
      r.angle += spinBoost * (Math.abs(d) < 0.6 ? 1 : 0.6) * dt;
      if (settling) {
        const rest = Math.round(r.angle / 360) * 360, gap = rest - r.angle;
        if (Math.abs(gap) > 0.05) { r.angle += gap * (RM ? 1 : 1 - Math.exp(-dt * 2.6)); moving = true; } else r.angle = rest;
      }
      r.spin.rotation.z = -r.angle * Math.PI / 180;
      // hover: lean a touch toward the pointer
      const want = i === hovered ? 1 : 0;
      r.hover += (want - r.hover) * (RM ? 1 : 1 - Math.exp(-dt * 10));
      r.tilt.rotation.set(LEAN_X - r.ty * 0.12 * r.hover, LEAN_Y + r.tx * 0.14 * r.hover, 0, "YXZ");
      if (Math.abs(r.hover - want) > 0.002) moving = true;
    });
    if (spinBoost > 0.5) moving = true;

    if (!pointerIn) {
      const t = now * 0.001;
      lightTarget.set(Math.cos(t * 0.5) * 6, 3 + Math.sin(t * 0.35) * 2.5, 7);
    }
    light.position.lerp(lightTarget, 1 - Math.exp(-5 * dt));

    if (drawnAround >= 0) {
      startAngle.v += ((chase - 1.1) - startAngle.v) * (1 - Math.exp(-dt * 4));
      // boil a few times a second while the pointer is moving; otherwise just track the record
      if (!RM && pointerIn && now - lastBoil > 110 && now - lastMove < 300) { seed = (seed * 9301 + 49297) % 233280; lastBoil = now; }
      ink.setAttribute("d", scribblePath(drawnAround));
    }

    if (dirty || moving) renderer.render(scene, camera);
    dirty = false;
    if (moving && visible) raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { dirty = true; wake(); } }, { rootMargin: "100px" });
  io.observe(stage);
  const ro = new ResizeObserver(() => { resize(); wake(); });
  ro.observe(stage);
  resize(); readScroll(); visual = target;

  function cleanup() {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(raf); clearTimeout(snapTimer);
    io.disconnect(); ro.disconnect();
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    const geos = new Set(), mats = new Set();
    scene.traverse(o => { if (o.geometry) geos.add(o.geometry); if (o.material) mats.add(o.material); });
    geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose());
    kit.textures.forEach(t => t.dispose()); studio.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  }
  return { cleanup, onScroll, goTo: scrollToIndex, get active() { return active; } };
}
window.mountCrate = mountCrate;
