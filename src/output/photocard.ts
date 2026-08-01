/**
 * Photo card render (BUILD.md §10). 4:5 PNG, optional, separate from the
 * certificate. Four to six of the day's photos in the Flumlunk frame with venue
 * and date. Rendered on-device, never uploaded, no share link.
 */

export const PC_W = 1080;
export const PC_H = 1350;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

export async function renderPhotoCardPng(
  photoUrls: string[],
  venue: string,
  dateText: string
): Promise<Blob> {
  // Four to six photos (§10). Trim to the range; caller decides which.
  const urls = photoUrls.slice(0, 6);
  const enamel = "#0F5C3F";
  const chalk = "#F7F5EE";

  const canvas = document.createElement("canvas");
  canvas.width = PC_W;
  canvas.height = PC_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  ctx.fillStyle = enamel;
  ctx.fillRect(0, 0, PC_W, PC_H);

  // Header.
  ctx.fillStyle = chalk;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 56px "Oswald", "Arial Narrow", sans-serif`;
  ctx.fillText(venue.toUpperCase(), PC_W / 2, 84);

  const images = await Promise.all(urls.map((u) => loadImage(u)));
  const cols = images.length <= 2 ? 1 : 2;
  const rows = Math.ceil(images.length / cols);
  const pad = 28;
  const gridTop = 140;
  const gridBottom = PC_H - 130;
  const cellW = (PC_W - pad * (cols + 1)) / cols;
  const cellH = (gridBottom - gridTop - pad * (rows - 1)) / rows;

  images.forEach((img, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = pad + c * (cellW + pad);
    const y = gridTop + r * (cellH + pad);
    ctx.fillStyle = chalk;
    ctx.fillRect(x - 6, y - 6, cellW + 12, cellH + 12);
    drawCover(ctx, img, x, y, cellW, cellH);
  });

  // Footer with date + wordmark.
  ctx.fillStyle = chalk;
  ctx.font = `600 30px "Inter", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(dateText, pad, PC_H - 64);
  ctx.textAlign = "right";
  ctx.font = `700 34px "Oswald", "Arial Narrow", sans-serif`;
  ctx.fillText("FLUMLUNK", PC_W - pad, PC_H - 64);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png");
  });
}
