import { describe, expect, it, vi } from "vitest";
import {
  readDocumentUploadResponse,
  uploadDocumentObject,
} from "./DocumentUploadDialog";
import type { DocumentUpload } from "./types";

describe("document upload dialog", () => {
  it("rejects failed signed upload responses before registration", async () => {
    await expect(
      readDocumentUploadResponse(new Response(null, { status: 403 })),
    ).rejects.toThrow(
      "Falha no envio do documento para o armazenamento. Código HTTP 403.",
    );
  });

  it("accepts successful signed upload responses", async () => {
    await expect(
      readDocumentUploadResponse(new Response(null, { status: 200 })),
    ).resolves.toBeUndefined();
  });

  it("skips external storage PUTs for local mock upload descriptors", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await uploadDocumentObject(
      createUploadDescriptor({ uploadUrl: "https://upload.local/doc.pdf" }),
      createFile(),
      fetchImpl,
    );

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends production signed uploads and checks the storage response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null));

    await uploadDocumentObject(
      createUploadDescriptor({
        uploadHeaders: { "content-type": "application/pdf" },
        uploadUrl: "https://storage.example/doc.pdf",
      }),
      createFile(),
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://storage.example/doc.pdf",
      expect.objectContaining({
        headers: { "content-type": "application/pdf" },
        method: "PUT",
      }),
    );
  });
});

function createUploadDescriptor(
  overrides: Partial<DocumentUpload> = {},
): DocumentUpload {
  return {
    expiresAt: "2026-01-01T00:15:00.000Z",
    publicUrl: "https://cdn.local/doc.pdf",
    storageKey: "documents/doc.pdf",
    uploadHeaders: {},
    uploadMethod: "PUT",
    uploadUrl: "https://upload.local/doc.pdf",
    ...overrides,
  };
}

function createFile() {
  return new File(["document"], "doc.pdf", { type: "application/pdf" });
}
