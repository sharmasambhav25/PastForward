/* ============================================================
   PastForward — live custom-label preview (adapted from a reference
   build; classic script, no imports). Renders a real printed-label
   mockup that updates live from the CUSTOM page's own Artist/Album
   fields — no duplicate inputs, the actual order form drives it.
   ============================================================ */
function mountVinylLabel(container, { artist = "", title = "" } = {}) {
  if (!(container instanceof HTMLElement)) throw new TypeError("Expected a DOM container.");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.style.cssText = "display:block;width:100%;aspect-ratio:1;border-radius:50%;box-shadow:0 30px 70px rgba(0,0,0,.5)";
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable.");
  container.appendChild(canvas);

  const SIZE = 640, CENTER = SIZE / 2, INK = "#181714";
  let disposed = false, current = { artist, title };

  function ring(radius, lineWidth = 1) {
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, radius, 0, Math.PI * 2);
    ctx.lineWidth = lineWidth; ctx.strokeStyle = INK; ctx.stroke();
  }
  function fittedText(text, y, maxWidth, initialSize, bold = false) {
    let size = initialSize;
    const setFont = () => { ctx.font = `${bold ? "bold " : ""}${size}px Georgia, "Times New Roman", serif`; };
    setFont();
    while (size > 12 && ctx.measureText(text).width > maxWidth) { size -= 1; setFont(); }
    ctx.fillText(text, CENTER, y, maxWidth);
  }
  function draw() {
    if (disposed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = Math.round(SIZE * dpr);
    if (canvas.width !== pixels || canvas.height !== pixels) { canvas.width = canvas.height = pixels; }
    ctx.setTransform(pixels / SIZE, 0, 0, pixels / SIZE, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    // PastForward's real crimson label, not generic cream — matches the rest of the site.
    const grad = ctx.createRadialGradient(390, 330, 60, CENTER, CENTER, 320);
    grad.addColorStop(0, "#9C2A36"); grad.addColorStop(0.56, "#83202B"); grad.addColorStop(1, "#611420");
    ctx.beginPath(); ctx.arc(CENTER, CENTER, 302, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ring(287, 2); ring(279, 0.75);
    ctx.globalAlpha = 0.3; ring(63, 1); ring(67, 0.5); ctx.globalAlpha = 1;
    ctx.fillStyle = "#f3efe8";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = '17px Georgia, "Times New Roman", serif';
    ctx.fillText("PASTFORWARD · ESTD 2025", CENTER, 113);
    const artistText = (current.artist || "Your artist").toUpperCase();
    fittedText(artistText, 204, 452, 44, true);
    ctx.beginPath(); ctx.moveTo(210, 249); ctx.lineTo(430, 249); ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(243,239,232,.55)"; ctx.stroke();
    ctx.fillStyle = "#f3efe8";
    ctx.font = '16px Georgia, "Times New Roman", serif';
    ctx.fillText("SIDE A", 169, CENTER);
    ctx.fillText("33⅓ RPM", 471, CENTER);
    fittedText(current.title || "Your album or track", 432, 452, 36);
    ctx.font = '14px Georgia, "Times New Roman", serif';
    ctx.fillText("NOT FOR PLAYBACK", CENTER, 505);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(CENTER, CENTER, 17, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    canvas.setAttribute("aria-label", `Preview of your custom label. Artist: ${current.artist || "not entered yet"}. Album or track: ${current.title || "not entered yet"}.`);
  }
  const onResize = () => draw();
  window.addEventListener("resize", onResize);
  draw();
  return {
    update(artist, title) { current = { artist, title }; draw(); },
    cleanup() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener("resize", onResize);
      canvas.remove();
    }
  };
}
