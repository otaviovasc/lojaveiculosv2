// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { useCrmWhatsappConnections } from "./useCrmWhatsappConnections";

describe("useCrmWhatsappConnections", () => {
  it("does not let an older refresh failure replace a newer success", async () => {
    let rejectInitial!: (error: Error) => void;
    let resolveRefresh!: (
      payload: ReturnType<typeof connectionPayload>,
    ) => void;
    const initial = new Promise<ReturnType<typeof connectionPayload>>(
      (_, reject) => {
        rejectInitial = reject;
      },
    );
    const refresh = new Promise<ReturnType<typeof connectionPayload>>(
      (resolve) => {
        resolveRefresh = resolve;
      },
    );
    const listConnections = vi
      .fn()
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(refresh);
    const api = { listConnections } as unknown as CrmWhatsappApi;
    const { result } = renderHook(() => useCrmWhatsappConnections(api));

    let refreshPromise!: Promise<void>;
    await act(async () => {
      refreshPromise = result.current.refreshConnections();
      resolveRefresh(connectionPayload("newer"));
      await refreshPromise;
      rejectInitial(new Error("old failure"));
    });

    await waitFor(() => {
      expect(result.current.connections).toEqual([
        expect.objectContaining({ id: "newer" }),
      ]);
    });
    expect(result.current.error).toBeNull();
  });
});

function connectionPayload(id: string) {
  return {
    allowance: { limit: 1, remaining: 0, used: 1 },
    availableProviders: [],
    connections: [
      {
        id,
        live: {
          checkedAt: "2026-08-10T12:00:00.000Z",
          connected: false,
          connectedPhone: null,
          providerStatus: "disconnected",
          smartphoneConnected: false,
        },
      },
    ],
  };
}
