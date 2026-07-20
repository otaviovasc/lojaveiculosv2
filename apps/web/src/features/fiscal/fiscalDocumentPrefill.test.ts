import { describe, expect, it } from "vitest";
import { createIssueDraftFromDocument } from "./fiscalDocumentPrefill";
import {
  matchesStatusFilter,
  readDocumentError,
} from "./fiscalDocumentDisplay";
import type { FiscalDocument } from "./types";

function createDocument(
  overrides: Partial<FiscalDocument> & { id: string },
): FiscalDocument {
  return {
    accessKey: null,
    createdAt: "2026-07-11T12:00:00.000Z",
    documentKind: "nfe",
    documentType: "nfe_vehicle_sale",
    issuedAt: null,
    metadata: {},
    provider: "spedy",
    providerDocumentId: null,
    recipientId: null,
    status: "issued",
    templateId: null,
    templateVersion: null,
    ...overrides,
  };
}

describe("createIssueDraftFromDocument", () => {
  it("rebuilds an NF-e draft with recipient, items, vehicle and taxes", () => {
    const draft = createIssueDraftFromDocument(
      createDocument({
        id: "doc_1",
        metadata: {
          additionalItems: [
            {
              cfop: "5102",
              description: "Documentação e transferência",
              discountAmount: 0,
              ncm: "87032100",
              quantity: 1,
              unitAmount: 500,
            },
          ],
          externalReference: "sale:sale_1",
          operationType: "used_vehicle_sale",
          payments: [{ amount: 85000, method: "pix" }],
          recipient: {
            city: "São Paulo",
            document: "12345678900",
            email: "maria@example.com",
            name: "Maria Silva",
            postalCode: "01001000",
            state: "SP",
            street: "Rua A",
          },
          vehicleNfe: {
            fiscal: {
              cfop: "5102",
              csosn: "102",
              icms: { rate: 18 },
              ncm: "87032100",
              origin: "0",
            },
            operation: { type: "used_vehicle_sale" },
            sale: { id: "sale_1", price: 85000 },
            vehicle: {
              brand: "Fiat",
              model: "Argo",
              modelYear: 2023,
              plate: "ABC1D23",
            },
          },
        },
      }),
    );

    expect(draft.kind).toBe("nfe");
    expect(draft.origin).toBe("sale");
    expect(draft.saleId).toBe("sale_1");
    expect(draft.externalReference).toBe("sale:sale_1");
    expect(draft.recipient.name).toBe("Maria Silva");
    expect(draft.recipient.document).toBe("12345678900");
    expect(draft.recipient.city).toBe("São Paulo");
    expect(draft.operationType).toBe("used_vehicle_sale");
    expect(draft.vehicle.brand).toBe("Fiat");
    expect(draft.vehicle.modelYear).toBe(2023);
    expect(draft.fiscal.icmsRate).toBe("18");
    expect(draft.fiscal.cfop).toBe("5102");
    expect(draft.payments).toEqual([{ amount: 85000, method: "pix" }]);
    expect(draft.items).toHaveLength(2);
    expect(draft.items[0]).toMatchObject({
      description: "Fiat Argo",
      quantity: 1,
      unitAmount: 85000,
    });
    expect(draft.items[1]).toMatchObject({
      description: "Documentação e transferência",
      unitAmount: 500,
    });
  });

  it("rebuilds an NFS-e draft with catalogue references", () => {
    const draft = createIssueDraftFromDocument(
      createDocument({
        documentKind: "nfse",
        documentType: "nfse_service_commission",
        id: "doc_2",
        metadata: {
          competence: "2026-07",
          externalReference: "entry:entry_9",
          grossAmount: 1500,
        },
        recipientId: "rec_1",
        templateId: "tpl_1",
      }),
    );

    expect(draft.kind).toBe("nfse");
    expect(draft.origin).toBe("entry");
    expect(draft.entryId).toBe("entry_9");
    expect(draft.nfse).toEqual({
      competence: "2026-07",
      grossAmount: "1500,00",
      recipientId: "rec_1",
      templateId: "tpl_1",
    });
  });

  it("falls back to an empty standalone draft when metadata is missing", () => {
    const draft = createIssueDraftFromDocument(createDocument({ id: "doc_3" }));

    expect(draft.kind).toBe("nfe");
    expect(draft.origin).toBe("standalone");
    expect(draft.externalReference).toBe("");
    expect(draft.recipient.name).toBe("");
    expect(draft.items).toHaveLength(1);
  });
});

describe("matchesStatusFilter", () => {
  it("groups statuses into the overview summary buckets", () => {
    expect(matchesStatusFilter("issued", "issued")).toBe(true);
    expect(matchesStatusFilter("authorized", "issued")).toBe(true);
    expect(matchesStatusFilter("draft", "pending")).toBe(true);
    expect(matchesStatusFilter("queued", "pending")).toBe(true);
    expect(matchesStatusFilter("processing", "pending")).toBe(true);
    expect(matchesStatusFilter("rejected", "failed")).toBe(true);
    expect(matchesStatusFilter("error", "failed")).toBe(true);
    expect(matchesStatusFilter("failed", "failed")).toBe(true);
    expect(matchesStatusFilter("cancelled", "cancelled")).toBe(true);
    expect(matchesStatusFilter("cancelled", "all")).toBe(true);
    expect(matchesStatusFilter("issued", "pending")).toBe(false);
    expect(matchesStatusFilter("rejected", "rejected")).toBe(true);
    expect(matchesStatusFilter("failed", "rejected")).toBe(false);
  });
});

describe("readDocumentError", () => {
  it("reads the reason from message, error or processingDetail shapes", () => {
    expect(
      readDocumentError(
        createDocument({ id: "a", metadata: { message: "CFOP inválido" } }),
      ),
    ).toBe("CFOP inválido");
    expect(
      readDocumentError(
        createDocument({
          id: "b",
          metadata: { code: "E42", error: "Rejeitada pelo provedor" },
        }),
      ),
    ).toBe("[Ref: E42] Rejeitada pelo provedor");
    expect(
      readDocumentError(
        createDocument({
          id: "c",
          metadata: { processingDetail: "Dados do destinatário incompletos" },
        }),
      ),
    ).toBe("Dados do destinatário incompletos");
    expect(
      readDocumentError(
        createDocument({
          id: "d",
          metadata: { processingDetail: { code: "100", message: "Falha" } },
        }),
      ),
    ).toBe("[Ref: 100] Falha");
    expect(
      readDocumentError(createDocument({ id: "e", metadata: {} })),
    ).toBeNull();
  });
});
