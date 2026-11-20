// Admin-side view of the Meritto accounts leads can be pushed to.
// The edge function holds the endpoints and secrets (supabase/functions/_shared/merittoClients.ts).
export type MerittoClientId = "gim" | "abbs";

export const MERITTO_CLIENT_UI: Record<MerittoClientId, { label: string; switchKey: string; autoWebsiteLeads: boolean }> = {
  gim: { label: "GIM", switchKey: "meritto_integration", autoWebsiteLeads: true },
  abbs: { label: "ABBS", switchKey: "meritto_integration_abbs", autoWebsiteLeads: false },
};
