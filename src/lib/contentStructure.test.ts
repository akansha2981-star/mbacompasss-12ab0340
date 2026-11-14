import { describe, expect, it } from "vitest";
import { normalizeTableSemantics } from "./contentStructure";

describe("normalizeTableSemantics", () => {
  it("adds scope to header cells", () => {
    expect(normalizeTableSemantics("<tr><th>Factor</th></tr>")).toBe('<tr><th scope="col">Factor</th></tr>');
  });
  it("keeps thead intact instead of turning it into a header cell", () => {
    const out = normalizeTableSemantics("<table><thead><tr><th>Exam</th></tr></thead></table>");
    expect(out).toBe('<table><thead><tr><th scope="col">Exam</th></tr></thead></table>');
  });
});
