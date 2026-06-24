import { describe, expect, it } from "vitest";
import { readDocumentUploadResponse } from "./DocumentUploadDialog";

describe("document upload dialog", () => {
  it("rejects failed signed upload responses before registration", async () => {
    await expect(
      readDocumentUploadResponse(new Response(null, { status: 403 })),
    ).rejects.toThrow("Falha no envio do documento. Status 403.");
  });

  it("accepts successful signed upload responses", async () => {
    await expect(
      readDocumentUploadResponse(new Response(null, { status: 200 })),
    ).resolves.toBeUndefined();
  });
});
