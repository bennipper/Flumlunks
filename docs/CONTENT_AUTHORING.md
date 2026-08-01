# Content authoring — Flumlunk packs

One pack = one venue. Immutable, versioned, human-approved, validated on load
(BUILD.md §6). This guide is for whoever writes the beats a child hears.

## The golden rules

1. **Every word Bolo says ships in the pack.** Nothing is generated at runtime. In
   this prototype the `audio` map holds the transcript for each `audioId`; in
   production it maps to a recorded, archived voice render.
2. **Never a loud beat near primates.** A `loud` energy beat on a `noiseSensitive`
   card is a welfare violation and fails the build. Twycross is a great ape zoo; this
   is the guarantee we show them.
3. **Closed questions only.** A question mark is allowed only in a `yesNo` prompt or a
   `choice` prompt that offers "say one, two or three".
4. **No named individual animals.** They die and get transferred. The blocklist lives
   in `src/content/lint.ts` (`NAMED_ANIMAL_BLOCKLIST`) — keep it current.
5. **Never a score.** No "2 of 6", no percentages, no empty slots — anywhere.

## Running the linter

```
npm run lint:pack
```

Fails on: a `loud` beat on a `noiseSensitive` card; an expected answer outside
`vocabulary`; a `choice` transcript that names its options; an open question mark; a
`lookFor` with no `notVisibleAudioId`; a card with no `fact` beat; a `fact` with no
`learnedLine`; a named individual; a missing `approvedBy`/`approvedAt`; an `audioId`
with no manifest entry. Each rule has a failing fixture in `test/lint.test.ts`.

## Beat kinds

| Kind | Purpose | Ends on |
|---|---|---|
| `recognition` | Greet the animal when the card goes in | audio end |
| `lookFor` | Point out what to watch for (needs `notVisibleAudioId`) | audio end |
| `fact` | One thing to learn; `learnedLine` feeds the certificate | audio end |
| `energy` | Whisper (`quiet`), `claps`, or `loud`; has a `threshold` | recognised result or timeout |
| `choice` | Ask "say one, two or three"; `correct` is 1–3 | recognised result or timeout |
| `yesNo` | A closed yes/no question; biases toward accepting | recognised result or timeout |
| `photo` | Parent takes a photo; `prompt` shows on the camera; `style` action/detail/bolo | photo taken or 20s |
| `signHunt` | Find a sign; `word` must be in `vocabulary` | recognised word/`yes` or 30s |
| `badge` | Hand over the card's `badgeId` | audio end |

`core` is the ~90s stack that plays in order. `deep` beats are **pull-only** — they
never auto-play; a squeeze pulls one, rotating through the pool, to reward a child who
re-inserts the same card.

## Writing `learnedLine`

First person, present, short — how the child would say it. These become "three things
I learned" on the certificate, and no two on a certificate may match.

> "Bonobos share their food to keep everyone calm."

## Photo prompt styles

Vary them: roughly 60% `action`, 30% `detail`, 10% `bolo` (Bolo alone). An action
prompt puts the child in the frame and doing something:

> "Stand where your grown-up can see the gibbons behind you. Now reach both arms up
> as wide as you can — gibbons have the longest arms of any ape. Hold me up so I'm in
> it too."

## Copy voice

Active voice, sentence case, plain verbs. Buttons say what happens ("Take the photo").
No pressure copy — nothing implying the family should have done more or come back
sooner. Empty states are invitations, not scoldings.

## Approval

`approvedBy` and `approvedAt` are required and must be non-empty. The current Twycross
pack is marked **speculative** and must be reviewed by Twycross Conservation Education
Rangers before any real use (BUILD.md §15).
