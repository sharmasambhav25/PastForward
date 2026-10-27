/* ============================================================
   PastForward — WebGL hero disc (adapted from a reference build).
   Self-hosted Three.js (no CDN — see build.py, which rewrites the
   import below to a data: URI of vendor/three.module.min.js so the
   page has zero runtime network dependency). The label texture uses
   only PastForward's own real microcopy — no invented track titles.
   ============================================================ */
import * as THREE from "__THREE_IMPORT__";

export function mountVinyl(container) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("mountVinyl requires a DOM container.");
  }
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

  /* the printed centre label — PastForward's own microcopy only, no invented track listing.
     Built once onto `defaultLabelCanvas` (the procedural grain/text render is deterministic,
     so there's no reason to redo it later); `liveCanvas` starts as a copy of that and is the
     canvas actually mapped onto the mesh — the hover "album scrub" feature below repaints
     liveCanvas and can always crossfade back to defaultLabelCanvas without recomputing it. */
  function makeLabelMaps() {
    // PastForward's real label is crimson, not paper — match the CSS disc elsewhere on the site.
    const defaultLabelCanvas = makeCanvas(1024);
    const ctx = defaultLabelCanvas.getContext("2d");
    const grad = ctx.createRadialGradient(390, 330, 60, 512, 512, 620);
    grad.addColorStop(0, "#9C2A36"); grad.addColorStop(0.56, "#83202B"); grad.addColorStop(1, "#611420");
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
    ctx.textAlign = "center";
    ctx.fillStyle = "#f3efe8";
    ctx.font = "bold 58px Georgia, serif";
    ctx.fillText("PASTFORWARD", 512, 470);
    ctx.font = "18px Georgia, serif";
    ctx.fillText("ESTD 2025", 512, 508);

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
  hole.absarc(0, 0, 0.085, 0, Math.PI * 2, true);
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
  const surface = new THREE.Mesh(new THREE.RingGeometry(0.085, 2.992, 256), vinylMaterial);
  surface.position.z = 0.030;
  record.add(surface);

  const labelBuild = makeLabelMaps();
  /* the label is printed paper: show the art at its true colour (emissive, not tone-mapped)
     and let the moving light add a little on top, instead of the art only existing where lit */
  const label = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.965, 192), new THREE.MeshStandardMaterial({
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

    if (albumScrub) albumScrub.update(now);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);

  function cleanup() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
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
