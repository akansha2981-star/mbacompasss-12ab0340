import { describe, expect, it, vi } from "vitest";
import { ensureFreebieFileAccess } from "./freebieFileAccess";

function mockClient(error: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error });
  const from = vi.fn().mockReturnValue({ upsert });
  return { client: { from } as unknown as Parameters<typeof ensureFreebieFileAccess>[0], from, upsert };
}

describe("freebie file access", () => {
  it("claims only the selected resource for the signed-in user", async () => {
    const { client, from, upsert } = mockClient();
    await ensureFreebieFileAccess(client, "user-a", "resource-b");
    expect(from).toHaveBeenCalledWith("freebie_file_access");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-a", freebie_id: "resource-b" },
      { onConflict: "user_id,freebie_id", ignoreDuplicates: true },
    );
  });

  it("fails closed without exposing internal permission errors", async () => {
    const { client } = mockClient({ message: "internal policy details" });
    await expect(ensureFreebieFileAccess(client, "user-a", "unpublished"))
      .rejects.toThrow("Unable to authorize this resource download. Please try again.");
  });
});