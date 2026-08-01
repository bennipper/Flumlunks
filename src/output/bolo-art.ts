/**
 * A flat, enamel-style illustration of Bolo (BUILD.md §10, §11) drawn with canvas
 * primitives — the plush character with a rucksack. Kept deliberately simple and
 * flat so it reads like signage, not clip-art.
 */
export function drawBolo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number
): void {
  const ink = "#10261E";
  const body = "#0F5C3F";
  const belly = "#F7F5EE";
  const pack = "#E8541F";

  ctx.save();
  ctx.translate(cx, cy);

  // Rucksack strap hint behind body.
  ctx.strokeStyle = ink;
  ctx.lineWidth = s * 0.06;

  // Body.
  ctx.fillStyle = body;
  roundedRect(ctx, -s * 0.55, -s * 0.35, s * 1.1, s * 1.15, s * 0.35);
  ctx.fill();

  // Belly patch.
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.28, s * 0.32, s * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(-s * 0.42, -s * 0.42, s * 0.22, 0, Math.PI * 2);
  ctx.arc(s * 0.42, -s * 0.42, s * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Head.
  ctx.beginPath();
  ctx.arc(0, -s * 0.2, s * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Face patch.
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.08, s * 0.32, s * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes + nose.
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(-s * 0.16, -s * 0.2, s * 0.055, 0, Math.PI * 2);
  ctx.arc(s * 0.16, -s * 0.2, s * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, -s * 0.02);
  ctx.lineTo(s * 0.06, -s * 0.02);
  ctx.lineTo(0, s * 0.05);
  ctx.closePath();
  ctx.fill();

  // Rucksack over one shoulder.
  ctx.fillStyle = pack;
  roundedRect(ctx, s * 0.28, s * 0.02, s * 0.4, s * 0.5, s * 0.1);
  ctx.fill();
  ctx.fillStyle = "#F7F5EE";
  roundedRect(ctx, s * 0.36, s * 0.14, s * 0.24, s * 0.12, s * 0.04);
  ctx.fill();

  ctx.restore();
}

/** Bolo's paw print — the certificate signature (BUILD.md §10). */
export function drawPawPrint(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  colour = "#10261E"
): void {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.ellipse(0, s * 0.25, s * 0.5, s * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  const toes = [
    [-s * 0.42, -s * 0.3],
    [-s * 0.15, -s * 0.5],
    [s * 0.15, -s * 0.5],
    [s * 0.42, -s * 0.3],
  ];
  for (const [x, y] of toes) {
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.16, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
