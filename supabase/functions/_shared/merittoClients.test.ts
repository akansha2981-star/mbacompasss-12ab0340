import { describe, expect, it } from "vitest";
import { resolveMerittoClient } from "./merittoClients";

describe("Meritto client routing", () => {
  it("ABBS leads go to the ABBS endpoint with college id 442", () => {
    const c = resolveMerittoClient("abbs");
    expect(c.url).toBe("https://api.nopaperforms.com/dataporting/442/bschoolbuzz");
    expect(c.collegeId).toBe("442");
    expect(c.source).toBe("bschoolbuzz");
    expect(c.secretEnv).toBe("ABBS_MERITTO_SECRET_KEY");
    expect(c.switchKey).toBe("meritto_integration_abbs");
  });
  it("website leads without a client still go to GIM (college id 7080)", () => {
    const c = resolveMerittoClient(undefined);
    expect(c.id).toBe("gim");
    expect(c.collegeId).toBe("7080");
    expect(c.switchKey).toBe("meritto_integration");
  });
  it("an unknown client never reaches ABBS", () => {
    expect(resolveMerittoClient("other").id).toBe("gim");
  });
});
