import { z } from "zod";

/**
 * Content pack schemas (BUILD.md §6). One pack = one venue. Immutable, versioned,
 * human-approved, validated on load. These schemas are the runtime gate: a pack
 * that does not parse is refused (see loader.ts). Welfare and safety rules that
 * need cross-field reasoning live in the linter (scripts/lint-pack.ts).
 */

export const beatSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("recognition"),
    id: z.string().min(1),
    audioId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("lookFor"),
    id: z.string().min(1),
    audioId: z.string().min(1),
    notVisibleAudioId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("fact"),
    id: z.string().min(1),
    audioId: z.string().min(1),
    learnedLine: z.string().min(1),
  }),
  z.object({
    kind: z.literal("energy"),
    id: z.string().min(1),
    audioId: z.string().min(1),
    mode: z.enum(["quiet", "claps", "loud"]),
    threshold: z.number(),
    claps: z.number().int().positive().optional(),
    successAudioId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("choice"),
    id: z.string().min(1),
    audioId: z.string().min(1),
    options: z.union([z.literal(2), z.literal(3)]),
    correct: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    correctAudioId: z.string().min(1),
    wrongAudioId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("yesNo"),
    id: z.string().min(1),
    audioId: z.string().min(1),
    yesAudioId: z.string().min(1),
    noAudioId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("photo"),
    id: z.string().min(1),
    audioId: z.string().min(1),
    prompt: z.string().min(1),
    style: z.enum(["action", "detail", "bolo"]),
  }),
  z.object({
    kind: z.literal("signHunt"),
    id: z.string().min(1),
    audioId: z.string().min(1),
    word: z.string().min(1),
  }),
  z.object({
    kind: z.literal("badge"),
    id: z.string().min(1),
    audioId: z.string().min(1),
  }),
]);

export const cardSchema = z.object({
  id: z.string().min(1),
  animal: z.string().min(1),
  zone: z.string().min(1),
  keyword: z.string().optional(),
  noiseSensitive: z.boolean(),
  core: z.array(beatSchema).min(1),
  deep: z.array(beatSchema),
  badgeId: z.string().optional(),
});

export const badgeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  animal: z.string().min(1),
  /** Enamel colour for the pin face; brass rim is applied by the renderer. */
  colour: z.string().min(1),
  /** Single glyph / short motif drawn on the pin face. */
  motif: z.string().min(1),
});

export const packSchema = z.object({
  id: z.literal("twycross"),
  version: z.string().min(1),
  venueName: z.literal("Twycross Zoo"),
  approvedBy: z.string().min(1),
  approvedAt: z.string().min(1),
  vocabulary: z.array(z.string().min(1)),
  cards: z.array(cardSchema).min(1),
  badges: z.array(badgeSchema),
  audio: z.record(z.string(), z.string()),
});

export type Beat = z.infer<typeof beatSchema>;
export type BeatKind = Beat["kind"];
export type Card = z.infer<typeof cardSchema>;
export type Badge = z.infer<typeof badgeSchema>;
export type Pack = z.infer<typeof packSchema>;
