/* ============================================================
   PastForward — WebGL hover ripple for product photography
   (adapted from a reference build; classic script, no imports).
   ============================================================ */
function mountImageRipple(img) {
  if (!(img instanceof HTMLImageElement) || !img.parentNode) {
    throw new TypeError("Expected an <img> attached to a parent.");
  }
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: true, antialias: false, premultipliedAlpha: false, depth: false, stencil: false
  });
  if (!gl) return () => {};
  const resources = [];
  function compile(type, source) {
    const shader = gl.createShader(type);
    resources.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program = gl.createProgram();
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }
    `));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D u_image; uniform vec2 u_cursor; uniform float u_aspect; uniform float u_time; uniform float u_strength;
      varying vec2 v_uv;
      void main() {
        vec2 metric = vec2(u_aspect, 1.0);
        vec2 delta = (v_uv - u_cursor) * metric;
        float distanceToCursor = length(delta);
        vec2 direction = delta / max(distanceToCursor, 0.001);
        float envelope = exp(-distanceToCursor * 6.0);
        float wave = sin(distanceToCursor * 48.0 - u_time * 5.5);
        float centerFade = smoothstep(0.0, 0.035, distanceToCursor);
        vec2 displacement = direction / metric * wave * envelope * centerFade * 0.014 * u_strength;
        vec2 edge = smoothstep(vec2(0.0), vec2(0.07), v_uv) * smoothstep(vec2(0.0), vec2(0.07), 1.0 - v_uv);
        displacement *= edge.x * edge.y;
        vec2 uv = clamp(v_uv + displacement, 0.0, 1.0);
        gl_FragColor = texture2D(u_image, uv);
      }
    `));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    resources.forEach(shader => gl.deleteShader(shader));
    gl.deleteProgram(program);
    throw error;
  }
  resources.forEach(shader => gl.deleteShader(shader));
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {};
  for (const name of ["image", "cursor", "aspect", "time", "strength"]) uniforms[name] = gl.getUniformLocation(program, "u_" + name);
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.uniform1i(uniforms.image, 0);
  const wrapper = document.createElement("span");
  wrapper.style.cssText = "position:relative;display:inline-grid;max-width:100%;vertical-align:middle;";
  canvas.style.cssText = `position:absolute;display:none;pointer-events:none;border-radius:inherit;`;
  canvas.setAttribute("aria-hidden", "true");
  const originalOpacity = img.style.getPropertyValue("opacity");
  const originalOpacityPriority = img.style.getPropertyPriority("opacity");
  img.parentNode.insertBefore(wrapper, img);
  wrapper.append(img, canvas);
  let disposed = false, ready = false, frame = 0, sourceImage = null, sourceURL = "", hovered = false, strength = 0, lastTime = 0;
  const startTime = performance.now();
  const cursor = { x: 0.5, y: 0.5 }, target = { x: 0.5, y: 0.5 };
  function restoreOpacity() {
    if (originalOpacity) img.style.setProperty("opacity", originalOpacity, originalOpacityPriority);
    else img.style.removeProperty("opacity");
  }
  function resize() {
    if (disposed) return;
    const rect = img.getBoundingClientRect();
    const parentRect = wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.left = `${rect.left - parentRect.left}px`;
    canvas.style.top = `${rect.top - parentRect.top}px`;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.style.borderRadius = getComputedStyle(img).borderRadius;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.uniform1f(uniforms.aspect, width / height);
    wake();
  }
  function wake() { if (!disposed && ready && !frame) { lastTime = performance.now(); frame = requestAnimationFrame(render); } }
  function render(now) {
    frame = 0;
    if (disposed || !ready) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const easing = 1 - Math.exp(-9 * dt);
    strength += ((hovered ? 1 : 0) - strength) * easing;
    cursor.x += (target.x - cursor.x) * easing;
    cursor.y += (target.y - cursor.y) * easing;
    if (!hovered && strength < 0.001) strength = 0;
    gl.uniform2f(uniforms.cursor, cursor.x, cursor.y);
    gl.uniform1f(uniforms.strength, strength);
    gl.uniform1f(uniforms.time, (now - startTime) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (hovered || strength > 0) frame = requestAnimationFrame(render);
  }
  function onMove(event) {
    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    target.x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    target.y = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
    wake();
  }
  function onEnter(event) {
    hovered = true; onMove(event);
    if (strength === 0) { cursor.x = target.x; cursor.y = target.y; }
    wake();
  }
  function onLeave() { hovered = false; wake(); }
  function loadTexture() {
    if (disposed) return;
    const url = img.currentSrc || img.src;
    if (!url || url === sourceURL) return;
    sourceURL = url;
    if (sourceImage) sourceImage.onload = sourceImage.onerror = null;
    ready = false; canvas.style.display = "none"; restoreOpacity();
    const image = new Image();
    sourceImage = image;
    image.crossOrigin = img.crossOrigin === "use-credentials" ? "use-credentials" : "anonymous";
    image.onload = () => {
      if (disposed || sourceImage !== image) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        ready = true; resize();
        gl.uniform2f(uniforms.cursor, cursor.x, cursor.y);
        gl.uniform1f(uniforms.time, 0);
        gl.uniform1f(uniforms.strength, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        canvas.style.display = "block";
        img.style.setProperty("opacity", "0", "important");
      } catch (error) {
        ready = false; canvas.style.display = "none"; restoreOpacity();
        console.warn("Image ripple: texture upload failed.", error);
      }
    };
    image.onerror = () => { if (disposed || sourceImage !== image) return; console.warn("Image ripple: image could not be loaded."); };
    image.src = url;
  }
  img.addEventListener("pointerenter", onEnter);
  img.addEventListener("pointermove", onMove);
  img.addEventListener("pointerleave", onLeave);
  img.addEventListener("pointercancel", onLeave);
  img.addEventListener("load", loadTexture);
  const observer = new ResizeObserver(resize);
  observer.observe(img);
  window.addEventListener("resize", resize);
  resize();
  if (img.complete && img.naturalWidth) loadTexture();
  return function cleanup() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("resize", resize);
    img.removeEventListener("pointerenter", onEnter);
    img.removeEventListener("pointermove", onMove);
    img.removeEventListener("pointerleave", onLeave);
    img.removeEventListener("pointercancel", onLeave);
    img.removeEventListener("load", loadTexture);
    if (sourceImage) sourceImage.onload = sourceImage.onerror = null;
    restoreOpacity();
    if (img.parentNode === wrapper) wrapper.replaceWith(img); else wrapper.remove();
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
