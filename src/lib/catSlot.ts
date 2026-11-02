/** Derive the CAT slot (1/2/3) from the response sheet's "Test Time" text. */
export function deriveCatSlot(testTime: string | null | undefined): string | null {
  if (!testTime) return null;
  const m = testTime.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (h < 11) return "Slot 1";
  if (h < 15) return "Slot 2";
  return "Slot 3";
}
