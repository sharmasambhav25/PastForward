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
  canvas.style.cssText = "display:block;width:100%;height:100%;";
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

  function makeVinylMaps() {
    const size = 2048;
    const colorCanvas = makeCanvas(size);
    const bumpCanvas = makeCanvas(size);
    const roughCanvas = makeCanvas(size);
    const color = colorCanvas.getContext("2d");
    const bump = bumpCanvas.getContext("2d");
    const rough = roughCanvas.getContext("2d");
    color.fillStyle = "#151619"; color.fillRect(0, 0, size, size);
    bump.fillStyle = "#808080"; bump.fillRect(0, 0, size, size);
    rough.fillStyle = "#888888"; rough.fillRect(0, 0, size, size);
    const center = size / 2, px = size / 6;
    function ring(ctx, radius, width, stroke) {
      ctx.beginPath(); ctx.arc(center, center, radius * px, 0, Math.PI * 2);
      ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.stroke();
    }
    for (let r = 1.035; r < 2.965; r += 0.0038 + random() * 0.002) {
      const v = 17 + Math.floor(random() * 13);
      ring(color, r, 0.55 + random() * 0.65, `rgb(${v},${v + 1},${v + 3})`);
      ring(bump, r, 0.65 + random() * 0.5, `rgb(${45 + random() * 40},${45 + random() * 40},${45 + random() * 40})`);
      ring(rough, r, 0.8, random() > 0.5 ? "#b5b5b5" : "#696969");
    }
    for (const radius of [1.39, 1.79, 2.18, 2.57]) {
      ring(color, radius, 3.2, "#111216"); ring(bump, radius, 3.2, "#808080");
      ring(rough, radius, 3.2, "#626262"); ring(bump, radius + 0.008, 0.8, "#444444");
    }
    for (const radius of [0.985, 1.004, 1.023, 2.975, 2.985]) {
      ring(bump, radius, 1, "#424242"); ring(color, radius, 1, "#25262a");
    }
    for (let i = 0; i < 95; i++) {
      const radius = (1.08 + random() * 1.84) * px, angle = random() * Math.PI * 2;
      color.beginPath();
      color.arc(center, center, radius, angle, angle + 0.006 + random() * 0.055);
      color.lineWidth = 0.35; color.strokeStyle = `rgba(150,155,165,${0.025 + random() * 0.055})`;
      color.stroke();
    }
    return { map: textureFrom(colorCanvas, true), bumpMap: textureFrom(bumpCanvas), roughnessMap: textureFrom(roughCanvas) };
  }

  /* the printed centre label — PastForward's own microcopy only, no invented track listing */
  function makeLabelMaps() {
    // PastForward's real label is crimson, not paper — match the CSS disc elsewhere on the site.
    const c = makeCanvas(1024);
    const ctx = c.getContext("2d");
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
    ctx.fillStyle = "rgba(243,239,232,.55)";
    ctx.fillRect(392, 540, 240, 4);
    ctx.fillStyle = "#f3efe8";
    ctx.font = "17px sans-serif";
    ctx.fillText("33⅓ RPM  ·  NOT FOR PLAYBACK", 512, 580);
    return { map: textureFrom(c, true), bumpMap: textureFrom(height) };
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
  const body = new THREE.Mesh(bodyGeometry, new THREE.MeshPhysicalMaterial({
    color: "#090a0c", roughness: 0.25, metalness: 0.03, clearcoat: 0.4, clearcoatRoughness: 0.2
  }));
  record.add(body);

  const vinylMaterial = new THREE.MeshPhysicalMaterial({
    ...makeVinylMaps(), color: "#ffffff", metalness: 0.04, roughness: 0.52,
    bumpScale: 0.011, clearcoat: 0.28, clearcoatRoughness: 0.24, ior: 1.48
  });
  const surface = new THREE.Mesh(new THREE.RingGeometry(0.085, 2.992, 256), vinylMaterial);
  surface.position.z = 0.030;
  record.add(surface);

  const label = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.965, 192), new THREE.MeshStandardMaterial({
    ...makeLabelMaps(), roughness: 0.92, metalness: 0, bumpScale: 0.0012
  }));
  label.position.z = 0.034;
  record.add(label);

  const light = new THREE.PointLight("#fff1da", 95, 40, 2);
  light.position.set(-1.8, 2.2, 4.5);
  scene.add(light);
  scene.add(new THREE.AmbientLight("#3a3d46", 1.1));

  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const lightTarget = light.position.clone();
  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(interactionPlane, hit)) {
      lightTarget.set(THREE.MathUtils.clamp(hit.x, -5, 5), THREE.MathUtils.clamp(hit.y, -5, 5), 4.5);
    }
  }
  function onPointerLeave() { lightTarget.set(-1.8, 2.2, 4.5); }
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
     This mount never spins on its own, so it never fights that system. */
  let angleRad = 0;
  function setAngleDeg(deg) { angleRad = deg * Math.PI / 180; }
  function animate(now) {
    if (disposed) return;
    const dt = Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    record.rotation.z = -angleRad;
    light.position.lerp(lightTarget, 1 - Math.exp(-9 * dt));
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
    const geometries = new Set(), materials = new Set();
    scene.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  return { cleanup, setAngleDeg };
}

window.mountVinyl = mountVinyl;
