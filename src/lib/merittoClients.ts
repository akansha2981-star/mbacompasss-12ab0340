// Admin-side view of the Meritto accounts leads can be pushed to.
// The edge function holds the endpoints and secrets (supabase/functions/_shared/merittoClients.ts).
export type MerittoClientId = "gim" | "abbs";

export const MERITTO_CLIENT_UI: Record<MerittoClientId, { label: string; switchKey: string; autoWebsiteLeads: boolean; requiresSpecialization: boolean }> = {
  gim: { label: "GIM", switchKey: "meritto_integration", autoWebsiteLeads: true, requiresSpecialization: false },
  abbs: { label: "ABBS", switchKey: "meritto_integration_abbs", autoWebsiteLeads: false, requiresSpecialization: true },
};

/** Course value ABBS's Meritto uses for its PGDM specializations. */
export const ABBS_MERITTO_COURSE = "Post Graduate Programs";

/** Exact specialization values configured in ABBS's Meritto (spelling and spacing must match). */
export const ABBS_MERITTO_SPECIALIZATIONS = [
  "PGDM (Working Professionals)",
  "PGDM- Business Analytics, AI & Decision Sciences",
  "PGDM-Digital Business & Martech",
  "PGDM-Entrepreneurship & Family Business",
  "PGDM-Fintech & Wealth Management",
  "PGDM- People, Culture & Organisational Excellence",
  "PGDM-Sustainable Business, Resilience & ESG Leadership",
  "PGDM- Supply Chain Analytics & Operations Excellence",
  "PGDM-Global Business, Geopolitics & Strategic Management",
  "PGDM-Global Immersion program",
] as const;

export const MERITTO_CLIENT_OPTIONS: Record<MerittoClientId, { defaultCourse: string | null; specializations: readonly string[] }> = {
  gim: { defaultCourse: null, specializations: [] },
  abbs: { defaultCourse: ABBS_MERITTO_COURSE, specializations: ABBS_MERITTO_SPECIALIZATIONS },
};

const looseKey = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Maps a typed or CSV specialization to the client's exact value; returns "" when it matches none. */
export function canonicalSpecialization(client: MerittoClientId, value?: string | null): string {
  const v = (value ?? "").trim();
  const list = MERITTO_CLIENT_OPTIONS[client].specializations;
  if (!list.length) return v;
  if (!v) return "";
  return list.find((s) => looseKey(s) === looseKey(v)) ?? "";
}

/** Client-specific check before sending: ABBS's Meritto rejects leads without one of its specializations. */
export function merittoClientFieldError(client: MerittoClientId, lead: { specialization?: string | null }): string | null {
  if (!MERITTO_CLIENT_UI[client].requiresSpecialization) return null;
  if (!(lead.specialization ?? "").trim()) return "Specialization is required";
  if (!canonicalSpecialization(client, lead.specialization)) return "Specialization is not one of ABBS's options";
  return null;
}
