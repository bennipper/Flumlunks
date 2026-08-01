import type { VoiceResult } from "./BoloDevice";

/**
 * Voice vocabulary + grammar validation (BUILD.md §5). In the real toy this is
 * the keyword spotter's grammar; in the prototype it defines which words the debug
 * panel's voice injector offers and validates that an injected/recognised keyword
 * is actually in the active pack's vocabulary.
 *
 * There is no web keyword spotting in this prototype (BUILD.md §5). Keyword results
 * are always injected; only energy beats can use the real mic.
 */

let vocabulary: string[] = [];

export function setVocabulary(words: string[]): void {
  vocabulary = words.map((w) => w.trim().toLowerCase()).filter(Boolean);
}

export function getVocabulary(): string[] {
  return [...vocabulary];
}

export function isInVocabulary(word: string): boolean {
  return vocabulary.includes(word.trim().toLowerCase());
}

/**
 * Normalise a recognised word to its vocabulary form, or null if out of grammar.
 * The real device must never surface a keyword the pack didn't declare.
 */
export function normaliseKeyword(word: string): string | null {
  const w = word.trim().toLowerCase();
  return vocabulary.includes(w) ? w : null;
}

export function makeKeywordResult(word: string, confidence = 0.95): VoiceResult {
  return { kind: "keyword", word: word.trim().toLowerCase(), confidence };
}
