# Flumlunk — Parent App — Design Brief

A self-contained brief for high-fidelity visual design. You need no other files to
design from this. It describes what the product is, who the screen is for, the visual
language, and every screen and component.

---

## 1. The product in one paragraph

**Flumlunk** is the brand. **Bolo** is the character — a plush toy with a rucksack
that holds an electronics module and an NFC card slot. A child posts an animal **card**
into Bolo's rucksack and Bolo talks about that animal, guiding a ~90-second moment of
looking, listening and one photo. The first venue is **Twycross Zoo**. **The parent's
phone is secondary**: it holds the packs the family owns, acts as the camera, and
renders an end-of-day certificate. This brief is for that **parent app**.

## 2. Who the screen is for — the one brief that drives everything

> **The child never looks at this screen.** Design for an **adult, one-handed, in
> bright Leicestershire daylight, distracted, holding a coat and possibly an ice
> cream.**

Pastel kids-app styling is wrong here and will fail outdoors. Every decision serves
legibility in sun, big tap targets, and calm confidence. **Test every screen as if
viewed on a phone in direct daylight.**

## 3. Non-negotiable principles

These are product rules, not preferences. They shape the UI directly:

- **No scores, ever.** Never "2 of 6", never a percentage, never an empty badge slot
  with a dotted outline. The UI shows what *happened*, never what didn't. "Played" vs
  "Not yet" — never a count of progress.
- **No pressure copy.** Nothing implying the family should have done more, gone
  further, or come back sooner. No streaks, countdowns, or "you missed the bonobos".
- **No behavioural nudges, no notifications.** Empty states are warm invitations, not
  scoldings ("No cards played yet. Pop one in Bolo's rucksack.").
- **Everything is local and private.** No account, no login, first name only. Nothing
  is uploaded; there is no share button on the certificate. Say this plainly in
  Settings, calmly, as reassurance.
- **Accessibility is the noisy-day fallback too.** Every spoken action Bolo asks for
  shows a **tappable equivalent** on screen while it's live. Visible focus rings, real
  labels, respects reduced motion.
- **Minimum tap target 56×56 px.** Body text 17px minimum, 20px for anything read at
  arm's length.

## 4. Visual language — British enamel zoo signage

Direction: **British enamel zoo signage.** Ordnance Survey legibility, vitreous enamel
colour, the vernacular of a 1930s direction sign. Flat, confident, weatherproof-looking.
Not skeuomorphic, not glossy, not childish.

### Palette (use exactly; every colour has one job)

| Token | Hex | Job |
|---|---|---|
| `ink` | `#10261E` | Near-black bottle green. Text, primary dark surfaces. |
| `enamel` | `#0F5C3F` | Deep green. Headers, chrome, pack covers. |
| `chalk` | `#F7F5EE` | Off-white. Background. |
| `signal` | `#E8541F` | Vermilion. **Actions only** — never decorative. |
| `brass` | `#B8892B` | **Badges only, nowhere else.** |
| `slate` | `#5C6B63` | Secondary text, disabled, hairlines. |

Supporting: `chalk-sunk #ECE9DD` (inset panels), `enamel-deep #0A3F2B` (pressed).

### Type

- **Display:** a condensed grotesque, **UPPERCASE, tight tracking** (e.g. Oswald,
  Roboto Condensed). Used only for card/animal names, screen titles, badge names.
- **Body:** a high-legibility humanist sans (e.g. Inter). 17px min, 20px at arm's
  length. Sentence case.
- Rough scale: hero 46, title 34, lead 24, arm 20, body 17.

### Form

- **Zero radius on structural surfaces** (panels, headers, cards). **Fully round on
  tap targets** (buttons, chips, toggles). The contrast is deliberate.
- Flat fills, no gradients (the badge bevel is the one exception).
- Phone viewport is the only one that matters. Centre a max-width ~480px "app frame"
  on wider screens against an `enamel-deep` backdrop; don't design for desktop.

### The signature element: the badge

Struck like an **enamel pin — brass rim, flat enamel colour face, a slight bevel, no
gradient**. It is the **only** place `brass` appears. Earning one should feel like
being handed a physical object. The **same badge artwork** appears on the Live view,
on the certificate, and (later) on a printed stamp-rally board. Motif is a single
bold glyph on a coloured enamel face.

## 5. Interaction model (so the screens make sense)

- **No "start/end the day."** The child drives play by posting cards. The app is always
  listening. It keeps an ambient **"Today"** that collects badges, photos and "things I
  learned" as cards are played, and rolls over to a fresh day automatically.
- The **certificate** is produced **on demand** from Today.
- **Packs** are unlocked by scanning the **QR code inside a physical card**. Owning a
  pack downloads its content for offline use. Buying more cards links out to an
  external shop — there is no in-app payment.
- Packs are grouped by **category**: Days out, Learning, Maths, Languages.

## 6. Screens

Phone viewport (design at 390×844, light). Eight screens.

### 6.1 Dashboard (home + menu)
The parent's hub. Contents, top to bottom:
- **Header:** "FLUMLUNK" wordmark (display, tracked), a small Bolo status (green dot +
  battery %, or "Muted"), a settings gear.
- **"What Bolo is doing right now"** — large. If a card is in: the animal name (display,
  huge) + a plain-language line ("Sharing something about the bonobo"). If listening:
  a pulsing "Listening… 3s". While a voice action is live, show its **tappable
  equivalents** ("Or tap for Bolo": Yes / No, or 1 · 2 · 3, or "Found it"). If no card:
  "Bolo is waiting."
- **If no packs owned yet:** a prominent enamel nudge card — "Unlock your first pack.
  Scan the QR inside your Bolo cards." with Scan / Browse buttons.
- **"Today with Bolo":** badges earned today as enamel pins, a photo strip, and a
  "See today's certificate" button.
- **Menu rows:** Your packs · Find more packs · Scan a card (each a full-width row with
  a hint and a chevron).
- **Volume ceiling** slider.

### 6.2 Store
Browse and preview packs to buy. Grouped by category (Days out, Learning, Maths,
Languages). Each pack is a **cover tile** (enamel colour, big motif, title in display,
subtitle, and a corner tag: "Ready offline" / "Owned" / "Locked"). Tapping expands a
detail: card count, a preview line of what Bolo says, and either "Get the cards"
(primary, opens external shop) + "Unlock with your card" (secondary → Scan), or an
"you own this" note. **No buy-in-app, no prices as pressure.**

### 6.3 Scan a card
Unlock a pack from the QR inside its cards.
- **Viewfinder** (full-width, 3:4) with a bright chalk **reticle** square and a legible
  caption: "Point the camera at the QR code inside your Bolo card."
- **Typed-code fallback:** "Or enter the code from your card" — an uppercase input +
  Unlock button.
- **Success state:** a big enamel tick, "Twycross Zoo unlocked", "Downloaded and ready
  to play offline", and buttons to see your packs / go home.

### 6.4 Library ("Your packs")
The packs the family owns, as cover tiles, each marked ready-for-offline. Tap a pack →
its Cards. Empty state invites scanning or browsing. A "Find more packs" link.

### 6.5 Cards
A chosen pack's cards, showing which have been **played today**. Each row: animal name
(display) + zone (e.g. "Bonobo Forest"), and a tag "Played" (enamel) or "Not yet"
(outline). **No progress bar, no "4 of 8".** Empty: "No cards played yet. Pop one in
Bolo's rucksack."

### 6.6 Camera
Opens on a photo moment or from the strip.
- **Full-bleed rear-camera viewfinder.**
- The photo **prompt overlaid, large and legible in sun** ("Stand where your grown-up
  can see the gibbons behind you. Now reach both arms up as wide as you can…").
- **One shutter.** No filters, no review, no retake. Capture and return immediately.

### 6.7 Certificate — the hero
Rendered on device, saved to the phone. **Designed to be posted** — a parent putting it
on Instagram is the whole marketing budget, and it promotes the zoo. It must look like
something a **zoo would actually issue**, not clip-art rosettes. 4:5 portrait
(1080×1350). Contains:
- Child's **first name** only, large (display).
- **Bolo, illustrated**, flat and on-brand.
- **Venue co-brand** (e.g. "TWYCROSS ZOO") in an enamel header bar.
- **Date**, long form ("1 August 2026").
- **Badges as struck enamel pins** — the only place brass appears.
- **A title that varies by achievement, never by rank** — *Primate Spotter*, *Junior
  Keeper*, *Chief Ape Watcher*. Never a count, never a percentage.
- **"Three things I learned"** — three short first-person lines ("Bonobos share their
  food to keep everyone calm.").
- **Bolo's paw print** as the signature.
- **FLUMLUNK** wordmark, small, bottom corner.
Also design the on-screen preview state (the rendered image + Save / Save as PDF /
Make a photo card / Start a new day buttons), and the empty state ("Once Bolo has met
an animal today, your certificate appears here.").

### 6.8 Settings
- Child's first name (optional).
- Volume ceiling slider.
- Mute Bolo (toggle).
- Gap length (dev slider) — the protected silence after each beat.
- **"Your data"** — a calm plain-language panel: everything stays on this phone,
  nothing is uploaded, no account, no location, packs stored locally.
- **Delete everything** — one clear confirmation ("This deletes every photo, badge,
  today and unlocked pack on this phone. It can't be undone, though you can scan your
  cards again.").

## 7. Component kit to design

- **Buttons:** primary (signal fill), secondary (outline), enamel (green fill), ghost
  (sunk chalk). Fully round, min height 56, uppercase-optional label.
- **Badge pin:** brass rim, enamel face, motif glyph, slight bevel.
- **Pack cover:** enamel-coloured tile, big motif, display title + subtitle, corner
  state tag.
- **Photo strip:** horizontal thumbnails with an enamel keyline.
- **Top bar:** enamel green, back chevron + screen title, optional right slot.
- **Menu row, toggle, slider, text input, category header, status pill.**

## 8. Copy voice

Active voice, sentence case, plain verbs. A button says what happens ("Take the photo",
not "Submit"). The same word all the way through a flow. Errors say what went wrong and
what to do, and never apologise or go vague. No pressure, anywhere.
