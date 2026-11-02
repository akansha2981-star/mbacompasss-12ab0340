import { describe, it, expect } from "vitest";
import { deriveCatSlot } from "./catSlot";

describe("deriveCatSlot", () => {
  it("morning is Slot 1", () => expect(deriveCatSlot("8:30 AM - 10:30 AM")).toBe("Slot 1"));
  it("midday is Slot 2", () => expect(deriveCatSlot("12:30 PM - 2:30 PM")).toBe("Slot 2"));
  it("afternoon is Slot 3", () => expect(deriveCatSlot("4:30 PM - 6:30 PM")).toBe("Slot 3"));
  it("missing time gives null", () => expect(deriveCatSlot("")).toBeNull());
});
