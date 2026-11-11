/* ============================================================
   PastForward — WebGL hero disc (adapted from a reference build).
   Self-hosted Three.js (no CDN — see build.py, which rewrites the
   import below to a data: URI of vendor/three.module.min.js so the
   page has zero runtime network dependency). The label texture uses
   only PastForward's own real microcopy — no invented track titles.
   ============================================================ */
import * as THREE from "/vendor/three.module.min.js";

/* Everything that makes a record look like a real pressing, shared by the hero disc
   and the crate carousel: seeded noise, the groove/roughness/anisotropy maps and the
   small studio it reflects. One kit per renderer (textures belong to a GL context). */
export function createVinylKit(renderer) {
  const textures = new Set();
  let seed = 781;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function makeCanvas(size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    return c;
  }
  function textureFrom(c, color = false) {
    const texture = new THREE.CanvasTexture(c);
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.add(texture);
    return texture;
  }

  /* A real 12" LP, to scale (disc radius 2.99 units = 152mm):
     label to r 0.965 · smooth glossy run-out (dead wax) to 1.22 · grooved programme area
     split into tracks by narrow glossy gaps · smooth lead-in from 2.86 · rounded rim.
     The look of real vinyl comes from the grooves scattering light ACROSS them, which
     turns every reflection into a thin radial streak (the "bow-tie" sheen in photos).
     That is done physically below with an anisotropy map pointing radially, so the
     highlight stays put in the room while the record turns under it. */
  const RUNOUT = 1.22, LEADIN = 2.86, EDGE = 2.955;
  const GAPS = [1.47, 1.71, 1.985, 2.215, 2.53];
  const TRACKS = [RUNOUT, ...GAPS, LEADIN].slice(1).map((end, i, a) => ({
    from: i === 0 ? RUNOUT : a[i - 1], to: end,
    rough: 0.17 + random() * 0.07,   // louder/quieter cuts reflect slightly differently
    aniso: 0.8 + random() * 0.2
  }));

  function makeVinylMaps() {
    const size = 2048, center = size / 2, px = size / 6;
    const colorCanvas = makeCanvas(size), roughCanvas = makeCanvas(size), bumpCanvas = makeCanvas(size);
    const color = colorCanvas.getContext("2d"), rough = roughCanvas.getContext("2d"), bump = bumpCanvas.getContext("2d");
    color.fillStyle = "#0b0b0c"; color.fillRect(0, 0, size, size);
    rough.fillStyle = "#3a3a3a"; rough.fillRect(0, 0, size, size);
    bump.fillStyle = "#808080"; bump.fillRect(0, 0, size, size);
    const g = v => { v = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${v},${v},${v})`; };
    function ring(ctx, radius, width, stroke) {
      ctx.beginPath(); ctx.arc(center, center, radius * px, 0, Math.PI * 2);
      ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.stroke();
    }
    function band(ctx, r0, r1, fill) {
      ctx.beginPath(); ctx.arc(center, center, r1 * px, 0, Math.PI * 2); ctx.arc(center, center, r0 * px, 0, Math.PI * 2, true);
      ctx.fillStyle = fill; ctx.fill();
    }
    // run-out: near-mirror, with a few widely spaced locked/lead-out grooves
    band(rough, 0.965, RUNOUT, g(0.09 * 255));
    for (let r = 1.0; r < RUNOUT - 0.01; r += 0.034 + random() * 0.02) { ring(rough, r, 1.1, g(0.22 * 255)); ring(color, r, 1, "#101012"); }
    // programme area: very fine grooves, each track with its own sheen
    for (const t of TRACKS) {
      band(rough, t.from, t.to, g(t.rough * 255));
      for (let r = t.from + 0.006; r < t.to - 0.006; r += 0.0027 + random() * 0.0011) {
        const v = 9 + random() * 7;
        ring(color, r, 0.7, `rgb(${v},${v},${v + 1})`);
        ring(rough, r, 0.7, g((t.rough + (random() - 0.5) * 0.08) * 255));
      }
    }
    // track gaps: smooth and glossy, sitting a hair below the grooved land
    for (const r of GAPS) {
      ring(rough, r, 3, g(0.115 * 255)); ring(color, r, 3, "#0c0c0d");
      ring(bump, r, 3, "#7b7b7b");
    }
    // lead-in and the rounded rim
    band(rough, LEADIN, EDGE, g(0.09 * 255));
    for (const r of [LEADIN + 0.012, LEADIN + 0.03, LEADIN + 0.052]) ring(rough, r, 1.1, g(0.2 * 255));
    band(rough, EDGE, 3.0, g(0.14 * 255));
    ring(bump, LEADIN, 1.6, "#707070"); ring(bump, 0.968, 2, "#9a9a9a"); ring(bump, RUNOUT, 1.2, "#787878");
    // handling: faint hairline scuffs and the odd speck of dust, as on any played record
    for (let i = 0; i < 70; i++) {
      const radius = (1.0 + random() * 1.94) * px, angle = random() * Math.PI * 2, len = 0.01 + random() * 0.07;
      color.beginPath(); color.arc(center, center, radius, angle, angle + len);
      color.lineWidth = 0.5; color.strokeStyle = `rgba(160,162,170,${0.03 + random() * 0.05})`; color.stroke();
      rough.beginPath(); rough.arc(center, center, radius, angle, angle + len);
      rough.lineWidth = 0.6; rough.strokeStyle = "rgba(150,150,150,.5)"; rough.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const a = random() * Math.PI * 2, r = (1.0 + random() * 1.94) * px;
      color.fillStyle = `rgba(190,190,195,${0.05 + random() * 0.08})`;
      color.fillRect(center + Math.cos(a) * r, center + Math.sin(a) * r, 1 + random() * 1.4, 1 + random() * 1.4);
    }
    return {
      map: textureFrom(colorCanvas, true), roughnessMap: textureFrom(roughCanvas),
      bumpMap: textureFrom(bumpCanvas), anisotropyMap: makeAnisotropyMap()
    };
  }

  /* RG = direction in the surface's UV frame (radial, pointing out from the spindle),
     B = strength. RingGeometry's UVs are planar, so UV x/y are the disc's own x/y. */
  function makeAnisotropyMap() {
    const A = 1024, c = A / 2, upx = A / 6;
    const cv = makeCanvas(A), ctx = cv.getContext("2d"), img = ctx.createImageData(A, A), d = img.data;
    const trackAt = r => TRACKS.find(t => r >= t.from && r < t.to);
    for (let y = 0; y < A; y++) {
      for (let x = 0; x < A; x++) {
        const dx = x + 0.5 - c, dy = -(y + 0.5 - c), len = Math.hypot(dx, dy) || 1, r = len / upx;
        let s;
        if (r < RUNOUT) s = 0.3;
        else if (r < LEADIN) {
          const t = trackAt(r), nearGap = GAPS.some(gp => Math.abs(gp - r) < 0.0055);
          s = nearGap ? 0.62 : (t ? t.aniso : 1);
        } else if (r < EDGE) s = 0.45;
        else s = 0.15;
        const i = (y * A + x) * 4;
        d[i] = (dx / len * 0.5 + 0.5) * 255; d[i + 1] = (dy / len * 0.5 + 0.5) * 255; d[i + 2] = s * 255; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = textureFrom(cv);
    tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;   // mipmapping would blur the direction field at the spindle
    return tex;
  }

  /* a dark studio for the record to reflect: two long softboxes and a dim fill, no floor.
     Real vinyl is almost black; what you see is mostly the room reflected in it. */
  function makeStudio() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Scene();
    const owned = [];
    const add = (geo, color, pos) => {
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(...pos); mesh.lookAt(0, 0, 0);
      room.add(mesh); owned.push(geo, mat);
    };
    add(new THREE.SphereGeometry(30, 32, 16), new THREE.Color("#060607"), [0, 0, 0]);
    add(new THREE.PlaneGeometry(3.2, 2.2), new THREE.Color("#f7f5f2").multiplyScalar(7), [-5.5, 6.5, 8.5]);   // key softbox, upper left
    add(new THREE.PlaneGeometry(2.2, 1.6), new THREE.Color("#e9eefb").multiplyScalar(3), [6.5, 2.5, 9]);     // cool fill softbox, right
    add(new THREE.PlaneGeometry(12, 5), new THREE.Color("#ffffff").multiplyScalar(0.05), [0, 9, 13]);       // faint overhead fill
    const target = pmrem.fromScene(room, 0.03);
    owned.forEach(o => o.dispose()); pmrem.dispose();
    return target;
  }

  /* geometry + materials for one LP, shareable across many records in one scene */
  function recordParts() {
    const outline = new THREE.Shape();
    outline.absarc(0, 0, 2.99, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.037, 0, Math.PI * 2, true);
    outline.holes.push(hole);
    const bodyGeometry = new THREE.ExtrudeGeometry(outline, {
      depth: 0.055, steps: 1, bevelEnabled: true, bevelSegments: 3,
      bevelSize: 0.009, bevelThickness: 0.009, curveSegments: 160
    });
    bodyGeometry.translate(0, 0, -0.035);
    return {
      bodyGeometry,
      surfaceGeometry: new THREE.RingGeometry(0.037, 2.992, 200),
      labelGeometry: new THREE.RingGeometry(0.037, 0.965, 128),
      bodyMaterial: new THREE.MeshPhysicalMaterial({ color: "#0a0a0b", roughness: 0.2, metalness: 0, ior: 1.5 }),
      vinylMaterial: new THREE.MeshPhysicalMaterial({
        ...makeVinylMaps(), color: "#ffffff", metalness: 0, roughness: 1,
        anisotropy: 0.85, bumpScale: 0.04, ior: 1.5, specularIntensity: 1
      })
    };
  }

  return { random, makeCanvas, textureFrom, textures, makeVinylMaps, makeStudio, recordParts };
}

export function mountVinyl(container) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("mountVinyl requires a DOM container.");
  }
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(max-width:767px)').matches ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y;";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "A slowly rotating vinyl record, lit by a light that follows the pointer");
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, -3.6, 8.1);
  camera.lookAt(0, 0, 0);

  const { random, makeCanvas, textureFrom, textures, makeVinylMaps, makeStudio } = createVinylKit(renderer);

  /* the printed centre label — PastForward's own microcopy only, no invented track listing.
     Built once onto `defaultLabelCanvas` (the procedural grain/text render is deterministic,
     so there's no reason to redo it later); `liveCanvas` starts as a copy of that and is the
     canvas actually mapped onto the mesh — the hover "album scrub" feature below repaints
     liveCanvas and can always crossfade back to defaultLabelCanvas without recomputing it. */
  function makeLabelMaps() {
    // a plain dark label: only ever seen for a moment before the first album's art arrives
    const defaultLabelCanvas = makeCanvas(1024);
    const ctx = defaultLabelCanvas.getContext("2d");
    const grad = ctx.createRadialGradient(390, 330, 60, 512, 512, 620);
    grad.addColorStop(0, "#1d1b1c"); grad.addColorStop(0.56, "#151314"); grad.addColorStop(1, "#0d0c0c");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1024, 1024);
    const image = ctx.getImageData(0, 0, 1024, 1024);
    const height = makeCanvas(1024);
    const heightCtx = height.getContext("2d");
    const heightImage = heightCtx.createImageData(1024, 1024);
    for (let i = 0; i < image.data.length; i += 4) {
      const grain = (random() - 0.5) * 10;
      image.data[i] += grain; image.data[i + 1] += grain; image.data[i + 2] += grain;
      const h = 128 + grain * 3;
      heightImage.data[i] = h; heightImage.data[i + 1] = h; heightImage.data[i + 2] = h; heightImage.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    heightCtx.putImageData(heightImage, 0, 0);
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    for (const radius of [456, 445, 151]) {
      ctx.beginPath(); ctx.arc(512, 512, radius, 0, Math.PI * 2);
      ctx.lineWidth = radius === 445 ? 2 : 4; ctx.stroke();
    }

    const liveCanvas = makeCanvas(1024);
    liveCanvas.getContext("2d").drawImage(defaultLabelCanvas, 0, 0);

    return {
      maps: { map: textureFrom(liveCanvas, true), bumpMap: textureFrom(height) },
      liveCanvas,
      defaultLabelCanvas
    };
  }

  const record = new THREE.Group();
  scene.add(record);

  const outline = new THREE.Shape();
  outline.absarc(0, 0, 2.99, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.037, 0, Math.PI * 2, true);
  outline.holes.push(hole);
  const bodyGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.055, steps: 1, bevelEnabled: true, bevelSegments: 3,
    bevelSize: 0.009, bevelThickness: 0.009, curveSegments: 192
  });
  bodyGeometry.translate(0, 0, -0.035);
  const studio = makeStudio();
  scene.environment = studio.texture;

  const body = new THREE.Mesh(bodyGeometry, new THREE.MeshPhysicalMaterial({
    color: "#0a0a0b", roughness: 0.2, metalness: 0, ior: 1.5
  }));
  record.add(body);

  const vinylMaterial = new THREE.MeshPhysicalMaterial({
    ...makeVinylMaps(), color: "#ffffff", metalness: 0, roughness: 1,   // roughnessMap carries the real values
    anisotropy: 0.85, bumpScale: 0.04, ior: 1.5, specularIntensity: 1
  });
  const surface = new THREE.Mesh(new THREE.RingGeometry(0.037, 2.992, 256), vinylMaterial);
  surface.position.z = 0.030;
  record.add(surface);

  const labelBuild = makeLabelMaps();
  /* the label is printed paper: show the art at its true colour (emissive, not tone-mapped)
     and let the moving light add a little on top, instead of the art only existing where lit */
  const label = new THREE.Mesh(new THREE.RingGeometry(0.037, 0.965, 192), new THREE.MeshStandardMaterial({
    ...labelBuild.maps, roughness: 0.9, metalness: 0, bumpScale: 0.0012,
    color: new THREE.Color(0.14, 0.14, 0.14),   // light only adds a gentle sheen, never blows the art out
    emissive: "#ffffff", emissiveMap: labelBuild.maps.map, emissiveIntensity: 0.9,
    envMapIntensity: 0.12, toneMapped: false
  }));
  label.position.z = 0.034;
  record.add(label);

  /* hover/auto "album scrub" — cycles through real PastForward catalogue albums
     (their actual cover art + real artist/album name) on the centre label every 2
     seconds with smooth crossfades, while also supporting interactive pointer scrubbing.
     Built from the site's own catalogue data — never fabricated. */
  const ALBUMS = (() => {
    const products = (window.__CATALOGUE__ && window.__CATALOGUE__.products) || [];
    const getImg = typeof window.imgSrc === "function" ? window.imgSrc : (typeof imgSrc === "function" ? imgSrc : null);
    const featured = [];
    const rest = [];
    for (const p of products) {
      if (!p.artist || !p.album || p.album === "[CONFIRM]") continue;
      const variant = p.variants.find(v => v.format === "vinyl");
      if (!variant || !variant.image) continue;
      const imageUrl = getImg ? getImg(variant.image) : "";
      if (!imageUrl) continue;
      const item = { artist: p.artist, album: p.album, imageUrl, rank: p.rank || 99 };
      if (p.featured) featured.push(item);
      else rest.push(item);
    }
    featured.sort((a, b) => a.rank - b.rank);
    return featured.concat(rest);
  })();
  let albumScrub = null;
  if (window.mountAlbumScrub && ALBUMS.length) {
    try {
      albumScrub = window.mountAlbumScrub(container, labelBuild.liveCanvas, labelBuild.liveCanvas.getContext("2d"), {
        albums: ALBUMS,
        drawDefaultLabel: (tgt, w, h) => tgt.drawImage(labelBuild.defaultLabelCanvas, 0, 0, w, h),
        onNeedsRedraw: () => { label.material.map.needsUpdate = true; },
        fadeDuration: 480,
        autoInterval: 2000
      });
    } catch (e) { albumScrub = null; }
  }

  const light = new THREE.PointLight("#f6f2ec", 100, 40, 2);
  light.position.set(-1.8, 2.2, 4.5);
  scene.add(light);
  scene.add(new THREE.AmbientLight("#3a3d46", 0.35));

  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const lightTarget = light.position.clone();
  const pointerTarget = light.position.clone();

  let pointerActive = false;
  let lastPointerMoveTime = 0;

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(interactionPlane, hit)) {
      pointerActive = true;
      lastPointerMoveTime = performance.now();
      pointerTarget.set(THREE.MathUtils.clamp(hit.x, -5, 5), THREE.MathUtils.clamp(hit.y, -5, 5), 4.5);
    }
  }
  function onPointerLeave() { pointerActive = false; }
  window.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.set(0, -3.6, 8.1).multiplyScalar(Math.max(1, 0.95 / camera.aspect));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  let frame, disposed = false, previousTime = performance.now();
  // skip drawing while the hero is scrolled out of view (the loop stays alive, the GPU rests)
  let onScreen = true, lastDraw = 0;
  const PHONE = window.matchMedia('(max-width:767px)').matches;
  const visibility = new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }, { rootMargin: "80px" });
  visibility.observe(container);
  /* rotation is driven from outside — the page's existing drag-to-spin/momentum/
     scratch-sound system (routes.js mountHome()) computes one angle per frame for
     every record on the page, CSS or WebGL alike, and calls setAngleDeg() with it.
     This mount also includes a smooth fallback internal spin if not driven externally. */
  let angleRad = 0;
  let hasExternalSpin = false;
  function setAngleDeg(deg) {
    hasExternalSpin = true;
    angleRad = deg * Math.PI / 180;
  }
  function animate(now) {
    if (disposed) return;
    // clamp at 0 as well: the first rAF timestamp can predate mount on a busy page, and a
    // negative step makes the light's smoothing extrapolate it off to infinity (dark disc)
    const dt = Math.max(0, Math.min((now - previousTime) / 1000, 0.05));
    previousTime = now;

    // The vinyl continues to spin smoothly
    if (!hasExternalSpin) {
      angleRad += (9 * Math.PI / 180) * dt;
    }
    record.rotation.z = -angleRad;

    // Dynamic light effect movement:
    // When pointer is not actively being moved, the light sweeps in a continuous,
    // organic orbital trajectory across the vinyl grooves, creating a dynamic moving sheen.
    if (pointerActive && (now - lastPointerMoveTime > 1800)) {
      pointerActive = false;
    }

    if (pointerActive) {
      lightTarget.copy(pointerTarget);
    } else {
      const tSec = now * 0.001;
      const speed = 0.85; // rad/s (sweeps across a quadrant every ~1.85s)
      const sweepRadius = 2.25 + 0.35 * Math.sin(tSec * 0.45);
      const lx = Math.cos(tSec * speed) * sweepRadius;
      const ly = Math.sin(tSec * speed) * (sweepRadius * 0.85);
      const lz = 4.3 + 0.6 * Math.sin(tSec * speed * 1.4);
      lightTarget.set(lx, ly, lz);
    }

    light.position.lerp(lightTarget, 1 - Math.exp(-6 * dt));

    // phones: draw at ~30fps, and not at all while the page is being scrolled, so the GPU
    // never competes with the scroll itself (iOS is very sensitive to this)
    const lean = PHONE && (now - lastDraw < 31 || now - (window.__lastScrollAt || 0) < 140);
    if (onScreen && !lean) {
      if (albumScrub) albumScrub.update(now);
      renderer.render(scene, camera); lastDraw = now;
    }
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);

  function cleanup() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibility.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    if (albumScrub) albumScrub.cleanup();
    const geometries = new Set(), materials = new Set();
    scene.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
    studio.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  return { cleanup, setAngleDeg };
}

window.mountVinyl = mountVinyl;

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(max-width:767px)').matches ? 1.5 : 1.75));
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
  let W = 1, H = 1, portrait = false, LIFT_Y = 0, SHIFT_X = 0;
  const STEP = new THREE.Vector3();
  const LEAN_X = -0.32, LEAN_Y = 0.26;
  function resize() {
    W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    portrait = W / H < 0.8;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    // the front record fills ~78% of the screen height (a phone: ~92% of its width), like the reference
    const D = portrait ? 6 / (0.74 * 2 * t * camera.aspect) : 6 / (0.78 * 2 * t);
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const z1 = D * (portrait ? 0.06 : 0.11);                  // the next record is this much closer
    const d1 = D - z1, visW = 2 * t * d1 * camera.aspect, visH = 2 * t * d1;
    // screen offset of the neighbour, as a share of the screen
    STEP.set(visW * (portrait ? 0.95 : 0.43), visH * (portrait ? 0.05 : 0.24), z1);
    LIFT_Y = 2 * t * D * (portrait ? -0.035 : 0.035);   // phones: a touch low, clear of the title block
    SHIFT_X = portrait ? 0 : 2 * t * D * camera.aspect * 0.06;   // leave the info panel on the left clear
    dirty = true;
  }

  /* ---- navigation ---- */
  let target = 0, visual = 0, active = -1, spinBoost = 0, dragOffset = 0;
  /* page scroll drives the first few records (the section pins while you scroll through
     them), the arrows/drag/keys move freely; whichever you used last, the other carries on
     from there rather than jumping back */
  let base = 0, lastS = 0;
  function goTo(i) {
    const t = Math.max(0, Math.min(N - 1, i));
    base = t - lastS;
    if (t === target && !dragOffset) return;
    target = t; dirty = true; wake();
  }
  function fromScroll(s) {
    lastS = s;
    const t = Math.max(0, Math.min(N - 1, Math.round(base + s)));
    if (t !== target) { target = t; dirty = true; wake(); }
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
      base = target - lastS;
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
      if (d < 0) { r.holder.position.z *= 1.9; r.holder.position.y *= 1.4; }   // records already passed sink back and down, clear of the text
      r.holder.position.y += LIFT_Y;
      r.holder.position.x += SHIFT_X;
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
  return { cleanup, goTo, next, prev, fromScroll, get active() { return target; } };
}
window.mountCrate = mountCrate;
