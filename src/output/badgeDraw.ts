import type { Badge } from "../content/schema";

/**
 * Draws a struck enamel pin (BUILD.md §11): brass rim, flat colour, no gradient,
 * a slight bevel. This is the only place --brass appears. The same routine renders
 * the pin on the certificate and photo card so the artwork is identical everywhere.
 */

const BRASS = "#B8892B";
const BRASS_HI = "#D8B25C";
const BRASS_LO = "#8A651C";

export function drawBadgePin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  badge: Badge
): void {
  ctx.save();

  // Brass rim with a faceted bevel (flat top/bottom highlights, no gradient fill).
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = BRASS;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
  ctx.strokeStyle = BRASS_HI;
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.strokeStyle = BRASS_LO;
  ctx.stroke();

  // Enamel face — flat colour, inset from the rim.
  const faceR = r * 0.82;
  ctx.beginPath();
  ctx.arc(cx, cy, faceR, 0, Math.PI * 2);
  ctx.fillStyle = badge.colour;
  ctx.fill();

  // Motif glyph, centred.
  ctx.fillStyle = "#F7F5EE";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(faceR * 1.1)}px "Arial Narrow", "Oswald", sans-serif`;
  ctx.fillText(badge.motif, cx, cy + faceR * 0.04);

  ctx.restore();
}
