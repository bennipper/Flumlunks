import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

/**
 * BUILD.md §14: grep the built bundle and fail on any fetch/XHR to a non-local
 * origin, any reference to geolocation, or any analytics domain. Crude, but it's the
 * guard on the hard rules (§2). We build first so the assertion runs against the
 * exact code that ships.
 */

const root = resolve(__dirname, "..");
const distAssets = resolve(root, "dist/assets");

// Hosts that appear only as strings (error links, XML namespaces) — never fetched.
const ALLOWED_HOSTS = ["www.w3.org", "reactjs.org", "react.dev", "github.com", "fb.me"];

const ANALYTICS = [
  "google-analytics",
  "googletagmanager",
  "segment.io",
  "segment.com",
  "mixpanel",
  "amplitude",
  "sentry.io",
  "doubleclick",
  "facebook.net",
  "hotjar",
  "fullstory",
];

let bundle = "";

beforeAll(() => {
  if (!existsSync(distAssets)) {
    execSync("npm run build", { cwd: root, stdio: "ignore" });
  }
  bundle = readdirSync(distAssets)
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(resolve(distAssets, f), "utf8"))
    .join("\n");
  expect(bundle.length).toBeGreaterThan(0);
}, 120000);

describe("no forbidden paths in the built bundle", () => {
  it("never references geolocation (hard rule §8)", () => {
    expect(bundle).not.toMatch(/geolocation/i);
  });

  it("contains no analytics domains (hard rule §4)", () => {
    for (const domain of ANALYTICS) {
      expect(bundle, `analytics domain "${domain}" must not appear`).not.toContain(
        domain
      );
    }
  });

  it("makes no fetch or XHR to a literal external origin (hard rules §1, §2)", () => {
    expect(bundle).not.toMatch(/fetch\(\s*["'`]https?:\/\//);
    expect(bundle).not.toContain("XMLHttpRequest");
  });

  it("embeds no external host URLs beyond known error/namespace strings", () => {
    const urls = bundle.match(/https?:\/\/[^\s"'`)]+/g) ?? [];
    const offenders = urls
      .map((u) => {
        try {
          return new URL(u).host;
        } catch {
          return "";
        }
      })
      .filter((host) => host && !ALLOWED_HOSTS.includes(host));
    expect([...new Set(offenders)]).toEqual([]);
  });
});
