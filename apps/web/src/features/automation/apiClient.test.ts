// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createAutomationApi } from "./apiClient";

describe("createAutomationApi", () => {
  it("respects the shared /api/v1 runtime base without duplicating it", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          meta: { limit: 20, offset: 10, total: 0 },
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );
    const api = createAutomationApi({
      baseUrl: "/api/v1",
      fetch: fetchMock,
    });

    await api.listRuns({ limit: 20, offset: 10 });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe("/api/v1/automation/runs?limit=20&offset=10");
    expect(requestInit?.headers).toBeDefined();
  });
});
