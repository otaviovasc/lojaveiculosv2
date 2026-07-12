import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createDocumentsFeature } from "./documents.controller.js";
import type { DocumentServices } from "./documentServices.js";
import { proxyDocumentContent } from "../adapters/proxyDocumentContent.js";

describe("document content controller", () => {
  afterEach(() => vi.useRealTimers());

  it("streams authenticated content without exposing the signed URL", async () => {
    const download = vi.fn(async () => ({
      document: linkedDocument,
      downloadMethod: "GET" as const,
      downloadUrl: "https://storage.local/private-signed-url",
      expiresAt: new Date("2026-01-01T10:05:00.000Z"),
      fileName: "contract.pdf",
      mimeType: "application/pdf",
      versionId: "version_1",
      versionNumber: 1,
    }));
    const contentFetcher = vi.fn(async (_url: string, _init?: RequestInit) =>
      Promise.resolve(
        new Response(new Uint8Array([37, 80, 68, 70]), {
          headers: { "Content-Type": "application/pdf" },
        }),
      ),
    );
    const app = new Hono();
    app.route(
      "/api/v1/documents",
      createDocumentsFeature({
        contentFetcher,
        contextFactory: async () =>
          createServiceContext({
            actor: { id: "user_1", kind: "user" },
            permissions: ["documents.download", "documents.read"],
            request: { requestId: "req_1" },
            storeId: "store_1",
            tenantId: "tenant_1",
          }),
        services: { download } as unknown as DocumentServices,
      }),
    );

    const response = await app.request("/api/v1/documents/document_1/content");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(response.headers.get("content-security-policy")).toContain(
      "sandbox",
    );
    expect(contentFetcher).toHaveBeenCalledTimes(1);
    expect(contentFetcher.mock.calls[0]?.[0]).toBe(
      "https://storage.local/private-signed-url",
    );
    expect(contentFetcher.mock.calls[0]?.[1]?.signal).toBeInstanceOf(
      AbortSignal,
    );
    expect(download).toHaveBeenCalledWith(expect.any(Object), {
      disposition: "inline",
      documentId: "document_1",
      versionId: undefined,
    });
  });

  it("forces untrusted active content to download as opaque bytes", async () => {
    const response = await proxyDocumentContent(
      {
        document: linkedDocument,
        downloadMethod: "GET",
        downloadUrl: "https://storage.local/untrusted-content",
        expiresAt: new Date("2026-01-01T10:05:00.000Z"),
        fileName: "payload.html",
        mimeType: "text/html",
        versionId: "version_2",
        versionNumber: 2,
      },
      async () =>
        new Response(
          "<script>window.top.location='https://evil.test'</script>",
          {
            headers: { "Content-Type": "text/html" },
          },
        ),
    );

    expect(response.headers.get("content-type")).toBe(
      "application/octet-stream",
    );
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
  });

  it("aborts a storage fetch that exceeds the delivery timeout", async () => {
    vi.useFakeTimers();
    const delivery = proxyDocumentContent(
      downloadDescriptor(),
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
      { timeoutMs: 50 },
    );
    const rejection = expect(delivery).rejects.toThrow(
      "Document content could not be delivered.",
    );

    await vi.advanceTimersByTimeAsync(50);
    await rejection;
  });

  it("stops streaming when storage omits length and exceeds the byte cap", async () => {
    const response = await proxyDocumentContent(
      downloadDescriptor(),
      async () => new Response(new Uint8Array([1, 2, 3, 4, 5])),
      { maxBytes: 4 },
    );

    await expect(response.arrayBuffer()).rejects.toThrow(
      "Document content could not be delivered.",
    );
  });
});

function downloadDescriptor() {
  return {
    document: linkedDocument,
    downloadMethod: "GET" as const,
    downloadUrl: "https://storage.local/private-signed-url",
    expiresAt: new Date("2026-01-01T10:05:00.000Z"),
    fileName: "contract.pdf",
    mimeType: "application/pdf",
    versionId: "version_1",
    versionNumber: 1,
  };
}

const linkedDocument = {
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  fileName: "contract.pdf",
  fileSizeBytes: 4,
  id: "document_1",
  kind: "sale_contract" as const,
  linkRole: "primary",
  metadata: {},
  mimeType: "application/pdf",
  status: "issued" as const,
  storageKey: "private/storage/key.pdf",
  storeId: "store_1",
  targetId: "sale_1",
  targetType: "sale" as const,
  tenantId: "tenant_1",
  title: "Contrato de venda",
  updatedAt: new Date("2026-01-01T10:00:00.000Z"),
  uploadedAt: new Date("2026-01-01T10:00:00.000Z"),
};
