import { useEffect, useRef, useState } from "react";
import { useNav } from "../app/router";
import { useStore } from "../store";
import { Button, TopBar } from "../components/ui";
import {
  CATALOGUE,
  entryById,
  parseUnlockPayload,
} from "../content/catalogue";
import styles from "./ScanScreen.module.css";

/**
 * Scan (parent's request). Unlock a pack by scanning the QR inside its physical
 * cards. Uses the browser's built-in BarcodeDetector — no third-party SDK (hard rule
 * §4) — with a typed-code fallback for browsers without it, and a dev shortcut. The
 * QR is an offline entitlement token: unlocking needs no account and no network.
 */

type DetectedBarcode = { rawValue: string };
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  return (
    (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector ?? null
  );
}

type Status = "scanning" | "unsupported" | "success" | "notfound";

export function ScanScreen() {
  const { navigate } = useNav();
  const unlockPack = useStore((s) => s.unlockPack);
  const owned = new Set(useStore((s) => s.ownedPackIds));
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("scanning");
  const [unlockedId, setUnlockedId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const handlePayload = (raw: string): boolean => {
    const packId = parseUnlockPayload(raw);
    if (!packId) {
      setStatus("notfound");
      return false;
    }
    unlockPack(packId);
    setUnlockedId(packId);
    setStatus("success");
    streamRef.current?.getTracks().forEach((t) => t.stop());
    return true;
  };

  useEffect(() => {
    const Detector = getBarcodeDetector();
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    let cancelled = false;
    let raf = 0;
    const detector = new Detector({ formats: ["qr_code"] });
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});
        const tick = async () => {
          if (cancelled || !video.videoWidth) {
            raf = requestAnimationFrame(tick);
            return;
          }
          try {
            const codes = await detector.detect(video);
            if (codes[0]?.rawValue && handlePayload(codes[0].rawValue)) return;
          } catch {
            /* keep scanning */
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setStatus("unsupported");
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "success" && unlockedId) {
    const entry = entryById(unlockedId);
    return (
      <>
        <TopBar title="Unlocked" />
        <div className={styles.result}>
          <div className={styles.tick} aria-hidden>
            ✓
          </div>
          <h2 className={styles.resultTitle}>{entry?.title} unlocked</h2>
          <p className={styles.resultText}>
            {entry?.bundled
              ? "Downloaded and ready to play offline. Post a card into Bolo to begin."
              : "Added to your packs."}
          </p>
          <Button variant="primary" block large onClick={() => navigate("library")}>
            See your packs
          </Button>
          <Button variant="ghost" block onClick={() => navigate("dashboard")}>
            Back to home
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Scan a card" />
      <div className={styles.screen}>
        {status === "scanning" && (
          <div className={styles.viewfinder}>
            <video ref={videoRef} className={styles.video} playsInline muted />
            <div className={styles.reticle} aria-hidden />
            <p className={styles.hint}>
              Point the camera at the QR code inside your Bolo card.
            </p>
          </div>
        )}

        {status === "unsupported" && (
          <p className={styles.note}>
            Scanning isn't available on this browser. Type the code printed inside
            your card instead.
          </p>
        )}

        {status === "notfound" && (
          <p className={styles.error} role="alert">
            That code wasn't recognised. Check the code on your card and try again.
          </p>
        )}

        <form
          className={styles.codeForm}
          onSubmit={(e) => {
            e.preventDefault();
            handlePayload(code);
          }}
        >
          <label className={styles.label} htmlFor="code">
            Or enter the code from your card
          </label>
          <div className={styles.codeRow}>
            <input
              id="code"
              className={styles.input}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. TWYCROSS"
              autoComplete="off"
              autoCapitalize="characters"
            />
            <Button type="submit" variant="primary">
              Unlock
            </Button>
          </div>
        </form>

        {import.meta.env.DEV && (
          <div className={styles.dev}>
            <div className={styles.devLabel}>Dev — quick unlock</div>
            <div className={styles.devRow}>
              {CATALOGUE.filter((e) => !owned.has(e.id)).map((e) => (
                <button
                  key={e.id}
                  className={styles.devChip}
                  onClick={() => handlePayload(e.unlockCode)}
                >
                  {e.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
