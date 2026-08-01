import type { Badge, Pack } from "../content/schema";
import type { Visit } from "../visit/machine";
import { badgesFor, pickTitle } from "./titles";
import { drawBadgePin } from "./badgeDraw";
import { drawBolo, drawPawPrint } from "./bolo-art";
import { buildImagePdf } from "./pdf";

/**
 * Certificate render (BUILD.md §10). 4:5 PNG (1080×1350) primary, A4 PDF secondary.
 * Designed to be posted: it must read like something a zoo would issue. The model
 * is separated from the drawing so the "no counts, no fractions, no percentages"
 * rule (§2, §14) can be asserted without a canvas.
 */

export const CERT_W = 1080;
export const CERT_H = 1350;

export type CertificateModel = {
  name: string;
  title: string;
  dateText: string;
  venue: string;
  learned: string[];
  badges: Badge[];
  wordmark: string;
};

function longDate(iso: string): string {
  // Long form, no slashes — a "01/08/2026" would read as a fraction (§14).
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function certificateModel(visit: Visit, pack: Pack): CertificateModel {
  const name = visit.childFirstName?.trim() || "My";
  return {
    name,
    title: pickTitle(visit.badges, pack),
    dateText: longDate(visit.startedAt),
    venue: pack.venueName,
    // Three things I learned, drawn from learned[], so no two match (§10).
    learned: visit.learned.slice(0, 3),
    badges: badgesFor(visit.badges, pack),
    wordmark: "FLUMLUNK",
  };
}

/** Every text string that will be drawn, for testing the no-count rule (§14). */
export function certificateStrings(model: CertificateModel): string[] {
  return [
    model.name,
    model.title,
    model.dateText,
    model.venue,
    ...model.learned,
    ...model.badges.map((b) => b.name),
    model.wordmark,
    "Three things I learned",
  ];
}

function displayFont(px: number, weight = 700): string {
  return `${weight} ${px}px "Oswald", "Arial Narrow", "Roboto Condensed", sans-serif`;
}
function bodyFont(px: number, weight = 400): string {
  return `${weight} ${px}px "Inter", system-ui, sans-serif`;
}

export function drawCertificate(
  ctx: CanvasRenderingContext2D,
  model: CertificateModel
): void {
  const ink = "#10261E";
  const enamel = "#0F5C3F";
  const chalk = "#F7F5EE";
  const slate = "#5C6B63";

  // Background + inner keyline (enamel sign vernacular).
  ctx.fillStyle = chalk;
  ctx.fillRect(0, 0, CERT_W, CERT_H);
  ctx.strokeStyle = enamel;
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, CERT_W - 80, CERT_H - 80);

  // Header bar.
  ctx.fillStyle = enamel;
  ctx.fillRect(40, 40, CERT_W - 80, 150);
  ctx.fillStyle = chalk;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = displayFont(58);
  ctx.fillText(model.venue.toUpperCase(), CERT_W / 2, 100);
  ctx.font = bodyFont(24, 600);
  ctx.fillText("A DAY WITH BOLO", CERT_W / 2, 150);

  // Bolo illustration.
  drawBolo(ctx, CERT_W / 2, 360, 150);

  // Name + title.
  ctx.fillStyle = ink;
  ctx.font = displayFont(84);
  ctx.fillText(namePossessiveHeadline(model.name), CERT_W / 2, 560);
  ctx.fillStyle = enamel;
  ctx.font = displayFont(66);
  ctx.fillText(model.title.toUpperCase(), CERT_W / 2, 650);

  // Badges as struck enamel pins.
  const pinR = 66;
  const gap = 40;
  const totalW = model.badges.length * (pinR * 2) + (model.badges.length - 1) * gap;
  let bx = CERT_W / 2 - totalW / 2 + pinR;
  const by = 790;
  for (const badge of model.badges) {
    drawBadgePin(ctx, bx, by, pinR, badge);
    bx += pinR * 2 + gap;
  }

  // Three things I learned.
  const listTop = model.badges.length > 0 ? 920 : 820;
  ctx.fillStyle = ink;
  ctx.font = displayFont(40);
  ctx.fillText("THREE THINGS I LEARNED", CERT_W / 2, listTop);
  ctx.font = bodyFont(30);
  ctx.fillStyle = slate;
  model.learned.forEach((line, i) => {
    wrapCentred(ctx, line, CERT_W / 2, listTop + 60 + i * 78, CERT_W - 220, 36);
  });

  // Date.
  ctx.fillStyle = ink;
  ctx.font = bodyFont(28, 600);
  ctx.fillText(model.dateText, CERT_W / 2, CERT_H - 210);

  // Paw print signature.
  drawPawPrint(ctx, CERT_W / 2, CERT_H - 140, 46, enamel);

  // Flumlunk wordmark, small, bottom corner.
  ctx.textAlign = "right";
  ctx.font = displayFont(30, 700);
  ctx.fillStyle = slate;
  ctx.fillText(model.wordmark, CERT_W - 70, CERT_H - 70);
  ctx.textAlign = "center";
}

function namePossessiveHeadline(name: string): string {
  if (name === "My") return "MY CERTIFICATE";
  const upper = name.toUpperCase();
  return upper.endsWith("S") ? `${upper}'` : `${upper}'S`;
}

function wrapCentred(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, q?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
      type,
      q
    );
  });
}

export async function renderCertificatePng(visit: Visit, pack: Pack): Promise<Blob> {
  const model = certificateModel(visit, pack);
  const canvas = document.createElement("canvas");
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  drawCertificate(ctx, model);
  return canvasToBlob(canvas, "image/png");
}

export async function renderCertificatePdf(visit: Visit, pack: Pack): Promise<Blob> {
  const model = certificateModel(visit, pack);
  const canvas = document.createElement("canvas");
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  drawCertificate(ctx, model);
  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
  const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
  return buildImagePdf(bytes, CERT_W, CERT_H);
}
