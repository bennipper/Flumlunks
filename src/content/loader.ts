import { packSchema, type Pack } from "./schema";
import { lintPack } from "./lint";

/**
 * Pack loader (BUILD.md §6). Loads and validates; refuses malformed packs. A pack
 * is only trusted if it (a) parses against the schema and (b) passes every lint
 * rule. The lint gate is defence in depth: `npm run lint:pack` fails the build,
 * but we refuse to run a bad pack at load too, so a welfare violation can never
 * reach a child even if the build check were skipped.
 */

export class PackError extends Error {
  constructor(
    message: string,
    readonly problems: string[]
  ) {
    super(message);
    this.name = "PackError";
  }
}

export function loadPack(raw: unknown): Pack {
  const parsed = packSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
    );
    throw new PackError("Pack failed schema validation.", problems);
  }

  const problems = lintPack(parsed.data);
  if (problems.length > 0) {
    throw new PackError(
      "Pack failed content lint.",
      problems.map((p) => `[${p.rule}] ${p.message}`)
    );
  }

  return parsed.data;
}
