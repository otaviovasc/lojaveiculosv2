import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createFiscalTestPorts } from "../../testSupport.js";
import { repeatFiscalDocument } from "./repeatFiscalDocument.js";

describe("repeatFiscalDocument guards", () => {
  it("does not create a repeat draft from a non-terminal document", async () => {
    const ports = createFiscalTestPorts();
    const source = await ports.fiscalRepository.createDocument({
      documentKind: "nfse",
      documentType: "nfse_service_commission",
      providerDocumentId: "provider_document_1",
      status: "processing",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    const createDocument = vi.spyOn(ports.fiscalRepository, "createDocument");
    const createSnapshot = vi.spyOn(
      ports.fiscalRepository,
      "createDocumentSnapshot",
    );
    createDocument.mockClear();

    await expect(
      repeatFiscalDocument(context(), { documentId: source.id }, ports),
    ).rejects.toMatchObject({
      name: "FiscalDocumentRepeatNotAllowedError",
      status: "processing",
    });

    expect(createDocument).not.toHaveBeenCalled();
    expect(createSnapshot).not.toHaveBeenCalled();
  });
});

function context() {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record: vi.fn(async () => undefined) },
      permissions: ["fiscal.document.issue", "fiscal.manage"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["fiscal"] },
  );
}
