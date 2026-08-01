import type { Beat, Card, Pack } from "./schema";

/**
 * Pack linter rules (BUILD.md §6). Kept separate from the CLI (scripts/lint-pack.ts)
 * so tests can drive the exact same logic against fixtures. Each rule returns
 * zero or more human-readable problems. `lintPack` runs them all.
 *
 * The most important rule is `loud`-on-`noiseSensitive`: Twycross is a great ape
 * zoo, and a loud beat near primates is a welfare issue that would end the
 * licensing conversation. This linter is the guarantee we show them.
 */

export type LintProblem = { rule: string; message: string };

/**
 * Named Twycross individuals that must never appear in a transcript — they die
 * and get transferred, so a pack that names one dates instantly and, worse, can
 * be wrong in front of a grieving child. Maintained by hand (BUILD.md §6).
 */
export const NAMED_ANIMAL_BLOCKLIST = [
  "Kianga",
  "Kijani",
  "Lomela",
  "Cheka",
  "Oumbi",
  "Kaicho",
  "Molaison",
  "Riziki",
  "Nakima",
  "Bawang",
];

function allBeats(pack: Pack): { card: Card; beat: Beat }[] {
  const out: { card: Card; beat: Beat }[] = [];
  for (const card of pack.cards) {
    for (const beat of card.core) out.push({ card, beat });
    for (const beat of card.deep) out.push({ card, beat });
  }
  return out;
}

/** All transcript text a beat carries, by resolving its audioIds to transcripts. */
function beatTranscripts(pack: Pack, beat: Beat): string[] {
  const ids: string[] = [beat.audioId];
  switch (beat.kind) {
    case "lookFor":
      ids.push(beat.notVisibleAudioId);
      break;
    case "energy":
      ids.push(beat.successAudioId);
      break;
    case "choice":
      ids.push(beat.correctAudioId, beat.wrongAudioId);
      break;
    case "yesNo":
      ids.push(beat.yesAudioId, beat.noAudioId);
      break;
    default:
      break;
  }
  return ids.map((id) => pack.audio[id]).filter((t): t is string => Boolean(t));
}

/** The word a beat expects the child to say, if any (BUILD.md §6 vocabulary rule). */
function expectedAnswers(card: Card, beat: Beat): string[] {
  switch (beat.kind) {
    case "recognition":
      // Recognition can be triggered by the card's keyword if it has one.
      return card.keyword ? [card.keyword] : [];
    case "signHunt":
      return [beat.word];
    case "yesNo":
      return ["yes", "no"];
    default:
      return [];
  }
}

const RULES: ((pack: Pack) => LintProblem[])[] = [
  // Required approval fields.
  (pack) => {
    const p: LintProblem[] = [];
    if (!pack.approvedBy || !pack.approvedBy.trim())
      p.push({ rule: "approval", message: "Pack is missing approvedBy." });
    if (!pack.approvedAt || !pack.approvedAt.trim())
      p.push({ rule: "approval", message: "Pack is missing approvedAt." });
    return p;
  },

  // A `loud` energy beat on a noiseSensitive card is a welfare violation.
  (pack) =>
    allBeats(pack)
      .filter(
        ({ card, beat }) =>
          card.noiseSensitive && beat.kind === "energy" && beat.mode === "loud"
      )
      .map(({ card, beat }) => ({
        rule: "loud-near-primates",
        message: `Card "${card.id}" is noiseSensitive but beat "${beat.id}" is a loud energy beat. Loud beats near primates are a welfare issue.`,
      })),

  // A beat whose expected answer is outside pack.vocabulary.
  (pack) => {
    const vocab = new Set(pack.vocabulary.map((w) => w.toLowerCase()));
    const p: LintProblem[] = [];
    for (const { card, beat } of allBeats(pack)) {
      for (const answer of expectedAnswers(card, beat)) {
        if (!vocab.has(answer.toLowerCase())) {
          p.push({
            rule: "out-of-vocabulary",
            message: `Beat "${beat.id}" on card "${card.id}" expects "${answer}", which is not in the pack vocabulary.`,
          });
        }
      }
    }
    return p;
  },

  // A choice beat whose transcript names the options rather than "say one, two or three".
  (pack) => {
    const p: LintProblem[] = [];
    const optionNamer = /\b(press|say|choose|pick|tap)\b/i;
    for (const { card, beat } of allBeats(pack)) {
      if (beat.kind !== "choice") continue;
      const prompt = pack.audio[beat.audioId] ?? "";
      const mentionsNumberWords = /\b(one|two|three)\b/i.test(prompt);
      if (optionNamer.test(prompt) && !mentionsNumberWords) {
        p.push({
          rule: "choice-names-options",
          message: `Choice beat "${beat.id}" on card "${card.id}" should ask the child to "say one, two or three", not name the options.`,
        });
      }
    }
    return p;
  },

  // Any question mark in a transcript that isn't a closed question.
  // A closed question is answerable yes/no or with one of an enumerated set. We
  // approximate: a "?" is allowed only in yesNo prompts or transcripts that
  // offer "one, two or three". Everything else with a "?" is flagged.
  (pack) => {
    const p: LintProblem[] = [];
    for (const { card, beat } of allBeats(pack)) {
      const prompt = pack.audio[beat.audioId] ?? "";
      if (!prompt.includes("?")) continue;
      const isClosed =
        beat.kind === "yesNo" ||
        (beat.kind === "choice" && /\b(one|two|three)\b/i.test(prompt));
      if (!isClosed) {
        p.push({
          rule: "open-question",
          message: `Beat "${beat.id}" on card "${card.id}" has a question mark but is not a closed question: "${prompt}"`,
        });
      }
    }
    return p;
  },

  // A lookFor beat with no notVisibleAudioId. (Schema enforces presence, but keep
  // the rule so an empty string is also caught.)
  (pack) =>
    allBeats(pack)
      .filter(
        ({ beat }) =>
          beat.kind === "lookFor" &&
          (!beat.notVisibleAudioId || !beat.notVisibleAudioId.trim())
      )
      .map(({ card, beat }) => ({
        rule: "lookfor-missing-notvisible",
        message: `lookFor beat "${beat.id}" on card "${card.id}" has no notVisibleAudioId.`,
      })),

  // A card with no fact beat, or a fact beat with no learnedLine.
  (pack) => {
    const p: LintProblem[] = [];
    for (const card of pack.cards) {
      const facts = card.core.filter((b) => b.kind === "fact");
      if (facts.length === 0) {
        p.push({
          rule: "card-missing-fact",
          message: `Card "${card.id}" has no fact beat in its core stack.`,
        });
      }
      for (const beat of [...card.core, ...card.deep]) {
        if (beat.kind === "fact" && (!beat.learnedLine || !beat.learnedLine.trim())) {
          p.push({
            rule: "fact-missing-learnedline",
            message: `Fact beat "${beat.id}" on card "${card.id}" has no learnedLine.`,
          });
        }
      }
    }
    return p;
  },

  // A named individual animal in any transcript.
  (pack) => {
    const p: LintProblem[] = [];
    for (const { card, beat } of allBeats(pack)) {
      for (const transcript of beatTranscripts(pack, beat)) {
        for (const name of NAMED_ANIMAL_BLOCKLIST) {
          const re = new RegExp(`\\b${name}\\b`, "i");
          if (re.test(transcript)) {
            p.push({
              rule: "named-individual",
              message: `Beat "${beat.id}" on card "${card.id}" names an individual animal ("${name}"): individuals die and get transferred.`,
            });
          }
        }
      }
    }
    return p;
  },

  // An audioId with no manifest entry.
  (pack) => {
    const p: LintProblem[] = [];
    const referenced = new Set<string>();
    const push = (id?: string) => id && referenced.add(id);
    for (const { beat } of allBeats(pack)) {
      push(beat.audioId);
      if (beat.kind === "lookFor") push(beat.notVisibleAudioId);
      if (beat.kind === "energy") push(beat.successAudioId);
      if (beat.kind === "choice") {
        push(beat.correctAudioId);
        push(beat.wrongAudioId);
      }
      if (beat.kind === "yesNo") {
        push(beat.yesAudioId);
        push(beat.noAudioId);
      }
    }
    for (const id of referenced) {
      if (!(id in pack.audio)) {
        p.push({
          rule: "missing-audio",
          message: `audioId "${id}" is referenced by a beat but has no manifest entry.`,
        });
      }
    }
    return p;
  },
];

export function lintPack(pack: Pack): LintProblem[] {
  return RULES.flatMap((rule) => rule(pack));
}
