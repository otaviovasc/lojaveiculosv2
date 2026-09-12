// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import { createFiscalApi } from "./apiClient";

describe("fiscal api official artifact downloads", () => {
  it.each([
    ["pdf", "application/pdf", "%PDF-1.7 official"],
    ["xml", "application/xml", '<?xml version="1.0"?><nfe />'],
  ] as const)(
    "reads %s bytes and a server-owned filename",
    async (format, type, body) => {
      const fetcher = vi.fn<typeof fetch>(
        async () =>
          new Response(body, {
            headers: {
              "content-disposition": `attachment; filename=\"nfe-oficial.${format}\"`,
              "content-type": type,
            },
          }),
      );
      const api = createFiscalApi({
        auth: {
          accessToken: "access_token",
          clerkUserId: "user_1",
          storeSlug: "loja-teste",
        },
        baseUrl: "https://api.example.test/api/v1",
        fetch: fetcher,
      });

      const artifact = await api.downloadDocumentArtifact("document/1", format);

      expect(artifact.fileName).toBe(`nfe-oficial.${format}`);
      expect(artifact.contentType).toBe(type);
      await expect(artifact.blob.text()).resolves.toBe(body);
      expect(fetcher).toHaveBeenCalledWith(
        `https://api.example.test/api/v1/fiscal/documents/document%2F1/artifacts/${format}`,
        {
          headers: {
            Authorization: "Bearer access_token",
            "x-clerk-user-id": "user_1",
            "x-store-slug": "loja-teste",
          },
        },
      );
    },
  );

  it("preserves the API request id when the official artifact is unavailable", async () => {
    const api = createFiscalApi({
      fetch: vi.fn<typeof fetch>(async () =>
        Response.json(
          {
            code: "FISCAL_ARTIFACT_UNAVAILABLE",
            message: "Official artifact unavailable.",
            requestId: "request_123",
          },
          { status: 409 },
        ),
      ),
    });

    const error = await api
      .downloadDocumentArtifact("document_1", "pdf")
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(AppApiError);
    expect(error).toMatchObject({
      code: "FISCAL_ARTIFACT_UNAVAILABLE",
      requestId: "request_123",
      status: 409,
    });
  });

  it("rejects an empty or mislabeled success response", async () => {
    const api = createFiscalApi({
      fetch: vi.fn<typeof fetch>(
        async () =>
          new Response("<html>not a pdf</html>", {
            headers: { "content-type": "text/html" },
          }),
      ),
    });

    await expect(
      api.downloadDocumentArtifact("document_1", "pdf"),
    ).rejects.toThrow("arquivo fiscal oficial válido");
  });
});
