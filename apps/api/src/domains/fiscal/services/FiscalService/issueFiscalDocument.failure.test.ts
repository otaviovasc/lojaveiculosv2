import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { FiscalTemplateNotFoundError } from "../../domain/fiscalErrors.js";
import type { FiscalServiceInvoiceTemplate } from "../../ports/fiscalRepository.js";
import { createFiscalTestPorts, unexpectedCall } from "../../testSupport.js";
import { issueFiscalDocument } from "./issueFiscalDocument.js";

type ProviderFailureCase = {
  errorName: string;
  label: string;
  providerFailure: unknown;
  template?: FiscalServiceInvoiceTemplate;
};

const providerFailureCases: readonly ProviderFailureCase[] = [
  {
    errorName: "TypeError",
    label: "an Error",
    providerFailure: new TypeError("provider unavailable"),
  },
  {
    errorName: "UnknownError",
    label: "a non-Error value",
    providerFailure: "provider unavailable",
    template: createTemplate({
      descriptionTemplate: "Servico {customer.name}",
    }),
  },
];

describe("issueFiscalDocument failures", () => {
  it("issues an NFSe from a scoped template and rendered description", async () => {
    const template = createTemplate({
      descriptionTemplate: "Consultoria fiscal",
      recipientId: "recipient_1",
    });
    const harness = createHarness({ template });

    const result = await issueFiscalDocument(
      createContext(harness.record),
      {
        documentKind: "nfse",
        documentType: "nfse_service",
        externalReference: "service_1",
        templateId: template.id,
      },
      harness.ports,
    );

    expect(harness.getTemplate).toHaveBeenCalledWith({
      id: template.id,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(harness.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentKind: "nfse",
        recipientId: "recipient_1",
        templateId: template.id,
        templateVersion: 1,
      }),
    );
    expect(harness.createDocument.mock.calls[0]?.[0].metadata).toMatchObject({
      renderedDescription: "Consultoria fiscal",
    });
    expect(result).toMatchObject({ status: "issued", templateId: template.id });
  });

  it("rejects an unknown template before persisting the issue request", async () => {
    const harness = createHarness({ template: null });

    await expect(
      issueFiscalDocument(
        createContext(harness.record),
        {
          documentType: "nfse_service",
          externalReference: "service_missing_template",
          templateId: "template_missing",
        },
        harness.ports,
      ),
    ).rejects.toBeInstanceOf(FiscalTemplateNotFoundError);

    expect(harness.getTemplate).toHaveBeenCalledOnce();
    expect(harness.createDocument).not.toHaveBeenCalled();
  });

  it.each(providerFailureCases)(
    "persists and audits provider failure details for $label",
    async ({ errorName, providerFailure, template }) => {
      const harness = createHarness({
        providerFailure,
        ...(template ? { template } : {}),
      });
      const templateInput = template
        ? {
            templateId: template.id,
            templateVariables: { customer: { name: "Cliente Teste" } },
          }
        : {};

      await expect(
        issueFiscalDocument(
          createContext(harness.record),
          {
            documentKind: template ? "nfse" : "nfe",
            documentType: template ? "nfse_service" : "nfe",
            externalReference: "provider_failure",
            ...templateInput,
          },
          harness.ports,
        ),
      ).rejects.toBe(providerFailure);

      const renderedDescription = template ? "Servico Cliente Teste" : null;
      expect(harness.updateDocumentStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { providerErrorName: errorName },
          status: "error",
        }),
      );
      expect(harness.createDocumentSnapshot).toHaveBeenLastCalledWith(
        expect.objectContaining({
          providerResponse: { errorName },
          renderedDescription,
          snapshotType: "issue_error",
        }),
      );
      expect(harness.record).toHaveBeenLastCalledWith(
        expect.objectContaining({
          action: "fiscal.document.issue",
          outcome: "failed",
        }),
      );
    },
  );
});

function createContext(record: ReturnType<typeof createHarness>["record"]) {
  return {
    ...createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record },
      permissions: ["fiscal.document.issue", "fiscal.manage"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements: ["nfe"],
  };
}

function createHarness(options: {
  providerFailure?: unknown;
  template?: FiscalServiceInvoiceTemplate | null;
}) {
  const basePorts = createFiscalTestPorts();
  const ports = {
    fiscalProviderGateway: restrictAdapter(basePorts.fiscalProviderGateway, [
      "issueDocument",
    ]),
    fiscalRepository: restrictAdapter(basePorts.fiscalRepository, [
      "createDocument",
      "createDocumentSnapshot",
      "getTemplate",
      "updateDocumentStatus",
    ]),
  };
  const record = vi.fn(async () => undefined);
  const createDocument = vi.spyOn(ports.fiscalRepository, "createDocument");
  const createDocumentSnapshot = vi.spyOn(
    ports.fiscalRepository,
    "createDocumentSnapshot",
  );
  const getTemplate = vi.spyOn(ports.fiscalRepository, "getTemplate");
  const issueDocument = vi.spyOn(ports.fiscalProviderGateway, "issueDocument");
  const updateDocumentStatus = vi.spyOn(
    ports.fiscalRepository,
    "updateDocumentStatus",
  );

  if (options.template !== undefined) {
    getTemplate.mockResolvedValue(options.template);
  }
  if (options.providerFailure !== undefined) {
    issueDocument.mockRejectedValue(options.providerFailure);
  }
  return {
    createDocument,
    createDocumentSnapshot,
    getTemplate,
    ports,
    record,
    updateDocumentStatus,
  };
}

function restrictAdapter<Adapter extends object>(
  adapter: Adapter,
  allowed: readonly (keyof Adapter)[],
): Adapter {
  return new Proxy(adapter, {
    get(target, property, receiver) {
      if (!allowed.includes(property as keyof Adapter)) {
        return unexpectedCall(String(property));
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

function createTemplate(
  overrides: Partial<FiscalServiceInvoiceTemplate> = {},
): FiscalServiceInvoiceTemplate {
  const now = new Date("2026-07-12T12:00:00.000Z");
  return {
    cityServiceCode: null,
    createdAt: now,
    defaultMunicipalityOfIncidence: null,
    defaultServiceLocation: null,
    defaultTaxationType: null,
    descriptionTemplate: "Servico fiscal",
    id: "template_1",
    includeApproximateTaxes: false,
    isActive: true,
    isDefaultForRecipient: false,
    name: "Template fiscal",
    recipientId: null,
    requirements: {},
    retentionConfig: {},
    serviceMunicipalCode: null,
    serviceNationalCode: "TEST001",
    storeId: "store_1",
    taxConfig: {},
    tenantId: "tenant_1",
    updatedAt: now,
    useCase: "other",
    version: 1,
    ...overrides,
  };
}
