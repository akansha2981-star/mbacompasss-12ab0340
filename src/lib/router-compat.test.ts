import { describe, expect, it } from "vitest";
import { decodeCompatSearchValue, encodeCompatSearchValue } from "./router-compat";

describe("router-compat search values", () => {
  it("reads a JSON-quoted rating from an older shared link as 4.5", () => {
    expect(decodeCompatSearchValue('"4.5"')).toBe("4.5");
  });
  it("writes a decimal rating as a number so the URL shows rating=4.5", () => {
    expect(encodeCompatSearchValue("4.5")).toBe(4.5);
  });
  it("keeps leading-zero codes as strings", () => {
    expect(encodeCompatSearchValue("007")).toBe("007");
  });
  it("keeps fee bucket names unchanged", () => {
    expect(encodeCompatSearchValue("under-1l")).toBe("under-1l");
    expect(decodeCompatSearchValue("under-1l")).toBe("under-1l");
  });
});
