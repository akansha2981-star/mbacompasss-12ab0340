// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscribe: vi.fn(() => { throw new Error("WebSocket not available: Failed to construct WebSocket"); }),
  select: vi.fn().mockResolvedValue({ data: [
    { cta_key: "college_download_brochure", requires_login: true },
    { cta_key: "public_action", requires_login: false },
  ] }),
  insert: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  channel: () => ({ on: () => ({ subscribe: mocks.subscribe }) }),
  from: () => ({ select: mocks.select, insert: mocks.insert }),
} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
import { useCtaGate } from "./useCtaGate";

afterEach(cleanup);
describe("CTA settings with unavailable WebSocket", () => {
  it("loads saved login rules and keeps gated actions blocked without crashing", async () => {
    const { result } = renderHook(() => useCtaGate("college_download_brochure"));
    await waitFor(() => expect(result.current.requiresLogin).toBe(true));
    const action = vi.fn();
    const login = vi.fn();
    window.addEventListener("open-login-dialog", login);
    try {
      act(() => result.current.gate(action)());
      expect(action).not.toHaveBeenCalled();
      expect(login).toHaveBeenCalledTimes(1);
      expect(mocks.select).toHaveBeenCalledTimes(1);
    } finally { window.removeEventListener("open-login-dialog", login); }
  });
  it("keeps ungated actions usable and does not repeatedly attempt the failed connection", async () => {
    const { result } = renderHook(() => useCtaGate("public_action"));
    await waitFor(() => expect(result.current.requiresLogin).toBe(false));
    const action = vi.fn();
    act(() => result.current.gate(action)());
    expect(action).toHaveBeenCalledTimes(1);
    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
  });
});