// Meritto (NoPaperForms) client accounts that leads can be pushed to.
// Each client has its own endpoint, college id, secret and on/off switch.

export type MerittoClientId = "gim" | "abbs";

export type MerittoClientConfig = {
  id: MerittoClientId;
  label: string;
  url: string;
  source: string;
  collegeId: string;
  secretEnv: string;
  switchKey: string;
};

export const MERITTO_CLIENTS: Record<MerittoClientId, MerittoClientConfig> = {
  gim: {
    id: "gim",
    label: "GIM",
    url: "https://api.in4.nopaperforms.com/dataporting/7080/bschoolbuzz",
    source: "bschoolbuzz",
    collegeId: "7080",
    secretEnv: "MERITTO_SECRET_KEY",
    switchKey: "meritto_integration",
  },
  abbs: {
    id: "abbs",
    label: "ABBS",
    url: "https://api.nopaperforms.com/dataporting/442/bschoolbuzz",
    source: "bschoolbuzz",
    collegeId: "442",
    secretEnv: "ABBS_MERITTO_SECRET_KEY",
    switchKey: "meritto_integration_abbs",
  },
};

/** Unknown or missing client ids fall back to GIM, the original integration. */
export function resolveMerittoClient(id?: unknown): MerittoClientConfig {
  return typeof id === "string" && id in MERITTO_CLIENTS ? MERITTO_CLIENTS[id as MerittoClientId] : MERITTO_CLIENTS.gim;
}
