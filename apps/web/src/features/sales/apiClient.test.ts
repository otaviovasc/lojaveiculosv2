import { describe, expect, it, vi } from "vitest";
import { createSalesApi } from "./apiClient";

describe("createSalesApi", () => {
  it("posts the required reason to the dedicated reversion endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "sale_correction", revision: 2 }), {
        headers: { "content-type": "application/json" },
        status: 201,
      }),
    );
    const api = createSalesApi({
      auth: { clerkUserId: "user_1", storeSlug: "qa-store" },
      baseUrl: "/api/v1",
      fetch: fetchMock,
    });

    await expect(
      api.revert("sale_original", "Corrigir nome do comprador"),
    ).resolves.toMatchObject({ id: "sale_correction", revision: 2 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/sales/sale_original/revert",
      expect.objectContaining({
        body: JSON.stringify({ reason: "Corrigir nome do comprador" }),
        method: "POST",
      }),
    );
  });
});
