/**
 * Minimal single-image PDF writer (BUILD.md §10 — A4 PDF is the certificate's
 * secondary export). Embeds a JPEG on one A4 portrait page with no dependency.
 * Everything is on-device; the PDF is never uploaded.
 */

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 36;

function encodeAscii(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

export function buildImagePdf(jpeg: Uint8Array, imgW: number, imgH: number): Blob {
  const availW = A4_W - MARGIN * 2;
  const availH = A4_H - MARGIN * 2;
  let drawW = availW;
  let drawH = (drawW * imgH) / imgW;
  if (drawH > availH) {
    drawH = availH;
    drawW = (drawH * imgW) / imgH;
  }
  const x = (A4_W - drawW) / 2;
  const y = (A4_H - drawH) / 2;

  const content = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(
    2
  )} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;

  const parts: Array<string | Uint8Array> = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encodeAscii(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const startObject = () => offsets.push(length);

  push("%PDF-1.4\n%\xff\xff\xff\xff\n");

  startObject();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObject();
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  startObject();
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W.toFixed(
      2
    )} ${A4_H.toFixed(
      2
    )}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`
  );

  startObject();
  const contentBytes = encodeAscii(content);
  push(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  push(contentBytes);
  push("\nendstream\nendobj\n");

  startObject();
  push(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  );
  push(jpeg);
  push("\nendstream\nendobj\n");

  const xrefStart = length;
  const objCount = offsets.length + 1;
  let xref = `xref\n0 ${objCount}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  );

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}
