# DPIA — Flumlunk parent app (web prototype)

Living document (BUILD.md §2). Every task touching camera, microphone or storage
adds a line describing what the data is and where it goes. The governing principle
is the hard rules: **no backend, no server, no accounts; nothing is uploaded; no
personal data on any infrastructure Flumlunk controls.**

## Summary of data flows

| Data | Captured by | Stored where | Leaves device? | Retention |
|---|---|---|---|---|
| Child's first name (optional) | Start / Settings text field | Zustand store → IndexedDB (`flumlunk-state`) | No | Until "Delete everything" |
| Photos | Camera (`getUserMedia`) | IndexedDB blobs (`flumlunk-photos`) | **No** | Until "Delete everything" |
| Microphone audio (energy beats only) | `getUserMedia` + `AnalyserNode` | Not stored — analysed in memory for peak/claps, then discarded | No | Not retained |
| Visit record (cards played, badges, learned lines, photo keys) | Beat engine | Zustand store → IndexedDB (`flumlunk-state`) | No | Until "Delete everything" |
| Certificate / photo card | Canvas render | Generated on demand, downloaded by the parent | No (download only, no share link) | Not retained by the app |

## Detail

### Camera
- **What:** still photos, taken one tap at a time on a photo beat or from the strip.
- **How:** `navigator.mediaDevices.getUserMedia({ video: { facingMode: environment } })`.
  The stream is stopped when the camera screen unmounts.
- **Where it goes:** the captured frame is written straight to an IndexedDB blob via
  `src/storage/blobs.ts`. There is no upload path, no share link, no cloud. Object
  URLs are minted for on-screen display and revoked when no longer needed.
- **Permission:** requested only when the camera screen first opens, never at start.

### Microphone
- **What:** short live audio windows, used only to measure energy (whisper/clap/roar)
  on energy beats when "Use real mic" is enabled in the debug panel.
- **How:** `getUserMedia({ audio: true })` → `AnalyserNode`. Only RMS peak and a clap
  count are read; **no audio is recorded, buffered to disk, or stored.**
- **Keyword spotting:** there is no web keyword spotter in this prototype. Keyword
  results are injected from the debug panel, never derived from real audio.

### Storage
- **What:** the child's optional first name, the visit record, and photo blobs.
- **Where:** IndexedDB on this device only, via `idb-keyval` and Zustand's persist
  middleware. Two stores: `flumlunk-state` (KV) and `flumlunk-photos` (blobs).
- **Deletion:** Settings → "Delete everything" clears the store and every photo
  blob (`deleteEverything` + `clearAllPhotos`), verified by `test/storage.test.ts`.

### Location
- **None.** There is no geolocation API call anywhere in this codebase. The NFC card
  is the only location signal. `test/no-forbidden-paths.test.ts` fails the build if a
  reference to `geolocation` ever appears in the shipped bundle.

### Third parties
- **None.** No analytics, crash reporting, ad tech, attribution, or CDN-loaded fonts.
  `test/no-forbidden-paths.test.ts` greps the built bundle for analytics domains and
  external network calls and fails on any.

## Change log
- 2026-08-01 — Initial prototype: camera, microphone (energy only), IndexedDB
  storage of name/visit/photos, on-device certificate + photo card rendering. No
  network egress; guarded by `test/no-forbidden-paths.test.ts`.
