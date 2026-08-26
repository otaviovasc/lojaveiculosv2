import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestDocumentRepository } from "../../testSupportDocumentRepository.js";
import { listDocumentWorkspace } from "./listDocumentWorkspace.js";

describe("document workspace entitlement", () => {
  it("rejects standalone document access when only permission is granted", async () => {
    const context = createServiceContext({
      actor: { id: "owner_1", kind: "user" },
      entitlements: [],
      permissions: ["documents.read"],
      request: { requestId: "request_documents_entitlement" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(listDocumentWorkspace(context, {})).rejects.toThrow(
      "Missing entitlement: documents",
    );
  });

  it("also requires the actor permission when documents are included", async () => {
    const context = createServiceContext({
      entitlements: ["documents"],
      request: { requestId: "request_documents_permission" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(
      listDocumentWorkspace(
        context,
        {},
        {
          documentRepository: createTestDocumentRepository(),
        },
      ),
    ).rejects.toThrow("Missing permission: documents.read");
  });
});
