// Shared definitions for the CAT cut-off college table shown on the
// CAT score calculator page and managed from the admin panel.

export interface CutoffBand {
  key: string;
  label: string;
  short: string;
}

export const CUTOFF_BANDS: CutoffBand[] = [
  { key: "97-99", label: "97 to 99%tile", short: "97–99" },
  { key: "95-97", label: "95 to 97%tile", short: "95–97" },
  { key: "90-95", label: "90 to 95%tile", short: "90–95" },
  { key: "80-90", label: "80 to 90%tile", short: "80–90" },
  { key: "70-80", label: "70 to 80%tile", short: "70–80" },
  { key: "60-70", label: "60 to 70%tile", short: "60–70" },
  { key: "55-60", label: "55 to 60%tile", short: "55–60" },
  { key: "no-sectional", label: "B-Schools with no Sectional CutOff", short: "No sectional cut-off" },
  { key: "profile-based", label: "Profile Based B-Schools", short: "Profile based" },
];

export const BAND_KEYS = CUTOFF_BANDS.map((b) => b.key);

export const bandLabel = (key: string) => CUTOFF_BANDS.find((b) => b.key === key)?.label ?? key;

export interface CatCutoffCollege {
  id: string;
  college_name: string;
  cutoff_band: string;
  cutoff_tags?: string[];
  overall_percentile: string;
  fees: string;
  highest_package: string;
  average_package: string;
  apply_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CatCutoffCollegeInput {
  college_name: string;
  cutoff_band: string;
  cutoff_tags?: string[];
  overall_percentile: string;
  fees: string;
  highest_package: string;
  average_package: string;
  apply_url: string;
  sort_order?: number;
  is_active?: boolean;
}

export const emptyCutoffRow = (band: string): CatCutoffCollegeInput => ({
  college_name: "",
  cutoff_band: band,
  overall_percentile: "",
  fees: "",
  highest_package: "",
  average_package: "",
  apply_url: "",
});

/** All filters a college appears under (tags, falling back to its primary band). */
export const collegeTags = (c: { cutoff_band: string; cutoff_tags?: string[] | null }): string[] => {
  const t = (c.cutoff_tags || []).filter((k) => BAND_KEYS.includes(k));
  return t.length ? t : [c.cutoff_band];
};
