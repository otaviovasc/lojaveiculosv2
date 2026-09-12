import { describe, expect, it, vi } from "vitest";
import { createReportsApi } from "./apiClient";

describe("reports API client", () => {
  it("downloads the selected executive report PDF and keeps its file name", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response("%PDF-1.7 report", {
          headers: {
            "content-disposition":
              'attachment; filename="relatorio-executivo-2026-06.pdf"',
            "content-type": "application/pdf",
          },
        }),
    );
    const api = createReportsApi({ baseUrl: "/api/v1", fetch });

    const report = await api.downloadExecutiveReport({
      from: "2026-06-01",
      to: "2026-06-30",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "/api/v1/analytics/dashboard.pdf?from=2026-06-01&to=2026-06-30",
    );
    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({
      "Content-Type": "application/json",
    });
    expect(report.fileName).toBe("relatorio-executivo-2026-06.pdf");
    expect(report.blob.type).toBe("application/pdf");
  });
});
