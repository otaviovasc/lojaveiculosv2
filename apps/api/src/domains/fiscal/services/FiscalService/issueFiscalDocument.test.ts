import { describe, expect, it } from "vitest";
import { issueFiscalDocument } from "./issueFiscalDocument.js";
import {
  createIssueContext,
  createIssueHarness,
} from "../../testSupportIssueDocument.js";

describe("issueFiscalDocument", () => {
  it("issues inside the persisted scope and records a critical audit", async () => {
    const harness = createIssueHarness();

    await issueFiscalDocument(
      createIssueContext(harness.record),
      {
        documentType: "nfe",
        externalReference: "sale_1",
        metadata: { saleId: "sale_1" },
      },
      harness.ports,
    );

    expect(harness.issueDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentKind: "nfe",
        documentType: "nfe",
        externalReference: "sale_1",
        metadata: { saleId: "sale_1" },
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
    expect(harness.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          documentKind: "nfe",
          externalReference: "sale_1",
          renderedDescription: null,
          saleId: "sale_1",
          templateId: null,
          templateVersion: null,
          vehicleNfePayload: null,
        },
        status: "queued",
      }),
    );
    expect(harness.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "fiscal.document.issue",
        outcome: "succeeded",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
  });

  it("uses empty metadata and audits a provider failure as failed", async () => {
    const harness = createIssueHarness("failed");

    await issueFiscalDocument(
      createIssueContext(harness.record),
      { documentType: "nfe", externalReference: "sale_2" },
      harness.ports,
    );

    expect(harness.issueDocument).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: {} }),
    );
    expect(harness.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          documentKind: "nfe",
          externalReference: "sale_2",
          renderedDescription: null,
          templateId: null,
          templateVersion: null,
          vehicleNfePayload: null,
        },
      }),
    );
    expect(harness.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed" }),
    );
  });

  it("denies missing permission before provider or repository access", async () => {
    const harness = createIssueHarness();

    await expect(
      issueFiscalDocument(
        createIssueContext(harness.record, { permissions: [] }),
        { documentType: "nfe", externalReference: "sale_1" },
        harness.ports,
      ),
    ).rejects.toThrow("Missing permission: fiscal.manage");

    expect(harness.issueDocument).not.toHaveBeenCalled();
    expect(harness.createDocument).not.toHaveBeenCalled();
  });

  it("fails closed when the critical audit cannot be persisted", async () => {
    const harness = createIssueHarness();
    harness.record.mockRejectedValueOnce(new Error("audit unavailable"));

    await expect(
      issueFiscalDocument(
        createIssueContext(harness.record),
        { documentType: "nfe", externalReference: "sale_1" },
        harness.ports,
      ),
    ).rejects.toThrow("audit unavailable");
  });

  it("persists an unknown provider failure without synthetic success", async () => {
    const harness = createIssueHarness();
    harness.issueDocument.mockRejectedValueOnce("provider unavailable");

    await expect(
      issueFiscalDocument(
        createIssueContext(harness.record),
        { documentType: "nfe", externalReference: "sale_unknown_error" },
        harness.ports,
      ),
    ).rejects.toBe("provider unavailable");

    expect(harness.updateDocumentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { providerErrorName: "UnknownError" },
        status: "error",
      }),
    );
    expect(harness.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "fiscal.document.issue",
        outcome: "failed",
      }),
    );
  });
});
