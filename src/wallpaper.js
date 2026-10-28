/* ============================================================
   PastForward — live wallpaper (WebGL 1, no libraries).
   A slow, generative backdrop that drifts on its own and bends
   around the pointer. Four looks share one moving height field:

     contours  topographic lines, every sixth one in oxblood
               (the default: they read like a record's grooves)
     dots      a rippling grid of points
     chrome    liquid metal
     blobs     soft drifting colour

   mountWallpaper(host, { mode, focus:[x,y], reducedMotion }) → { cleanup, setMode }
   focus: where the subject sits (0..1), kept a little brighter so a
   black record never disappears into a black background.
   ============================================================ */
function mountWallpaper(host, opts) {
  opts = opts || {};
  var RM = !!opts.reducedMotion;
  var MODES = { contours: 0, dots: 1, chrome: 2, blobs: 3 };
  var mode = MODES[opts.mode] != null ? MODES[opts.mode] : 0;
  var focus = opts.focus || [0.56, 0.5];

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(canvas);
  var gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return null; }
  var deriv = gl.getExtension('OES_standard_derivatives');

  var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FS = [
    deriv ? '#extension GL_OES_standard_derivatives : enable' : '',
    'precision highp float;',
    'uniform vec2 uRes, uPtr, uFocus; uniform float uTime, uMode, uPtrAmt, uDpr;',
    'const vec3 INK = vec3(0.024, 0.02, 0.024);',
    'const vec3 CREAM = vec3(0.953, 0.937, 0.91);',
    'const vec3 OX = vec3(0.753, 0.208, 0.247);',
    'vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1,0)), f - vec2(1,0)), u.x),',
    '             mix(dot(hash2(i + vec2(0,1)), f - vec2(0,1)), dot(hash2(i + vec2(1,1)), f - vec2(1,1)), u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 r = mat2(0.8, -0.6, 0.6, 0.8);',
    '  for (int i = 0; i < 4; i++){ v += a * noise(p); p = r * p * 2.02 + 3.1; a *= 0.5; } return v; }',
    // the moving surface, plus a soft swell under the pointer
    'float field(vec2 q, float t){',
    '  vec2 w = vec2(fbm(q * 0.9 + vec2(t * 0.05, -t * 0.04)), fbm(q * 0.9 + vec2(4.7 - t * 0.03, 1.9 + t * 0.05)));',
    '  float h = fbm(q * 1.1 + w * 1.6 + vec2(0.0, t * 0.02));',
    '  vec2 d = q - uPtr; h += uPtrAmt * 0.42 * exp(-dot(d, d) * 3.2);',
    '  return h;',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float asp = uRes.x / uRes.y;',
    '  vec2 q = vec2(uv.x * asp, uv.y) * 1.6;',
    '  float t = uTime;',
    '  float h = field(uMode < 0.5 ? q * 0.62 : q, t);',
    '  vec3 col;',
    '  vec2 fq = vec2(uFocus.x * asp, 1.0 - uFocus.y) * 1.6;',
    '  float pool = exp(-dot(q - fq, q - fq) * 0.55);       // the lit area behind the front record',
    '  if (uMode < 0.5) {',
    // contours: lines at fixed heights; every 6th is an index line in oxblood
    '    float n = 30.0, k = h * n;',
    '    float fw = ' + (deriv ? 'max(fwidth(k), 1e-4)' : '0.02 * uDpr') + ';',
    '    float dl = abs(fract(k + 0.5) - 0.5) / fw;',
    '    float line = 1.0 - smoothstep(0.55, 1.6, dl);',
    '    float idx = step(abs(mod(floor(k + 0.5), 7.0)), 0.5);',
    '    vec3 lc = mix(CREAM * 0.58, OX * 0.9, idx * 0.8);',
    '    col = mix(INK + vec3(0.03) * pool, lc, line * (0.55 + 0.45 * pool));',
    '  } else if (uMode < 1.5) {',
    // dots: a grid of points lifted and brightened by the surface
    '    float cell = 15.0 * uDpr;',
    '    vec2 g = gl_FragCoord.xy + vec2(0.0, h * 140.0 * uDpr);',
    '    vec2 c = (fract(g / cell) - 0.5) * cell;',
    '    float r = (0.6 + 2.2 * smoothstep(-0.15, 0.5, h)) * uDpr;',
    '    float dot_ = 1.0 - smoothstep(r - 0.8, r + 0.8, length(c));',
    '    float lum = 0.08 + 0.92 * smoothstep(-0.1, 0.55, h);',
    '    col = INK + vec3(0.03) * pool + dot_ * CREAM * lum * (0.6 + 0.4 * pool);',
    '  } else if (uMode < 2.5) {',
    // chrome: shade the surface's normal against a soft studio
    '    float e = 0.004;',
    '    float hx = field(q + vec2(e, 0.0), t) - h, hy = field(q + vec2(0.0, e), t) - h;',
    '    vec3 nrm = normalize(vec3(-hx / e, -hy / e, 2.2));',
    '    vec3 r = reflect(vec3(0.0, 0.0, -1.0), nrm);',
    '    float sky = smoothstep(-0.3, 0.9, r.y) * 0.75 + 0.25 * smoothstep(0.2, 1.0, r.x);',
    '    float spec = pow(max(dot(r, normalize(vec3(-0.4, 0.6, 0.7))), 0.0), 40.0);',
    '    col = mix(vec3(0.08, 0.075, 0.08), vec3(0.62, 0.6, 0.6), sky) + spec * 0.8;',
    '    col += OX * 0.10 * smoothstep(0.4, -0.4, r.y);     // a faint oxblood bounce from below',
    '    col *= 0.72 + 0.28 * pool;',
    '  } else {',
    // blobs: soft colour fields
    '    float b = smoothstep(-0.35, 0.45, h);',
    '    col = mix(INK, mix(vec3(0.33, 0.07, 0.1), vec3(0.62, 0.55, 0.52), smoothstep(0.4, 1.0, b)), b);',
    '    col *= 0.75 + 0.35 * pool;',
    '  }',
    '  float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(asp, 1.0)));',
    '  float quiet = asp > 1.0 ? mix(0.42, 1.0, smoothstep(0.08, 0.36, uv.x)) : mix(0.5, 1.0, smoothstep(0.82, 0.62, uv.y));',
    '  quiet *= mix(0.55, 1.0, smoothstep(0.02, 0.2, uv.y));',
    '  col = mix(INK, col, quiet);',
    '  col *= 0.6 + 0.4 * vig;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  try { gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS)); }
  catch (e) { canvas.remove(); return null; }
  gl.linkProgram(prog); gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uRes', 'uPtr', 'uFocus', 'uTime', 'uMode', 'uPtrAmt', 'uDpr'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  var dpr = 1, W = 1, H = 1;
  function resize() {
    var r = host.getBoundingClientRect();
    // the wallpaper is soft, so it renders below full resolution to stay cheap on phones
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); draw(performance.now());
  }

  // pointer, eased; in the shader's coordinates
  var ptr = [focus[0], 0.5], ptrGoal = [focus[0], 0.5], amt = 0, amtGoal = 0, lastMove = 0;
  function onMove(e) {
    var r = host.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    var asp = r.width / r.height;
    ptrGoal[0] = (e.clientX - r.left) / r.width * asp * 1.6;
    ptrGoal[1] = (1 - (e.clientY - r.top) / r.height) * 1.6;
    amtGoal = 1; lastMove = performance.now(); wake();
  }
  function onLeave() { amtGoal = 0; }

  var t0 = performance.now(), last = t0, raf = 0, visible = false, disposed = false;
  function draw(now) {
    var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    if (now - lastMove > 2500) amtGoal = 0;
    amt += (amtGoal - amt) * (1 - Math.exp(-dt * 2.5));
    ptr[0] += (ptrGoal[0] - ptr[0]) * (1 - Math.exp(-dt * 4));
    ptr[1] += (ptrGoal[1] - ptr[1]) * (1 - Math.exp(-dt * 4));
    gl.uniform2f(U.uRes, W, H);
    gl.uniform2f(U.uPtr, ptr[0], ptr[1]);
    gl.uniform2f(U.uFocus, focus[0], focus[1]);
    gl.uniform1f(U.uTime, RM ? 7.0 : (now - t0) / 1000);
    gl.uniform1f(U.uMode, mode);
    gl.uniform1f(U.uPtrAmt, RM ? 0 : amt);
    gl.uniform1f(U.uDpr, dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) { raf = 0; draw(now); if (!RM && visible && !disposed) raf = requestAnimationFrame(frame); }
  function wake() { if (!raf && visible && !disposed && !RM) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { if (RM) draw(performance.now()); else wake(); } });
  io.observe(host);
  var ro = new ResizeObserver(resize); ro.observe(host);
  function onVis() { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); }
  document.addEventListener('visibilitychange', onVis);
  addEventListener('pointermove', onMove, { passive: true });
  host.parentElement.addEventListener('pointerleave', onLeave);
  resize();

  return {
    setMode: function (m) { if (MODES[m] != null) { mode = MODES[m]; draw(performance.now()); } },
    cleanup: function () {
      if (disposed) return; disposed = true;
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('pointermove', onMove);
      if (host.parentElement) host.parentElement.removeEventListener('pointerleave', onLeave);
      try { gl.deleteBuffer(buf); gl.deleteProgram(prog); var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) {}
      canvas.remove();
    }
  };
}
window.mountWallpaper = mountWallpaper;
