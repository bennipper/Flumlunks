# Prompt for Claude Design

Paste the block below into Claude's design tooling. It's self-contained. If your tool
lets you attach files, also attach `docs/DESIGN_BRIEF.md` for the full detail — but the
prompt stands on its own.

---

You are designing the **parent-facing app for Flumlunk**, a plush toy called **Bolo**
that talks to children about animals when they post NFC cards into its rucksack. The
first venue is **Twycross Zoo**. Design high-fidelity mobile UI screens.

**The single brief that drives every decision:** the child never looks at this screen —
design for an **adult, one-handed, in bright daylight, distracted, holding a coat and an
ice cream.** Prioritise legibility in sun, large tap targets, and calm confidence.
Pastel kids-app styling is wrong and will fail outdoors.

**Art direction — British enamel zoo signage:** Ordnance Survey legibility, vitreous
enamel colour, the vernacular of a 1930s direction sign. Flat, confident,
weatherproof-looking. No gradients, no gloss, no cartoon rounding.

**Palette (use exactly — each colour has one job):**
- `#10261E` ink — text, dark surfaces
- `#0F5C3F` enamel — headers, chrome, pack covers
- `#F7F5EE` chalk — background
- `#E8541F` signal (vermilion) — **actions only, never decorative**
- `#B8892B` brass — **badges only, nowhere else**
- `#5C6B63` slate — secondary text, disabled, hairlines

**Type:** display = a condensed grotesque, UPPERCASE with tight tracking (Oswald-like),
for card/animal names and titles only; body = a humanist sans (Inter-like), sentence
case, 17px min / 20px at arm's length.

**Form language:** zero corner radius on structural surfaces (panels, headers, cards);
fully round on tap targets (buttons, chips, toggles); minimum tap target 56×56.

**Signature element — the badge:** a struck enamel pin: brass rim, flat enamel-colour
face, a single bold motif glyph, a slight bevel, no gradient. It is the only place brass
appears, and the same artwork reappears on the certificate.

**Hard UX rules:** never show scores, counts, fractions, percentages, or empty "slots"
— show what happened, not what didn't (use "Played" / "Not yet", never "4 of 8"). No
pressure copy, no streaks, no notifications. Everything is local and private — no
account, first name only, nothing uploaded, no share button. Every spoken action Bolo
asks for must have an on-screen tappable equivalent. Empty states are warm invitations.

**Interaction model:** there is no "start/end the day" — the child drives play by posting
cards, and the app keeps an ambient "Today" that collects badges, photos and "things I
learned", producing a certificate on demand. Packs are unlocked by scanning the QR code
inside physical cards, grouped by category (Days out, Learning, Maths, Languages);
buying more cards links out to an external shop (no in-app payment).

**Deliverables — design these screens at a 390×844 phone viewport, light theme:**

1. **Dashboard (home + menu)** — FLUMLUNK wordmark + Bolo status + settings gear; a large
   "what Bolo is doing right now" area (animal name huge + plain line; a pulsing
   "Listening… 3s"; tappable equivalents "Yes / No" or "1 · 2 · 3"); a "Today with Bolo"
   block (badges as enamel pins + photo strip + "See today's certificate"); menu rows
   (Your packs · Find more packs · Scan a card); a volume slider. Also show the
   first-run variant with an enamel "Unlock your first pack" nudge.
2. **Store** — packs grouped by category as enamel cover tiles (big motif, display title,
   corner tag: Ready offline / Owned / Locked), with an expanded pack detail showing a
   preview line + "Get the cards" (external) and "Unlock with your card".
3. **Scan a card** — camera viewfinder with a bright reticle and legible caption, a
   typed-code fallback input, and a success state (big enamel tick + "Twycross Zoo
   unlocked · ready offline").
4. **Library (Your packs)** — owned packs as cover tiles marked ready-for-offline; a warm
   empty state.
5. **Cards** — a pack's cards as rows (animal name + zone) tagged "Played" or "Not yet";
   no progress bar.
6. **Camera** — full-bleed rear viewfinder, the photo prompt overlaid large and legible in
   sun, a single shutter, no filters/review.
7. **Certificate** — the hero. A 4:5 (1080×1350) certificate a zoo would actually issue,
   designed to be posted to Instagram: child's first name, an illustrated flat Bolo, an
   enamel "TWYCROSS ZOO" co-brand header, a long-form date, badges as struck enamel pins,
   an achievement title (e.g. "Chief Ape Watcher" — never a count), "Three things I
   learned" (three short first-person lines), Bolo's paw-print signature, and a small
   FLUMLUNK wordmark. Also show the in-app preview screen with Save / Save as PDF / Make a
   photo card buttons.
8. **Settings** — first name, volume ceiling, mute toggle, a calm "Your data" panel
   (local only, nothing uploaded, no account, no location), and "Delete everything" with
   one confirmation.

Also produce a small **component sheet**: buttons (primary/secondary/enamel/ghost), the
badge pin, a pack cover, the photo strip, the top bar with back chevron, a menu row, a
toggle, and a text input.

Deliver a cohesive system — consistent spacing, one type scale, the palette used exactly
as specified. Make the **certificate and the badge** the moments of craft; make
everything else quiet, legible, and sure-footed in daylight.
