/** Average of the top `pct` share of scores (at least one score). Returns null with no data. */
export function topShareAverage(scores: number[], pct: number): number | null {
  if (!scores.length) return null;
  const sorted = [...scores].sort((a, b) => b - a);
  const n = Math.max(1, Math.ceil((sorted.length * pct) / 100));
  const slice = sorted.slice(0, n);
  return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10;
}

export function cohortAverages(scores: number[]) {
  return {
    top10: topShareAverage(scores, 10),
    top25: topShareAverage(scores, 25),
    top50: topShareAverage(scores, 50),
    overall: topShareAverage(scores, 100),
  };
}
