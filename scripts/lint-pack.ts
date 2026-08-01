import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { packSchema } from "../src/content/schema.ts";
import { lintPack } from "../src/content/lint.ts";

/**
 * `npm run lint:pack` (BUILD.md §6). Fails the build on any lint violation or a
 * pack that does not match the schema. This is the guarantee we can show a venue.
 */

const here = dirname(fileURLToPath(import.meta.url));
const packPath = resolve(here, "../src/content/packs/twycross/pack.json");

function fail(header: string, lines: string[]): never {
  console.error(`\n✗ ${header}\n`);
  for (const line of lines) console.error(`  • ${line}`);
  console.error("");
  process.exit(1);
}

const raw: unknown = JSON.parse(readFileSync(packPath, "utf8"));

const parsed = packSchema.safeParse(raw);
if (!parsed.success) {
  fail(
    "Pack failed schema validation",
    parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
  );
}

const problems = lintPack(parsed.data);
if (problems.length > 0) {
  fail(
    `Pack failed content lint (${problems.length} problem${problems.length === 1 ? "" : "s"})`,
    problems.map((p) => `[${p.rule}] ${p.message}`)
  );
}

console.log(
  `\n✓ Pack "${parsed.data.id}" v${parsed.data.version} passed schema + ${parsed.data.cards.length} cards linted clean.\n`
);
