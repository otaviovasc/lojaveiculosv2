import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createFinanceFeature } from "./finance.controller.js";
import { createFinanceServices } from "./financeServices.js";

describe("finance entry document routes", () => {
  it("returns a download descriptor for an attached document", async () => {
    const feature = createFeature();
    const { documentId, entryId, storageKey } = await attachReceipt(feature);

    const response = await request(
      feature,
      `/entries/${entryId}/documents/${documentId}/download`,
      { method: "GET", storeId: "store_a" },
    );

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      documentId,
      downloadMethod: "GET",
      downloadUrl: `https://download.local/${storageKey}`,
      fileName: "recibo.pdf",
      mimeType: "application/pdf",
    });

    const inline = await request(
      feature,
      `/entries/${entryId}/documents/${documentId}/download?disposition=inline`,
      { method: "GET", storeId: "store_a" },
    );
    expect(inline.status).toBe(200);
  });

  it("returns 404 for unknown documents and entries", async () => {
    const feature = createFeature();
    const { entryId } = await attachReceipt(feature);

    const missingDocument = await request(
      feature,
      `/entries/${entryId}/documents/document_missing/download`,
      { method: "GET", storeId: "store_a" },
    );
    expect(missingDocument.status).toBe(404);
    expect(await json(missingDocument)).toMatchObject({
      code: "FINANCE_ENTRY_DOCUMENT_NOT_FOUND",
    });

    const missingEntry = await request(
      feature,
      "/entries/entry_missing/documents/document_1/download",
      { method: "GET", storeId: "store_a" },
    );
    expect(missingEntry.status).toBe(404);
    expect(await json(missingEntry)).toMatchObject({
      code: "FINANCE_ENTRY_NOT_FOUND",
    });
  });

  it("streams document content through the injected fetcher", async () => {
    const contentFetcher = vi.fn(async (_url: string, _init?: RequestInit) =>
      Promise.resolve(
        new Response(new Uint8Array([37, 80, 68, 70]), {
          headers: { "Content-Type": "application/pdf" },
        }),
      ),
    );
    const feature = createFeature(contentFetcher);
    const { documentId, entryId, storageKey } = await attachReceipt(feature);

    const response = await request(
      feature,
      `/entries/${entryId}/documents/${documentId}/content`,
      { method: "GET", storeId: "store_a" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(response.headers.get("content-security-policy")).toContain(
      "sandbox",
    );
    expect(await response.arrayBuffer()).toEqual(
      new Uint8Array([37, 80, 68, 70]).buffer,
    );
    expect(contentFetcher).toHaveBeenCalledTimes(1);
    expect(contentFetcher.mock.calls[0]?.[0]).toBe(
      `https://download.local/${storageKey}`,
    );
  });

  it("requires finance.read for downloads", async () => {
    const feature = createFeature();
    const { documentId, entryId } = await attachReceipt(feature);

    const response = await request(
      feature,
      `/entries/${entryId}/documents/${documentId}/download`,
      { method: "GET", mode: "create_only", storeId: "store_a" },
    );

    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({
      code: "AUTHORIZATION_DENIED",
    });
  });
});

function createFeature(
  contentFetcher?: (url: string, init?: RequestInit) => Promise<Response>,
) {
  const services = createFinanceServices();
  return createFinanceFeature({
    ...(contentFetcher ? { contentFetcher } : {}),
    contextFactory: async (context) =>
      createServiceContext({
        actor: { id: "user_1", kind: "user" },
        permissions:
          context.req.header("x-mode") === "create_only"
            ? ["finance.create"]
            : [
                "finance.attach_document",
                "finance.create",
                "finance.read",
                "finance.update",
              ],
        request: { requestId: "request_1" },
        storeId: context.req.header("x-store-id") ?? "store_a",
        tenantId: "tenant_1",
      }),
    services,
  });
}

async function attachReceipt(
  feature: ReturnType<typeof createFinanceFeature>,
): Promise<{ documentId: string; entryId: string; storageKey: string }> {
  const entryResponse = await request(feature, "/entries", {
    body: {
      amountCents: 15000,
      category: "Aluguel",
      name: "Aluguel",
      type: "expense",
    },
    method: "POST",
    storeId: "store_a",
  });
  expect(entryResponse.status).toBe(201);
  const bundle = await json<{ entry: { id: string } }>(entryResponse);
  const entryId = bundle.entry.id;

  const uploadResponse = await request(
    feature,
    `/entries/${entryId}/documents/uploads`,
    {
      body: {
        contentType: "application/pdf",
        fileName: "recibo.pdf",
        sizeBytes: 2048,
      },
      method: "POST",
      storeId: "store_a",
    },
  );
  expect(uploadResponse.status).toBe(201);
  const upload = await json<{ storageKey: string }>(uploadResponse);

  const attachResponse = await request(
    feature,
    `/entries/${entryId}/documents`,
    {
      body: {
        fileName: "recibo.pdf",
        mimeType: "application/pdf",
        storageKey: upload.storageKey,
        title: "Recibo do aluguel",
      },
      method: "POST",
      storeId: "store_a",
    },
  );
  expect(attachResponse.status).toBe(201);
  const document = await json<{ id: string }>(attachResponse);

  return { documentId: document.id, entryId, storageKey: upload.storageKey };
}

async function request(
  feature: ReturnType<typeof createFinanceFeature>,
  path: string,
  input: {
    body?: Record<string, unknown>;
    method: "GET" | "POST";
    mode?: "create_only";
    storeId: string;
  },
) {
  return feature.request(path, {
    ...(input.body ? { body: JSON.stringify(input.body) } : {}),
    headers: {
      "content-type": "application/json",
      "x-store-id": input.storeId,
      ...(input.mode ? { "x-mode": input.mode } : {}),
    },
    method: input.method,
  });
}

async function json<T = Record<string, unknown>>(
  response: Response,
): Promise<T> {
  return (await response.json()) as T;
}
