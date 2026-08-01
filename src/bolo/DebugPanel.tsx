import { useEffect, useRef, useState } from "react";
import { getSimBolo } from "./index";
import type { SimState } from "./SimBolo";
import { getVocabulary } from "./voice";
import { useApp } from "../app/AppContext";
import { useStore } from "../store";
import styles from "./DebugPanel.module.css";

/**
 * Debug panel (BUILD.md §5) — a slide-up drawer, always available in dev. Card
 * picker, squeeze button, voice injector, live readout, real-mic toggle and a live
 * gap slider. This is the only place that reaches for the concrete SimBolo.
 */
export function DebugPanel() {
  const { ownedPacks, engineState } = useApp();
  const sim = getSimBolo();
  const [open, setOpen] = useState(false);
  const [simState, setSimState] = useState<SimState | null>(null);
  const [inCard, setInCard] = useState<string | null>(null);
  const [peak, setPeak] = useState(0.6);
  const [claps, setClaps] = useState(3);
  const gapMs = useStore((s) => s.settings.gapMs);
  const updateSettings = useStore((s) => s.updateSettings);

  useEffect(() => sim?.onState(setSimState), [sim]);

  if (!sim) return null;

  const cards = ownedPacks.flatMap((p) => p.cards);

  const insert = (cardId: string) => {
    sim.primeAudio();
    if (inCard === cardId) {
      sim.injectCardOut();
      setInCard(null);
    } else {
      sim.injectCardIn(cardId);
      setInCard(cardId);
    }
  };

  const send = (fn: () => void) => {
    sim.primeAudio();
    fn();
  };

  return (
    <>
      <button
        className={styles.handle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "▾ Debug" : "▸ Debug"}
      </button>

      {open && (
        <div className={styles.drawer} role="region" aria-label="Debug panel">
          <Readout state={simState} label={engineState.plainLabel}
            beat={engineState.beatId} kind={engineState.beatKind} />

          <div className={styles.group}>
            <div className={styles.groupLabel}>Cards — tap to insert / remove</div>
            {cards.length === 0 ? (
              <div className={styles.empty}>
                Unlock a pack (Scan → Dev quick unlock) to insert its cards.
              </div>
            ) : (
              <div className={styles.grid}>
                {cards.map((c) => (
                  <button
                    key={c.id}
                    className={`${styles.chip} ${inCard === c.id ? styles.chipOn : ""}`}
                    onClick={() => insert(c.id)}
                  >
                    {c.animal}
                  </button>
                ))}
              </div>
            )}
          </div>

          <SqueezeButton onSqueeze={(k) => send(() => sim.injectSqueeze(k))} />

          <div className={styles.group}>
            <div className={styles.groupLabel}>Voice injector</div>
            <div className={styles.grid}>
              {getVocabulary().map((w) => (
                <button
                  key={w}
                  className={styles.chip}
                  onClick={() =>
                    send(() =>
                      sim.injectVoice({ kind: "keyword", word: w, confidence: 0.95 })
                    )
                  }
                >
                  {w}
                </button>
              ))}
            </div>
            <div className={styles.row}>
              <button
                className={styles.chip}
                onClick={() => send(() => sim.injectVoice({ kind: "silence" }))}
              >
                silence
              </button>
              <button
                className={styles.chip}
                onClick={() => send(() => sim.injectVoice({ kind: "unrecognised" }))}
              >
                unrecognised
              </button>
            </div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>
              Energy — peak {peak.toFixed(2)}, {claps} clap{claps === 1 ? "" : "s"}
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={peak}
              onChange={(e) => setPeak(Number(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.row}>
              <button className={styles.chip} onClick={() => setClaps((c) => Math.max(0, c - 1))}>
                − clap
              </button>
              <button className={styles.chip} onClick={() => setClaps((c) => c + 1)}>
                + clap
              </button>
              <button
                className={`${styles.chip} ${styles.send}`}
                onClick={() => send(() => sim.injectVoice({ kind: "energy", peak, claps }))}
              >
                Send energy
              </button>
            </div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Gap — {(gapMs / 1000).toFixed(1)}s</div>
            <input
              type="range"
              min={1000}
              max={8000}
              step={250}
              value={gapMs}
              onChange={(e) => updateSettings({ gapMs: Number(e.target.value) })}
              className={styles.slider}
            />
          </div>

          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={simState?.useRealMic ?? false}
              onChange={(e) => send(() => sim.setUseRealMic(e.target.checked))}
            />
            Use real mic (energy beats only)
          </label>
        </div>
      )}
    </>
  );
}

function Readout({
  state,
  label,
  beat,
  kind,
}: {
  state: SimState | null;
  label: string;
  beat?: string;
  kind?: string;
}) {
  return (
    <dl className={styles.readout}>
      <div><dt>Doing</dt><dd>{label}</dd></div>
      <div><dt>Beat</dt><dd>{beat ?? "—"} {kind ? `(${kind})` : ""}</dd></div>
      <div><dt>LED</dt><dd>{state?.led ?? "—"}</dd></div>
      <div>
        <dt>Mic</dt>
        <dd>
          {state?.micOpen ? `open ${Math.ceil((state.micRemainingMs ?? 0) / 1000)}s` : "closed"}
        </dd>
      </div>
      <div><dt>Voice</dt><dd>{state?.lastResult?.kind ?? "—"}</dd></div>
    </dl>
  );
}

function SqueezeButton({ onSqueeze }: { onSqueeze: (k: "single" | "double") => void }) {
  const downAt = useRef(0);
  return (
    <div className={styles.group}>
      <div className={styles.groupLabel}>Squeeze — hold for double</div>
      <button
        className={styles.squeeze}
        onPointerDown={() => (downAt.current = Date.now())}
        onPointerUp={() => {
          const held = Date.now() - downAt.current;
          onSqueeze(held >= 500 ? "double" : "single");
        }}
      >
        Squeeze Bolo
      </button>
    </div>
  );
}
