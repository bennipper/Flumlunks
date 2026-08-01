import { useEffect, useRef, useState } from "react";
import { useApp } from "../app/AppContext";
import { useNav } from "../app/router";
import { Button } from "../components/ui";
import styles from "./CameraScreen.module.css";

/**
 * Camera (BUILD.md §9). Full-bleed rear-facing viewfinder, the beat prompt overlaid
 * large and legible in sun, one shutter, no filters, no review, no retake — capture
 * and return immediately. The photo is written straight to a local blob; there is
 * no upload path anywhere in this screen (hard rule §2).
 */
export function CameraScreen() {
  const { engineState, capturePhoto } = useApp();
  const { navigate } = useNav();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prompt =
    engineState.photoRequest?.prompt ?? "Take a photo of your day at the zoo.";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("This browser can't open the camera. Try Safari or Chrome.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("The camera is blocked. Allow camera access to take photos.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const shutter = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.92)
    );
    if (blob) await capturePhoto(blob);
    navigate("dashboard");
  };

  return (
    <div className={styles.wrap}>
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        muted
        aria-label="Camera viewfinder"
      />

      <p className={styles.prompt}>{prompt}</p>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <div className={styles.controls}>
        <Button variant="ghost" onClick={() => navigate("dashboard")}>
          Back
        </Button>
        <button
          className={styles.shutter}
          onClick={shutter}
          aria-label="Take the photo"
          disabled={Boolean(error)}
        />
        <span className={styles.spacerBtn} aria-hidden />
      </div>
    </div>
  );
}
