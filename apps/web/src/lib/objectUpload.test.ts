import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocalMockUploadUrl, uploadObjectToStorage } from "./objectUpload";

function successfulFetch() {
  return vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, { status: 204 }),
  );
}

describe("uploadObjectToStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads with PUT by default and omits absent headers", async () => {
    const fetch = successfulFetch();

    await uploadObjectToStorage(
      { uploadUrl: "https://storage.example.test/vehicle-photo" },
      "file-body",
      { fetch },
    );

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "https://storage.example.test/vehicle-photo",
      {
        body: "file-body",
        method: "PUT",
      },
    );
  });

  it("forwards the signed upload method and headers unchanged", async () => {
    const fetch = successfulFetch();
    const uploadHeaders = {
      "Content-Type": "image/webp",
      "x-amz-meta-store-id": "store_123",
    };

    await uploadObjectToStorage(
      {
        uploadHeaders,
        uploadMethod: "POST",
        uploadUrl: "https://storage.example.test/signed-upload",
      },
      "encoded-image",
      { fetch },
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://storage.example.test/signed-upload",
      {
        body: "encoded-image",
        headers: uploadHeaders,
        method: "POST",
      },
    );
  });

  it("uses the ambient fetch implementation when none is injected", async () => {
    const fetch = successfulFetch();
    vi.stubGlobal("fetch", fetch);

    await uploadObjectToStorage(
      { uploadUrl: "https://storage.example.test/ambient-fetch" },
      "file-body",
    );

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("skips the network for the explicit local mock host", async () => {
    const fetch = successfulFetch();

    await uploadObjectToStorage(
      { uploadUrl: "http://upload.local/inventory/unit_123/photo" },
      "file-body",
      { fetch },
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports the HTTP status for rejected storage responses", async () => {
    const fetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response("denied", { status: 403 }),
    );

    await expect(
      uploadObjectToStorage(
        { uploadUrl: "https://storage.example.test/forbidden" },
        "file-body",
        { failureMessage: "Falha ao enviar a foto.", fetch },
      ),
    ).rejects.toThrow("Falha ao enviar a foto. Codigo HTTP 403.");
  });

  it("turns network failures into actionable CORS guidance", async () => {
    const fetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        throw new TypeError("Failed to fetch");
      },
    );

    await expect(
      uploadObjectToStorage(
        { uploadUrl: "https://storage.example.test/unreachable" },
        "file-body",
        { fetch },
      ),
    ).rejects.toThrow(
      "Nao foi possivel enviar o arquivo para o armazenamento. Verifique a politica de CORS do bucket R2 para PUT e Content-Type.",
    );
  });
});

describe("isLocalMockUploadUrl", () => {
  it.each([
    ["https://upload.local/path", true],
    ["http://upload.local:8787/path", true],
    ["https://upload.local.example.com/path", false],
    ["https://storage.example.test/upload.local", false],
    ["not a URL", false],
  ])("classifies %s as %s", (uploadUrl, expected) => {
    expect(isLocalMockUploadUrl(uploadUrl)).toBe(expected);
  });
});
