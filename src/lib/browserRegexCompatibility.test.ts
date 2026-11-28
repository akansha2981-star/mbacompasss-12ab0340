import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicModules = [
  "src/lib/aeoSchema.ts",
  "src/lib/blogSeoScore.ts",
  "src/lib/editorialReadability.ts",
  "src/components/roi/NarrativeBlock.tsx",
  "src/lib/editorialLinks.ts",
];

describe("older Safari regex compatibility", () => {
  it.each(publicModules)("%s contains no regular-expression lookbehind", (path) => {
    const source = readFileSync(resolve(process.cwd(), path), "utf8");
    expect(source).not.toMatch(/\(\?<[=!]/);
  });
});
