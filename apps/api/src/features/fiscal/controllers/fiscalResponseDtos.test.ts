import { describe, expect, it } from "vitest";
import type {
  FiscalDocument,
  FiscalOverview,
} from "../../../domains/fiscal/ports/fiscalRepository.js";
import {
  toFiscalDocumentDto,
  toFiscalOverviewDto,
} from "./fiscalResponseDtos.js";

describe("fiscal response DTOs", () => {
  it("removes provider identifiers and credentials recursively", () => {
    const dto = toFiscalDocumentDto(
      document({
        apiKey: "secret",
        accessToken: "secret-token",
        nested: {
          invoice_id: "invoice_private",
          providerDocumentId: "provider_private",
          providerStatus: "authorized",
        },
        ownerApiKey: "owner-secret",
      }),
    );

    expect(dto.metadata).toEqual({
      nested: { providerStatus: "authorized" },
    });
    expect(dto).not.toHaveProperty("providerDocumentId");
  });

  it("exposes only the public event timeline fields", () => {
    const overview: FiscalOverview = {
      capabilities: { canDownloadOfficialArtifacts: true },
      documents: [document({})],
      events: [
        {
          createdAt: new Date("2026-08-01T10:00:00.000Z"),
          eventType: "status_changed",
          fiscalDocumentId: "document_1",
          id: "private_event_id",
          metadata: { providerDocumentId: "private_provider_id" },
          occurredAt: new Date("2026-08-01T10:01:00.000Z"),
        },
      ],
      provider: {
        configured: true,
        missingConfiguration: [],
        provider: "spedy",
        webhookConfigured: true,
      },
      storeId: "store_1",
      summary: { cancelled: 0, failed: 0, issued: 1, pending: 0 },
      tenantId: "tenant_1",
    };

    expect(toFiscalOverviewDto(overview).events).toEqual([
      {
        eventType: "status_changed",
        fiscalDocumentId: "document_1",
        occurredAt: new Date("2026-08-01T10:01:00.000Z"),
      },
    ]);
  });
});

function document(metadata: Record<string, unknown>): FiscalDocument {
  return {
    accessKey: null,
    createdAt: new Date("2026-08-01T10:00:00.000Z"),
    documentKind: "nfe",
    documentType: "nfe_vehicle_sale",
    id: "document_1",
    issuedAt: null,
    metadata,
    provider: "spedy",
    providerDocumentId: "private_provider_id",
    recipientId: null,
    status: "issued",
    storeId: "store_1",
    templateId: null,
    templateVersion: null,
    tenantId: "tenant_1",
  };
}
