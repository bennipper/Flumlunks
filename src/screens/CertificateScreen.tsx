import { useEffect, useRef, useState } from "react";
import { useApp } from "../app/AppContext";
import { useNav } from "../app/router";
import { useStore } from "../store";
import { Button } from "../components/ui";
import {
  CERT_H,
  CERT_W,
  certificateModel,
  drawCertificate,
  renderCertificatePdf,
  renderCertificatePng,
} from "../output/certificate";
import { renderPhotoCardPng } from "../output/photocard";
import { getPhotoUrl } from "../storage/blobs";
import styles from "./CertificateScreen.module.css";

/**
 * Certificate (BUILD.md §9, §10). Rendered on-device, saved to the device. Neither
 * the certificate nor the photo card is ever uploaded and there is no share link.
 */
export function CertificateScreen() {
  const { pack } = useApp();
  const { navigate } = useNav();
  const visit = useStore((s) => s.visit);
  const phase = useStore((s) => s.phase);
  const complete = useStore((s) => s.complete);
  const resetToIdle = useStore((s) => s.resetToIdle);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!pack || !visit) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CERT_W;
    canvas.height = CERT_H;
    const ctx = canvas.getContext("2d");
    if (ctx) drawCertificate(ctx, certificateModel(visit, pack));
    if (phase === "composing") complete();
  }, [pack, visit, phase, complete]);

  if (!pack || !visit) return null;

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const savePng = async () => {
    setBusy("png");
    try {
      download(await renderCertificatePng(visit, pack), "flumlunk-certificate.png");
    } finally {
      setBusy(null);
    }
  };

  const savePdf = async () => {
    setBusy("pdf");
    try {
      download(await renderCertificatePdf(visit, pack), "flumlunk-certificate.pdf");
    } finally {
      setBusy(null);
    }
  };

  const savePhotoCard = async () => {
    setBusy("photocard");
    try {
      const urls: string[] = [];
      for (const p of visit.photos.slice(0, 6)) {
        const u = await getPhotoUrl(p.blobKey);
        if (u) urls.push(u);
      }
      const dateText = new Date(visit.endedAt ?? visit.startedAt).toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "long", year: "numeric" }
      );
      const blob = await renderPhotoCardPng(urls, pack.venueName, dateText);
      urls.forEach((u) => URL.revokeObjectURL(u));
      download(blob, "flumlunk-photo-card.png");
    } finally {
      setBusy(null);
    }
  };

  const newDay = () => {
    resetToIdle();
    navigate("start");
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>Day ended</div>
      <div className={styles.preview}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <div className={styles.actions}>
        <Button variant="primary" block large disabled={busy !== null} onClick={savePng}>
          {busy === "png" ? "Saving…" : "Save certificate"}
        </Button>
        <Button variant="secondary" block disabled={busy !== null} onClick={savePdf}>
          {busy === "pdf" ? "Saving…" : "Save as PDF"}
        </Button>
        {visit.photos.length > 0 && (
          <Button
            variant="secondary"
            block
            disabled={busy !== null}
            onClick={savePhotoCard}
          >
            {busy === "photocard" ? "Making…" : "Make a photo card"}
          </Button>
        )}
        <Button variant="ghost" block onClick={newDay}>
          Start a new day
        </Button>
      </div>
    </div>
  );
}
