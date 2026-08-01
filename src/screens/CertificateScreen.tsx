import { useEffect, useRef, useState } from "react";
import { useApp } from "../app/AppContext";
import { useNav } from "../app/router";
import { useStore } from "../store";
import { Button, TopBar } from "../components/ui";
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
 * Certificate (BUILD.md §10). Produced on demand from Today — there is no "end the
 * day" step. Rendered on-device and saved to the device; never uploaded, no share
 * link. Co-brands with the pack of the most recently played card.
 */
export function CertificateScreen() {
  const { primaryPack } = useApp();
  const { navigate } = useNav();
  const today = useStore((s) => s.today);
  const startNewDay = useStore((s) => s.startNewDay);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const pack = primaryPack();
  const hasSomething = Boolean(
    today && (today.badges.length > 0 || today.learned.length > 0 || today.cardsPlayed.length > 0)
  );

  useEffect(() => {
    if (!pack || !today || !hasSomething) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CERT_W;
    canvas.height = CERT_H;
    const ctx = canvas.getContext("2d");
    if (ctx) drawCertificate(ctx, certificateModel(today, pack));
  }, [pack, today, hasSomething]);

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

  const withBusy = async (tag: string, fn: () => Promise<void>) => {
    setBusy(tag);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  if (!today || !pack || !hasSomething) {
    return (
      <>
        <TopBar title="Certificate" />
        <div className={styles.emptyWrap}>
          <p className={styles.empty}>
            Once Bolo has met an animal today, your certificate appears here. Pop a
            card into the rucksack to begin.
          </p>
        </div>
      </>
    );
  }

  const savePhotoCard = async () => {
    const urls: string[] = [];
    for (const p of today.photos.slice(0, 6)) {
      const u = await getPhotoUrl(p.blobKey);
      if (u) urls.push(u);
    }
    const dateText = new Date(today.startedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const blob = await renderPhotoCardPng(urls, pack.venueName, dateText);
    urls.forEach((u) => URL.revokeObjectURL(u));
    download(blob, "flumlunk-photo-card.png");
  };

  return (
    <>
      <TopBar title="Certificate" />
      <div className={styles.wrap}>
        <div className={styles.preview}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            block
            large
            disabled={busy !== null}
            onClick={() =>
              withBusy("png", async () =>
                download(await renderCertificatePng(today, pack), "flumlunk-certificate.png")
              )
            }
          >
            {busy === "png" ? "Saving…" : "Save certificate"}
          </Button>
          <Button
            variant="secondary"
            block
            disabled={busy !== null}
            onClick={() =>
              withBusy("pdf", async () =>
                download(await renderCertificatePdf(today, pack), "flumlunk-certificate.pdf")
              )
            }
          >
            {busy === "pdf" ? "Saving…" : "Save as PDF"}
          </Button>
          {today.photos.length > 0 && (
            <Button
              variant="secondary"
              block
              disabled={busy !== null}
              onClick={() => withBusy("photocard", savePhotoCard)}
            >
              {busy === "photocard" ? "Making…" : "Make a photo card"}
            </Button>
          )}
          <Button
            variant="ghost"
            block
            onClick={() => {
              startNewDay();
              navigate("dashboard");
            }}
          >
            Start a new day
          </Button>
        </div>
      </div>
    </>
  );
}
