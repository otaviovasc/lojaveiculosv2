import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { FinanceStoreIdentityReader } from "../../../domains/finance/ports/financeStoreIdentityReader.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import { createMemoryObjectStorage } from "../../../infrastructure/storage/memoryObjectStorage.js";
import {
  createTestDocumentRepository,
  type TestDocumentRepository,
} from "../../../domains/documents/testSupportDocumentRepository.js";
import { createTestFinanceAutoEntryRepository } from "../../../domains/finance/testSupportFinanceAutoEntryRepository.js";
import { createMemoryFinanceRepository } from "../../inventory/adapters/memory/financeRepository.js";
import { createFinanceFeature } from "./finance.controller.js";
import { createConcurrentReceiptStorage } from "./financeEntryReceipt.controller.testSupport.js";
import { createFinanceServices } from "./financeServices.js";

describe("finance entry receipt route", () => {
  it("generates one persisted receipt and reuses it on replay", async () => {
    const storeIdentityReader = {
      findByStore: vi.fn(async () => ({ name: "Auto Prime Centro" })),
    };
    const feature = createFeature(storeIdentityReader);
    const entryId = await createEntry(feature);

    const firstResponse = await request(feature, `/entries/${entryId}/receipt`);
    expect(firstResponse.status).toBe(200);
    const first = await json<{
      document: {
        id: string;
        kind: string;
        linkRole: string;
        metadata: {
          store: { name: string };
          templateClauses: string[];
        };
        status: string;
      };
      generated: boolean;
    }>(firstResponse);
    expect(first).toMatchObject({
      document: {
        kind: "finance_receipt",
        linkRole: "finance_entry_receipt",
        metadata: { store: { name: "Auto Prime Centro" } },
        status: "issued",
      },
      generated: true,
    });
    expect(first.document.metadata.templateClauses).toContain(
      "A Auto Prime Centro registra o lancamento financeiro descrito e declara ciencia das partes sobre valor, tipo, vencimento e status.",
    );
    expect(storeIdentityReader.findByStore).toHaveBeenCalledWith({
      storeId: "store_a",
      tenantId: "tenant_1",
    });

    const replay = await request(feature, `/entries/${entryId}/receipt`);
    expect(await json(replay)).toMatchObject({
      document: { id: first.document.id },
      generated: false,
    });

    const detail = await feature.request(`/entries/${entryId}`);
    expect(await json<{ documents: { id: string }[] }>(detail)).toMatchObject({
      documents: [{ id: first.document.id }],
    });
  });

  it("denies finance.create without receipt permissions", async () => {
    const feature = createFeature();
    const entryId = await createEntry(feature);

    const response = await request(
      feature,
      `/entries/${entryId}/receipt`,
      "create_only",
    );

    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({
      code: "AUTHORIZATION_DENIED",
    });
  });

  it("denies attach permission without finance.read", async () => {
    const feature = createFeature();
    const entryId = await createEntry(feature);

    const response = await request(
      feature,
      `/entries/${entryId}/receipt`,
      "attach_only",
    );

    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({
      code: "AUTHORIZATION_DENIED",
    });
  });

  it("fails truthfully when scoped store identity is unavailable", async () => {
    const feature = createFeature({ findByStore: async () => null });
    const entryId = await createEntry(feature);

    const response = await request(feature, `/entries/${entryId}/receipt`);

    expect(response.status).toBe(503);
    expect(await json(response)).toMatchObject({
      code: "FINANCE_STORE_IDENTITY_UNAVAILABLE",
    });
  });

  it("keeps one receipt and cleans the losing object under concurrency", async () => {
    const { deleteObject, storage } = createConcurrentReceiptStorage();
    const feature = createFeature(undefined, storage);
    const entryId = await createEntry(feature);

    const responses = await Promise.all([
      request(feature, `/entries/${entryId}/receipt`),
      request(feature, `/entries/${entryId}/receipt`),
    ]);
    const receipts = await Promise.all(
      responses.map((response) =>
        json<{
          document: { id: string; storageKey: string };
          generated: boolean;
        }>(response),
      ),
    );

    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    expect(receipts.map(({ generated }) => generated).sort()).toEqual([
      false,
      true,
    ]);
    expect(new Set(receipts.map(({ document }) => document.id)).size).toBe(1);
    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(deleteObject).not.toHaveBeenCalledWith({
      storageKey: receipts[0]?.document.storageKey,
    });
  });

  it("revives an archived receipt instead of creating a conflicting link", async () => {
    const documentRepository = createTestDocumentRepository();
    const feature = createFeature(undefined, undefined, documentRepository);
    const entryId = await createEntry(feature);
    const first = await json<{
      document: { id: string };
    }>(await request(feature, `/entries/${entryId}/receipt`));
    await documentRepository.update({
      documentId: first.document.id,
      status: "archived",
      storeId: "store_a",
      tenantId: "tenant_1",
    });

    const revived = await json<{
      document: { id: string; status: string };
      generated: boolean;
    }>(await request(feature, `/entries/${entryId}/receipt`));

    expect(revived).toMatchObject({
      document: { id: first.document.id, status: "issued" },
      generated: false,
    });
    expect(documentRepository.documents).toHaveLength(1);
  });
});

function createFeature(
  storeIdentityReader: FinanceStoreIdentityReader = {
    findByStore: async () => ({ name: "Auto Prime Centro" }),
  },
  objectStorage?: ObjectStorage,
  documentRepository: TestDocumentRepository = createTestDocumentRepository(),
) {
  const financeRepository = createMemoryFinanceRepository();
  return createFinanceFeature({
    contextFactory: async (context) =>
      createServiceContext({
        actor: { id: "user_1", kind: "user" },
        entitlements: ["finance"],
        permissions:
          context.req.header("x-mode") === "create_only"
            ? ["finance.create"]
            : context.req.header("x-mode") === "attach_only"
              ? ["finance.attach_document", "finance.create"]
              : ["finance.attach_document", "finance.create", "finance.read"],
        request: { requestId: "request_1" },
        storeId: "store_a",
        tenantId: "tenant_1",
      }),
    services: createFinanceServices({
      ports: {
        documentRepository,
        financeAutoEntryRepository: createTestFinanceAutoEntryRepository(),
        financeRepository,
        objectStorage: objectStorage ?? createMemoryObjectStorage(),
        storeIdentityReader,
      },
    }),
  });
}

async function createEntry(
  feature: ReturnType<typeof createFinanceFeature>,
): Promise<string> {
  const response = await feature.request("/entries", {
    body: JSON.stringify({
      amountCents: 15000,
      category: "Aluguel",
      name: "Aluguel",
      type: "expense",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(201);
  return (await json<{ entry: { id: string } }>(response)).entry.id;
}

function request(
  feature: ReturnType<typeof createFinanceFeature>,
  path: string,
  mode?: "attach_only" | "create_only",
) {
  const init: RequestInit = { method: "POST" };
  if (mode) init.headers = { "x-mode": mode };
  return feature.request(path, init);
}

async function json<T = Record<string, unknown>>(
  response: Response,
): Promise<T> {
  return (await response.json()) as T;
}
