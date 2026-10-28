/* ============================================================
   PastForward — liquid backdrop for the product page.
   The album art as a slow, flowing colour field, behind the page,
   pouring down from the top with a live lower edge: it swells and ripples on its own,
   rises into a mound toward the pointer, and the art ripples where
   the pointer moves through it. As you scroll, the liquid floods up
   behind the content. Plain WebGL 1, no libraries.

   mountLiquid(host, imageUrl, { round, reducedMotion }) → { cleanup }
   ============================================================ */
function mountLiquid(host, imageUrl, opts) {
  opts = opts || {};
  var RM = !!opts.reducedMotion;
  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) { canvas.remove(); return null; }

  var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FS = [
    'precision highp float;',
    'uniform sampler2D uTex; uniform vec2 uRes; uniform float uTime, uEdge, uMound, uMoundX, uMotion, uDpr, uBlur;',
    'uniform vec3 uDrops[6];',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }',
    'void main(){',
    '  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;   // CSS px, from the top-left',
    '  vec2 res = uRes / uDpr;',
    '  float t = uTime * uMotion;',
    '  float x = px.x;',
    // the surface: a slow swell, waves travelling across, a fine torn texture, and the pointer's pull
    '  float e = uEdge;',
    '  e += (fbm(vec2(x * 0.0026 + t * 0.07, t * 0.05)) - 0.5) * 120.0;',
    '  e += sin(x * 0.011 - t * 1.3) * 7.0 + sin(x * 0.023 + t * 0.9) * 4.0;',
    '  e += (noise(vec2(x * 0.11, t * 0.6)) - 0.5) * 5.0;',
    '  e += uMound * exp(-pow((x - uMoundX) / (res.x * 0.11 + 60.0), 2.0));   // reaches down toward the pointer',
    '  float d = e - px.y;                                    // >0: inside the liquid (above the edge)',
    '  float inside = smoothstep(-1.0, 1.0, d);',
    '  if (inside <= 0.0) { gl_FragColor = vec4(0.0); return; }',
    // the art, flowing: domain-warped, rippled by the pointer
    '  vec2 uv = px / res;',
    '  vec2 q = vec2(uv.x * res.x / res.y, uv.y);',
    '  vec2 w = vec2(fbm(q * 1.4 + vec2(t * 0.05, -t * 0.04)), fbm(q * 1.4 + vec2(5.2 - t * 0.04, 1.3 + t * 0.06)));',
    '  uv += (w - 0.5) * 0.09 * uMotion;',
    '  for (int i = 0; i < 6; i++) {',
    '    vec2 dv = px - uDrops[i].xy; float age = uTime - uDrops[i].z; float r = length(dv);',
    '    float ring = sin(r * 0.055 - age * 8.0) * exp(-age * 1.4) * exp(-r * 0.0065) * step(0.0, age) * step(age, 4.0);',
    '    uv += (dv / (r + 1.0)) * ring * 0.014 * uMotion;',
    '  }',
    // cover-fit the square art to the screen, a little parallax as the liquid rises
    '  vec2 st = uv - 0.5; float va = res.x / res.y;',
    '  if (va > 1.0) st.y /= va; else st.x *= va;',
    '  st *= 0.92; st.y -= (uEdge / res.y) * 0.06; st += 0.5;',
    '  vec3 c = texture2D(uTex, st, uBlur).rgb;                 // soft: the art is only 480px',
    '  vec3 c2 = texture2D(uTex, st + (w - 0.5) * 0.05, uBlur + 1.4).rgb;',
    '  c = mix(c, c2, 0.45);',
    '  float l = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c = mix(vec3(l), c, 1.25);                             // a touch richer',
    '  c = c / (1.0 + c * 0.9);                               // tame the brightest parts of the art',
    '  c *= 0.95;                                             // kept dark so the page reads on top',
    '  c *= 1.0 - 0.35 * exp(-d * 0.018);                      // a little shade along the leading edge',
    '  float rim = exp(-abs(d) * 0.45);',
    '  c += rim * vec3(0.95, 0.9, 0.86) * 0.22;                // a bright meniscus on the edge',
    '  gl_FragColor = vec4(c * inside, inside);',
    '}'
  ].join('\n');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var prog = gl.createProgram();
  try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); }
  catch (err) { canvas.remove(); return null; }
  gl.linkProgram(prog); gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uTex', 'uRes', 'uTime', 'uEdge', 'uMound', 'uMoundX', 'uMotion', 'uDpr', 'uDrops', 'uBlur'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  /* texture: the art drawn into a 512² canvas (power of two → mipmaps → cheap soft blur);
     round label art is cropped to its middle so the white corners never show */
  var tex = gl.createTexture();
  var ready = false;
  var img = new Image();
  img.onload = function () {
    var c = document.createElement('canvas'); c.width = c.height = 512;
    var x = c.getContext('2d'), k = opts.round ? 0.68 : 1;
    var sw = img.naturalWidth * k, sh2 = img.naturalHeight * k;
    x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh2) / 2, sw, sh2, 0, 0, 512, 512);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    ready = true; wake();
  };
  img.src = imageUrl;

  /* state: the surface sits low on the first screen and floods up as you scroll */
  var W = 1, H = 1, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
    wake();
  }
  // the liquid hangs in from the top, then pours down the page as you scroll
  var edgeFor = function () { return Math.min(H + 160, H * 0.2 + scrollY * 0.85); };
  var edge = edgeFor();
  var mx = -9999, my = -9999, lastPX = 0, lastPY = 0, lastDrop = 0, pointerAt = 0;
  var mound = 0, moundX = innerWidth / 2;
  var drops = new Float32Array(18); for (var i = 0; i < 6; i++) drops[i * 3 + 2] = -99;
  var dropI = 0, t0 = performance.now();

  function onMove(e) {
    mx = e.clientX; my = e.clientY; pointerAt = performance.now();
    var v = Math.hypot(mx - lastPX, my - lastPY); lastPX = mx; lastPY = my;
    var now = (performance.now() - t0) / 1000;
    // moving through the liquid leaves ripples
    if (!RM && v > 6 && my < edge && performance.now() - lastDrop > 140) {
      lastDrop = performance.now();
      drops[dropI * 3] = mx; drops[dropI * 3 + 1] = my; drops[dropI * 3 + 2] = now;
      dropI = (dropI + 1) % 6;
    }
    wake();
  }
  function onScroll() { wake(); }

  var raf = 0, visible = !document.hidden, last = performance.now(), disposed = false;
  function wake() { if (!raf && visible && !disposed) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    var goal = edgeFor();
    edge += (goal - edge) * (RM ? 1 : 1 - Math.exp(-dt * 7));
    // the surface reaches up toward the pointer when it's near (and lets go when it leaves)
    var near = (now - pointerAt < 2500) ? Math.exp(-Math.abs(my - edge) / 230) : 0;
    var want = RM ? 0 : (my > edge ? 1 : 0.45) * near * Math.min(150, H * 0.18);
    mound += (want - mound) * (1 - Math.exp(-dt * 3.2));
    moundX += (mx - moundX) * (1 - Math.exp(-dt * 4.5));
    if (ready) {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1i(U.uTex, 0);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, (now - t0) / 1000);
      gl.uniform1f(U.uEdge, edge);
      gl.uniform1f(U.uMound, mound);
      gl.uniform1f(U.uMoundX, moundX);
      gl.uniform1f(U.uMotion, RM ? 0 : 1);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uBlur, W < 768 ? 4.4 : 3.4);           // phones see the art much larger, so blur it more
      gl.uniform3fv(U.uDrops, drops);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!RM || Math.abs(goal - edge) > 0.5) raf = requestAnimationFrame(frame);
  }
  function onVis() { visible = !document.hidden; if (visible) { last = performance.now(); wake(); } else { cancelAnimationFrame(raf); raf = 0; } }

  resize();
  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('visibilitychange', onVis);

  return { cleanup: function () {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize); removeEventListener('scroll', onScroll);
    removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis);
    try { gl.deleteTexture(tex); gl.deleteBuffer(buf); gl.deleteProgram(prog); var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) {}
    canvas.remove();
  } };
}
window.mountLiquid = mountLiquid;
