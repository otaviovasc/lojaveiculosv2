import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createFiscalTestPorts } from "../../testSupport.js";
import { issueFiscalDocument } from "./issueFiscalDocument.js";
import {
  createFiscalRecipient,
  listFiscalRecipients,
} from "./manageFiscalRecipients.js";
import {
  createFiscalTemplate,
  previewFiscalTemplate,
} from "./manageFiscalTemplates.js";
import {
  FiscalTemplateNotFoundError,
  FiscalValidationError,
} from "../../domain/fiscalErrors.js";
import { repeatFiscalDocument } from "./repeatFiscalDocument.js";

describe("FiscalService", () => {
  it("creates recipients and templates, previews variables, and issues from a template", async () => {
    const ports = createFiscalTestPorts();
    const context = createFiscalContext();
    const recipient = await createFiscalRecipient(
      context,
      {
        address: {},
        documentNumber: "12345678909",
        documentType: "cpf",
        legalName: "Financeira Teste",
      },
      ports,
    );
    const template = await createFiscalTemplate(
      context,
      {
        descriptionTemplate: "Comissao {invoice.grossAmount}",
        name: "Comissao financiamento",
        recipientId: recipient.id,
        requirements: { requiresPeriodReference: true },
        retentionConfig: { irrfEnabled: false },
        serviceNationalCode: "TEST001",
        taxConfig: {},
        useCase: "financing_commission",
      },
      ports,
    );

    await expect(listFiscalRecipients(context, ports)).resolves.toHaveLength(1);
    await expect(
      previewFiscalTemplate(
        context,
        {
          templateId: template.id,
          variables: { invoice: { grossAmount: 1200 } },
        },
        ports,
      ),
    ).resolves.toMatchObject({
      renderedDescription: "Comissao 1200",
      unresolvedVariables: [],
    });

    const document = await issueFiscalDocument(
      context,
      {
        documentKind: "nfse",
        documentType: "nfse_service_commission",
        externalReference: "sale_test",
        templateId: template.id,
        templateVariables: { invoice: { grossAmount: 1200 } },
      },
      ports,
    );

    expect(document).toMatchObject({
      documentKind: "nfse",
      recipientId: recipient.id,
      status: "issued",
      templateId: template.id,
      templateVersion: 1,
    });
    expect(document.metadata.renderedDescription).toBe("Comissao 1200");
  });

  it("blocks issue when a template variable is unresolved", async () => {
    const ports = createFiscalTestPorts();
    const context = createFiscalContext();
    const template = await createFiscalTemplate(
      context,
      {
        descriptionTemplate: "Comprador {customer.name}",
        name: "Com comprador",
        serviceNationalCode: "TEST002",
        useCase: "financing_commission",
      },
      ports,
    );

    await expect(
      issueFiscalDocument(
        context,
        {
          documentKind: "nfse",
          documentType: "nfse_service_commission",
          externalReference: "sale_test",
          templateId: template.id,
          templateVariables: {},
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(FiscalValidationError);
  });

  it("uses empty template variables for a fixed-description template", async () => {
    const ports = createFiscalTestPorts();
    const context = createFiscalContext();
    const template = await createFiscalTemplate(
      context,
      {
        descriptionTemplate: "Comissao fixa",
        name: "Comissao fixa",
        serviceNationalCode: "TEST003",
        useCase: "financing_commission",
      },
      ports,
    );

    const document = await issueFiscalDocument(
      context,
      {
        documentKind: "nfse",
        documentType: "nfse_service_commission",
        externalReference: "sale_fixed_description",
        templateId: template.id,
      },
      ports,
    );

    expect(document.metadata.renderedDescription).toBe("Comissao fixa");
  });

  it("rejects a missing requested template before provider issue", async () => {
    const ports = createFiscalTestPorts();

    await expect(
      issueFiscalDocument(
        createFiscalContext(),
        {
          documentType: "nfse",
          externalReference: "sale_missing_template",
          templateId: "template_missing",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(FiscalTemplateNotFoundError);
  });

  it("blocks vehicle NF-e issue when required structured data is missing", async () => {
    const ports = createFiscalTestPorts();
    const context = createFiscalContext();

    await expect(
      issueFiscalDocument(
        context,
        {
          documentKind: "nfe",
          documentType: "nfe_vehicle_sale",
          externalReference: "sale_test",
          metadata: { requireVehicleNfeValidation: true },
        },
        ports,
      ),
    ).rejects.toMatchObject({
      details: { missingFields: ["vehicleNfe"] },
    });
  });

  it("creates a reviewable draft when repeating an issued document", async () => {
    const ports = createFiscalTestPorts();
    const context = createFiscalContext();
    const issued = await issueFiscalDocument(
      context,
      {
        documentKind: "nfse",
        documentType: "nfse_service_commission",
        externalReference: "sale_test",
        metadata: { renderedDescription: "Comissao de teste" },
      },
      ports,
    );

    const draft = await repeatFiscalDocument(
      context,
      { documentId: issued.id },
      ports,
    );

    expect(draft).toMatchObject({
      documentKind: issued.documentKind,
      documentType: issued.documentType,
      status: "draft",
    });
    expect(draft.metadata).toMatchObject({
      repeatRequiresReview: true,
      repeatedFromDocumentId: issued.id,
    });
    expect(draft.providerDocumentId).toBeNull();
  });
});

function createFiscalContext() {
  return {
    ...createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record: vi.fn(async () => undefined) },
      permissions: [
        "fiscal.manage",
        "fiscal.document.issue",
        "fiscal.document.cancel",
        "fiscal.recipient.manage",
        "fiscal.template.manage",
      ],
      request: { requestId: "req_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements: ["nfe"],
  };
}
