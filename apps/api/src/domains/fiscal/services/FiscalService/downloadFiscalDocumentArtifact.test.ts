import { describe, expect, it, vi } from "vitest";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { createFiscalTestPorts } from "../../testSupport.js";
import { downloadFiscalDocumentArtifact } from "./downloadFiscalDocumentArtifact.js";
import { getFiscalOverview } from "./getFiscalOverview.js";

describe("downloadFiscalDocumentArtifact", () => {
  it.each([
    [true, ["documents.download", "fiscal.manage"]],
    [false, ["fiscal.manage"]],
  ] as const)(
    "projects artifact download capability as %s",
    async (expected, permissions) => {
      const ports = createFiscalTestPorts();
      ports.fiscalRepository.getOverview = async () => ({
        capabilities: { canDownloadOfficialArtifacts: false },
        documents: [],
        events: [],
        provider: {
          configured: false,
          missingConfiguration: [],
          provider: "spedy",
          webhookConfigured: false,
        },
        storeId: "store_1",
        summary: { cancelled: 0, failed: 0, issued: 0, pending: 0 },
        tenantId: "tenant_1",
      });
      const context = createContext(vi.fn(async () => undefined));
      context.permissions = [...permissions];

      await expect(getFiscalOverview(context, ports)).resolves.toMatchObject({
        capabilities: {
          canCancelDocuments: false,
          canDownloadOfficialArtifacts: expected,
          canIssueDocuments: false,
          canRepeatDocuments: false,
          canSyncDocumentStatus: true,
        },
      });
    },
  );

  it.each([
    ["pdf", "application/pdf", "%PDF-"],
    ["xml", "application/xml", "<?xml"],
  ] as const)(
    "returns only official %s provider bytes and audits access",
    async (format, contentType, prefix) => {
      const ports = createFiscalTestPorts();
      const document = await ports.fiscalRepository.createDocument({
        accessKey: "35240123456789000123456789000123456789000123",
        documentKind: "nfe",
        documentType: "nfe_vehicle_sale",
        providerDocumentId: "private_provider_reference",
        status: "authorized",
        storeId: "store_1",
        tenantId: "tenant_1",
      });
      const record = vi.fn(async () => undefined);

      const artifact = await downloadFiscalDocumentArtifact(
        createContext(record),
        { documentId: document.id, format },
        ports,
      );

      expect(artifact.contentType).toBe(contentType);
      expect(new TextDecoder().decode(artifact.bytes).startsWith(prefix)).toBe(
        true,
      );
      expect(artifact.fileName).toMatch(
        new RegExp(`^nfe-oficial-\\d{8}-89000123\\.${format}$`),
      );
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "fiscal.document.artifact_download",
          entityId: document.id,
          metadata: { format, status: "authorized" },
          outcome: "succeeded",
          requestId: "request_1",
        }),
      );
      expect(JSON.stringify(record.mock.calls)).not.toContain(
        "private_provider_reference",
      );
    },
  );

  it("denies downloads without the document download permission", async () => {
    const ports = createFiscalTestPorts();
    const context = createContext(vi.fn(async () => undefined));
    context.permissions = ["fiscal.manage"];

    await expect(
      downloadFiscalDocumentArtifact(
        context,
        { documentId: "document_1", format: "pdf" },
        ports,
      ),
    ).rejects.toMatchObject({ name: "AuthorizationError" });
  });

  it("fails closed and audits when the provider has not issued an artifact", async () => {
    const ports = createFiscalTestPorts();
    const document = await ports.fiscalRepository.createDocument({
      documentKind: "nfe",
      documentType: "nfe_vehicle_sale",
      providerDocumentId: "private_provider_reference",
      status: "queued",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    const record = vi.fn(async () => undefined);

    await expect(
      downloadFiscalDocumentArtifact(
        createContext(record),
        { documentId: document.id, format: "xml" },
        ports,
      ),
    ).rejects.toMatchObject({ name: "FiscalArtifactUnavailableError" });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { format: "xml", status: "queued" },
        outcome: "failed",
      }),
    );
  });
});

function createContext(record: ServiceContext["audit"]["record"]) {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record },
      permissions: ["documents.download", "fiscal.manage"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["fiscal"] },
  );
}
