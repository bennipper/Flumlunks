# Flumlunk — parent app (web prototype)

A design and interaction testbed for **Flumlunk**, the brand, and **Bolo**, the plush
character with an NFC-card rucksack. First venue: **Twycross Zoo**. This is a web
prototype to iron out design and features before committing to React Native — it is
**not** a shipping product. See [`BUILD.md`](./BUILD.md) for the full brief.

> The child never looks at this screen. It's designed for an adult, one-handed, in
> bright Leicestershire daylight, holding a coat and possibly an ice cream.

## Run it

```
npm install
npm run dev
```

Then open the printed local-network URL on a phone. **Test outdoors, in daylight** —
that's a real acceptance criterion, not a nicety (BUILD.md §11).

> Camera and microphone need a secure context. `localhost` works; to use them on a
> phone over the LAN you'll need to serve over HTTPS (e.g. a dev tunnel or a local
> cert). The app degrades gracefully without them.

## Simulating Bolo

There is no Bluetooth in a web prototype. `BoloDevice` (`src/bolo/BoloDevice.ts`) is
the seam; `SimBolo` speaks through the device speaker and takes card / squeeze / voice
input from the **debug panel** — the slide-up drawer at the bottom in dev. Insert
cards, squeeze (hold for a double), inject voice results, tune the gap, and toggle the
real mic for energy beats. When the hardware exists, a BLE implementation replaces
`SimBolo` via the factory in `src/bolo/index.ts` and no screen code changes.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server, bound to the local network |
| `npm run build` | Typecheck + production build |
| `npm test` | Vitest (engine, linter, vocabulary, certificate, storage, forbidden-paths) |
| `npm run lint:pack` | Validate the Twycross content pack; fails on any welfare/vocab rule |

## Hard rules (BUILD.md §2)

No backend, no server, no accounts. No photo ever leaves the device. No child account
or surname. No third-party SDKs. No behavioural nudges. No scores anywhere. No runtime
generation. No location. `test/no-forbidden-paths.test.ts` guards the network and
location rules against the built bundle; `docs/DPIA.md` tracks every data flow.

## Structure

```
src/
  bolo/        BoloDevice seam, SimBolo, debug panel, voice grammar
  content/     zod schemas, loader, linter, packs/twycross/pack.json
  visit/       visit state machine + the beat engine (the heart)
  output/      certificate + photo card canvas rendering, minimal PDF writer
  screens/     Start, Live, Camera, Cards, Certificate, Settings
  components/   shared UI (enamel buttons, badge pin, photo strip)
  theme/       design tokens (British enamel zoo signage)
  app/         router + app bootstrap
scripts/       lint-pack CLI
docs/          DPIA, content authoring guide
test/          Vitest suites
```
