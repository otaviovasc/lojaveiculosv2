import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createFiscalTestAuxiliaryPorts } from "../../testSupport.js";
import {
  confirmFiscalDefaults,
  FiscalDefaultsValidationError,
  setupFiscalConnection,
} from "./manageFiscalConnection.js";

describe("manageFiscalConnection", () => {
  it("provisions a company subaccount and requires reviewed NF-e/NFS-e defaults", async () => {
    const context = createContext();
    const ports = createFiscalTestAuxiliaryPorts();
    const pending = await setupFiscalConnection(
      context,
      {
        issuerProfile: {
          address: {
            city: { code: 3550308, name: "São Paulo", state: "sp" },
            district: "Centro",
            number: "100",
            postalCode: "01001000",
            street: "Praça da Sé",
          },
          federalTaxNumber: "12345678000190",
          legalName: "Loja Teste Ltda",
          name: "Loja Teste",
        },
      },
      ports,
    );

    expect(pending).toMatchObject({
      companyId: "test-company",
      defaultsStatus: "missing",
      status: "pending_review",
    });
    const validationError = await confirmFiscalDefaults(
      context,
      { taxDefaults: {} },
      ports,
    ).catch((error: unknown) => error);
    expect(validationError).toBeInstanceOf(FiscalDefaultsValidationError);
    if (!(validationError instanceof FiscalDefaultsValidationError)) {
      throw validationError;
    }
    expect(validationError.missingFields).toContain("nfe.operationNature");
    expect(validationError.missingFields).toContain("nfe.cfop");
    expect(validationError.missingFields).toContain("nfse.taxLocation");
    expect(validationError.missingFields).toContain("nfse.taxationType");

    const ready = await confirmFiscalDefaults(
      context,
      {
        taxDefaults: {
          nfe: {
            cfop: 5102,
            cofinsCst: "01",
            destination: "internal",
            icmsCst: "00",
            icmsOrigin: "0",
            isFinalCustomer: true,
            ncm: "87032310",
            operationNature: "Venda de veículo",
            operationType: "outgoing",
            pisCst: "01",
            presenceType: "presence",
            purposeType: "normal",
          },
          nfse: {
            taxLocation: "companyMunicipality",
            taxationType: "taxationInMunicipality",
          },
        },
      },
      ports,
    );

    expect(ready).toMatchObject({
      defaultsConfirmedBy: "user_1",
      defaultsStatus: "confirmed",
      status: "ready",
    });
  });
});

function createContext() {
  return {
    ...createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record: vi.fn(async () => undefined) },
      permissions: [
        "fiscal.manage",
        "fiscal.provider.configure",
        "fiscal.defaults.confirm",
      ],
      request: { requestId: "req_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements: ["fiscal"],
  };
}
