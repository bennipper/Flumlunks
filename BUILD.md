# FLUMLUNK — Parent App — BUILD.md

**Web prototype.** The goal of this build is to iron out design and features before
committing to React Native. It is a design and interaction testbed, not a shipping
product.

**Flumlunk** is the brand. **Bolo** is the character. First venue is **Twycross Zoo**.

Bolo is a plush toy with a rucksack. The rucksack holds a removable electronics
module and an NFC card slot. The child posts a card into the rucksack and Bolo talks
about that animal. The parent's phone is secondary — it downloads the venue pack,
acts as the camera, and renders the end-of-day certificate.

---

## 1. What this prototype is and isn't

**Is:**
- The full parent-facing UI, at real fidelity, on a phone-sized viewport
- A working simulation of Bolo, driven from an on-screen debug panel
- A complete beat engine running real Twycross content
- Real certificate and photo card rendering

**Isn't:**
- Bluetooth. There is no BLE in a web prototype and no attempt at it.
- Native. No Expo, no React Native, no Capacitor.
- A backend. **There is no server in this product, now or later.** See §2.

Everything must run from `npm run dev` and work on a phone browser over local
network, because it needs testing outdoors in daylight.

---

## 2. Hard rules

Not preferences. If a feature request conflicts with one of these, the rule wins —
stop and flag it.

1. **No backend. No server. No accounts.** All state is local. Nothing is uploaded.
   There is no personal data on any infrastructure Flumlunk controls.
2. **No photo ever leaves the device.** Photos are held as object URLs / IndexedDB
   blobs in the prototype, and in the device photo library in the real app. There
   is no upload path, no share-link, no cloud.
3. **No child account, no surname.** First name only, optional, local only.
4. **No third-party SDKs.** No analytics, no crash reporting, no fonts loaded from
   a CDN that logs, no ad tech, no attribution.
5. **No behavioural nudges.** No streaks, no guilt copy, no countdowns, no
   "you missed the bonobos", no push notifications of any kind.
6. **No scores anywhere.** Never render "2 of 6", never a percentage, never an empty
   badge slot with a dotted outline. The UI shows what happened, never what didn't.
7. **No runtime generation.** Every word Bolo says ships in the pack, human-approved.
8. **No location.** No geolocation API call exists in this codebase. The card is the
   location signal.

Keep `docs/DPIA.md` updated as you build. Any task touching camera, microphone or
storage adds a line describing what the data is and where it goes.

---

## 3. Stack

- **Vite + React 18 + TypeScript** (strict)
- **Zustand** + persist middleware → IndexedDB via `idb-keyval`
- **zod** for pack validation at load
- **Web Audio API** for beat playback
- **`getUserMedia`** for the camera; **`AnalyserNode`** for the energy-beat simulation
- **Canvas** for certificate and photo card rendering
- **Vitest** + Testing Library

No UI library. No Tailwind. Plain CSS modules with tokens from `src/theme/tokens.css`.
Self-host fonts. Ask before adding any dependency.

---

## 4. Structure

```
/src
  /bolo
    BoloDevice.ts        interface — the seam for the real toy later
    SimBolo.ts           web implementation: speaks via Web Audio
    DebugPanel.tsx       card picker, squeeze button, voice injector
    voice.ts             vocabulary, grammar validation
  /content
    schema.ts            zod schemas
    loader.ts            load + validate; refuse malformed packs
    /packs/twycross/     pack.json + audio
  /visit
    machine.ts           visit + beat state machine
    beats.ts             beat runner, timeouts, miss handling
  /output
    certificate.ts       canvas render, 4:5 PNG + A4 PDF
    photocard.ts         canvas render, 4:5 PNG
  /screens
  /theme
/scripts
  lint-pack.ts
/docs
  DPIA.md
  CONTENT_AUTHORING.md
```

---

## 5. Simulating Bolo

The whole point of the prototype. `BoloDevice` is the seam — when the hardware
exists, `SimBolo` is swapped for a BLE implementation and no screen code changes.

```ts
interface BoloDevice {
  onCardIn(cb: (cardId: string) => void): Unsubscribe;
  onCardOut(cb: () => void): Unsubscribe;
  onSqueeze(cb: (kind: "single" | "double") => void): Unsubscribe;

  say(audioId: string): Promise<void>;   // resolves on playback end
  stop(): void;
  chirp(kind: "micOpen" | "micClose"): void;
  setLed(state: "idle" | "attention" | "listening" | "off"): void;

  openMic(windowMs: number): Promise<VoiceResult>;
  status(): { battery: number; muted: boolean; connected: boolean };
}

type VoiceResult =
  | { kind: "keyword"; word: string; confidence: number }
  | { kind: "energy"; peak: number; claps: number }
  | { kind: "silence" }
  | { kind: "unrecognised" };
```

**Debug panel** — a slide-up drawer, always available in dev:

- Grid of the Twycross cards. Tap = insert. Tap again = remove.
- Big **squeeze** button. Long-press = double squeeze.
- Voice injector: buttons for each vocabulary word, plus `silence`, plus
  `unrecognised`, plus a slider for energy peak and a clap counter.
- Live readout: current state, current beat, mic window countdown, LED state.
- Toggle: **use real mic** — routes `openMic` to `getUserMedia` + `AnalyserNode`, so
  energy beats (whisper, clap) can be tested for real. Keyword spotting stays
  simulated; there is no web KWS in this prototype.

Audio plays through the laptop or phone speaker. That is close enough to a 28mm
driver in fabric to be useful for pacing, and useless for judging mix. Don't try to
judge mix here.

---

## 6. Content pack

One pack = one venue. Immutable, versioned, human-approved, validated on load.

```ts
type Pack = {
  id: "twycross";
  version: string;
  venueName: "Twycross Zoo";
  approvedBy: string;          // required, non-empty
  approvedAt: string;          // ISO
  vocabulary: string[];        // the 25 words this pack uses
  cards: Card[];
  badges: Badge[];
  audio: Record<string, string>;
};

type Card = {
  id: string;
  animal: string;              // "Bonobo"
  zone: string;                // Twycross has eight zones
  keyword?: string;            // if the animal name is in the vocabulary
  noiseSensitive: boolean;     // true for all great apes and gibbons
  core: Beat[];                // the ~90s stack
  deep: Beat[];                // pull-only, never auto-plays
  badgeId?: string;
};

type Beat =
  | { kind: "recognition"; id: string; audioId: string }
  | { kind: "lookFor"; id: string; audioId: string; notVisibleAudioId: string }
  | { kind: "fact"; id: string; audioId: string; learnedLine: string }
  | { kind: "energy"; id: string; audioId: string;
      mode: "quiet" | "claps" | "loud";
      threshold: number; claps?: number; successAudioId: string }
  | { kind: "choice"; id: string; audioId: string; options: 2 | 3;
      correct: 1 | 2 | 3; correctAudioId: string; wrongAudioId: string }
  | { kind: "yesNo"; id: string; audioId: string;
      yesAudioId: string; noAudioId: string }
  | { kind: "photo"; id: string; audioId: string;
      prompt: string;          // shown on the parent's camera screen
      style: "action" | "detail" | "bolo" }
  | { kind: "signHunt"; id: string; audioId: string; word: string }
  | { kind: "badge"; id: string; audioId: string };
```

`learnedLine` on fact beats is what feeds "three things I learned" on the
certificate. Write it as the child would say it, first person, short.

### Pack linter — `npm run lint:pack`

Must fail the build on any of:

- A `loud` energy beat on a `noiseSensitive: true` card.
  **Twycross is a great ape zoo. Loud beats near primates are a welfare issue and
  will end the licensing conversation.** This rule is the guarantee we show them.
- A beat whose expected answer is outside `pack.vocabulary`
- A `choice` beat whose audio transcript names the options rather than saying
  "say one, two or three"
- Any question mark in a transcript that isn't a closed question
- A `lookFor` beat with no `notVisibleAudioId`
- A card with no `fact` beat, or a `fact` beat with no `learnedLine`
- A named individual animal in any transcript (maintain a blocklist of the
  current Twycross animal names; they die and get transferred)
- Missing `approvedBy` / `approvedAt`
- An `audioId` with no manifest entry

Write a failing fixture for each rule.

### Sample content

Author 8 Twycross cards covering every beat kind. Must include at least two great
apes (bonobo, gorilla) flagged `noiseSensitive`, and at least one outdoor big cat
where a `loud` beat is legal. Photo prompt styles must vary — roughly 60% action,
30% detail, 10% Bolo alone.

Example action prompt: "Stand where your grown-up can see the gibbons behind you.
Now reach both arms up as wide as you can — gibbons have the longest arms of any
ape. Hold me up so I'm in it too."

---

## 7. Beat engine

`src/visit/beats.ts`. This is the heart of the prototype and where most of the
design iteration will happen.

**Core rule: nothing waits on the child.** Every beat has a timeout and advances
regardless. A completely passive child still gets the full ~90 second stack.

Per beat kind:

| Kind | Ends on |
|---|---|
| recognition, fact | audio end |
| lookFor | audio end |
| energy, choice, yesNo | recognised result, or timeout |
| photo | photo taken, or 20s timeout |
| signHunt | recognised `yes`, or 30s timeout |
| badge | audio end |

**Gaps.** After every beat, a silence of `GAP_MS` (default 4000, make it a live
slider in the debug panel). This is protected content — it's where the child talks
to their parent. Tune it in testing; expect the right value to feel too long in a
quiet room.

**Miss handling — implement exactly:**

1. Ask. `chirp("micOpen")`, LED listening, mic open 3000ms, `chirp("micClose")`.
2. `silence` → advance immediately. No retry. The child is looking at an animal;
   that's the product working.
3. `unrecognised` → one rephrase, one more window. Never a third attempt.
4. Second `unrecognised` → absorb in character ("Hmm, my ears are a bit fuzzy
   today"), advance.
5. Never say "I didn't understand" or any variant.
6. `yesNo` biases hard toward accepting. Document `YESNO_CONFIDENCE_FLOOR`.
7. Photo beats accept **any** recognised keyword or energy spike as "ready".

**Card out** → stop immediately mid-sentence, save beat position.
**Card in again, same card, within 30 min** → short resume recognition, continue
from saved beat. Don't replay the fact.
**Card in again after the stack completed** → play a `deep` beat, rotating through
the pool. Children re-insert the same card repeatedly; reward it.
**Card swapped mid-beat** → immediate switch, no confirmation. The child's choice
always wins instantly.

---

## 8. Visit state machine

```
IDLE ──startVisit──▶ ACTIVE ──endVisit──▶ COMPOSING ──▶ COMPLETE
```

That's it. No exhibit selection, no positioning, no per-exhibit states. The card
drives everything and the beat engine owns its own sub-state.

```ts
type Visit = {
  id: string;
  packId: string; packVersion: string;
  childFirstName?: string;
  startedAt: string; endedAt?: string;
  cardsPlayed: { cardId: string; beatsHeard: string[]; at: string }[];
  photos: { blobKey: string; cardId: string; prompt: string; at: string }[];
  badges: string[];
  learned: string[];      // learnedLine values, for the certificate
};
```

Resumable across a page reload. No child identifier beyond an optional first name.

---

## 9. Screens

Six. Phone viewport is the only one that matters; make it usable on desktop but
don't design for it.

**Start** — pick venue (one option), optional child first name, "Start the day".
Explains in two sentences what happens. No permissions requested yet.

**Live** — the screen the parent glances at.
- What Bolo is doing right now, large: card name, current beat in plain words
- Badges earned so far, as struck enamel pins
- Photos taken today, as a small strip
- Bolo status: connected, battery, muted
- **Every voice action shows a tappable equivalent here while its beat is live.**
  This is the accessibility path and the noisy-fallback. Non-negotiable.
- Volume ceiling control
- "End the day"

**Camera** — opens on a photo beat, or from the strip.
- Full-bleed viewfinder, `facingMode: environment`
- The beat's `prompt` overlaid as a caption, large, legible in sun
- One shutter. No filters, no review step, no retake flow — return immediately.

**Cards** — the pack, showing which have been played today. No progress bar, no
"4 of 8". Just played / not yet.

**Certificate** — after "End the day". See §10.

**Settings** — child first name, volume ceiling, Bolo mute, gap length (dev),
plain-language data section, and **Delete everything** with one confirmation.

---

## 10. Certificate and photo card

Both rendered to canvas, on-device, saved to the camera roll. **Neither is ever
uploaded and there is no share link.**

**Certificate** — 4:5 PNG (1080×1350) primary, A4 PDF secondary.
- Child's first name only
- Bolo, illustrated
- Twycross co-brand
- Date
- Badges as struck enamel pins — this is the only place `--brass` appears
- **Three things I learned**, drawn from `learned[]`, so no two match
- Bolo's paw print as the signature
- Flumlunk wordmark, small, bottom corner

**Titles vary by achievement, never by rank.** Two badges earns a real title, not a
lesser one. *Primate Spotter*, *Junior Keeper*, *Chief Ape Watcher*. Never a count,
never a percentage, never an empty slot.

**Photo card** — 4:5 PNG, optional, separate. Four to six of the day's photos in the
Flumlunk frame with venue and date. The certificate belongs to the child; the photo
card belongs to the parent. Keep them as two images.

Design the certificate to be posted. A parent putting it on Instagram is the whole
marketing budget, and it promotes the zoo too. It has to look like something a zoo
would actually issue — not clip-art rosettes.

---

## 11. Visual direction

**The child never looks at this screen.** Design for an adult, one-handed, in
bright Leicestershire daylight, distracted, holding a coat and possibly an ice
cream. That brief drives every decision. Pastel kids-app styling is wrong here and
will fail outdoors.

Direction: **British enamel zoo signage.** Ordnance Survey legibility, vitreous
enamel colour, the vernacular of a 1930s direction sign. Flat, confident, weather-
proof-looking.

```
--ink      #10261E   near-black bottle green — text, primary surfaces
--enamel   #0F5C3F   deep green — headers, chrome
--chalk    #F7F5EE   off-white — background
--signal   #E8541F   vermilion — actions only, never decorative
--brass    #B8892B   badges only, nowhere else
--slate    #5C6B63   secondary text, disabled
```

- **Display:** a condensed grotesque, uppercase, tight tracking. Card names and
  screen titles only.
- **Body:** high-legibility humanist sans. 17pt minimum, 20pt for anything read at
  arm's length.
- Zero radius on structural surfaces, fully round on tap targets. The contrast is
  deliberate.
- **Signature element: the badge.** Struck like an enamel pin — brass rim, flat
  colour, no gradient, slight bevel. It is the only `--brass` in the app. Earning
  one should feel like being handed a physical object, and the same badge artwork
  carries onto the certificate and the printed stamp-rally board.
- Minimum tap target 56×56.
- Respect `prefers-reduced-motion`. Visible focus rings. Real labels.

**Test every screen outdoors on a phone in daylight before calling it done.** This
is a real acceptance criterion, not a nicety.

---

## 12. Copy

- Active voice, sentence case, plain verbs. A button says what happens: "Take the
  photo", not "Submit".
- The same word all the way through a flow. "End the day" produces "Day ended".
- Errors say what went wrong and what to do. They don't apologise and they're never
  vague.
- Empty states are invitations: "No cards played yet. Pop one in Bolo's rucksack."
- **Never any pressure copy.** Nothing that implies the family should have done
  more, gone further, or come back sooner.

---

## 13. Build order

Each phase has an acceptance test. Don't start the next until it passes.

**1. Shell** — Vite, routes, tokens, store, IndexedDB persistence.
*Done when:* boots, navigates, tokens applied, passes a daylight contrast check on
a real phone.

**2. Pack + linter** — schemas, loader, all lint rules, failing fixture per rule.
*Done when:* the `loud`-on-`noiseSensitive` rule fails a fixture, and a malformed
pack is refused at load.

**3. SimBolo + debug panel** — full `BoloDevice`, card grid, squeeze, voice
injector, real-mic toggle.
*Done when:* every beat kind can be driven from the panel and no screen imports
`SimBolo` outside the factory.

**4. Beat engine** — runner, timeouts, gaps, miss handling, resume, deep layers.
*Done when:* a passive run completes the full stack unaided; `silence` never
retries; `unrecognised` never exceeds two attempts.

**5. Live screen** — status, badges, photo strip, tappable equivalents.
*Done when:* every voice action has a working button while its beat is live.

**6. Camera** — getUserMedia, prompt overlay, one-tap capture, blob storage.
*Done when:* photos persist across reload and no upload path exists in the bundle.

**7. Certificate + photo card** — canvas render, PNG save, PDF export.
*Done when:* a two-badge visit produces a certificate that reads as a full win, and
`learned[]` produces three distinct lines.

**8. Settings + delete** — controls, plain-language data section, delete everything.
*Done when:* delete clears all visits, photos and blobs, verified by test.

---

## 14. Tests

- Beat engine: exhaustive per-kind end conditions.
- Miss handling: assert the two-attempt ceiling and that `silence` never retries.
- Linter: one failing fixture per rule.
- Vocabulary: assert no beat in the Twycross pack expects an out-of-vocabulary answer.
- Certificate: assert no rendered string contains a count, a fraction or a
  percentage.
- `test/no-forbidden-paths.test.ts` — grep the built bundle and fail on: any
  `fetch`/`XHR` to a non-local origin, any reference to `geolocation`, any
  analytics domain. Crude, but it's the guard on the hard rules.

---

## 15. Open

- `[OPEN]` Twycross licensing not yet approached. Content is written speculatively
  and must be reviewed by their Conservation Education Rangers before any real use.
- `[OPEN]` Bolo's voice. Lock the model, version and settings before authoring at
  volume, and archive the renders. A voice that drifts between packs breaks the
  character permanently.
- `[OPEN]` Child-speech data for the real keyword spotter. This is a data-collection
  exercise involving children and needs its own consent design. Blocks hardware,
  not this prototype.
- `[OPEN]` Whether a squeeze triggered by a hug is acceptable, or whether the button
  needs a firmer detent. Test with the physical prototype.

---

## 16. Conventions

- No `any`. No `@ts-ignore` without a comment naming the upstream issue.
- Components under 150 lines; extract rather than nest.
- Conventional commits.
- Ask before adding a dependency.
