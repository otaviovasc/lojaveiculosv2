import { describe, expect, it } from "vitest";
import { buildSpedyIssuePayload } from "./spedyFiscalPayload.js";
import { normalizeServiceReceiverAddress } from "./spedyFiscalPayloadSupport.js";

describe("normalizeServiceReceiverAddress", () => {
  it("returns undefined when no address data exists", () => {
    expect(normalizeServiceReceiverAddress(undefined)).toBeUndefined();
    expect(normalizeServiceReceiverAddress({})).toBeUndefined();
    expect(
      normalizeServiceReceiverAddress({ complement: "Sala 2" }),
    ).toBeUndefined();
  });

  it("normalizes structured catalog fields with digit-stripped postal code", () => {
    expect(
      normalizeServiceReceiverAddress({
        city: "São Paulo",
        cityCode: "3550308",
        district: "Sé",
        number: "100",
        postalCode: "01001-000",
        state: "SP",
        street: "Praça da Sé",
      }),
    ).toEqual({
      city: { code: 3550308, name: "São Paulo", state: "sp" },
      district: "Sé",
      number: "100",
      postalCode: "01001000",
      street: "Praça da Sé",
    });
  });

  it("applies the V1 fallbacks when only partial data exists", () => {
    expect(normalizeServiceReceiverAddress({ postalCode: "01001000" })).toEqual(
      {
        district: "Centro",
        number: "S/N",
        postalCode: "01001000",
        street: "Não informado",
      },
    );
  });

  it("supports the legacy Spedy-shaped city object", () => {
    expect(
      normalizeServiceReceiverAddress({
        city: { code: 3550308, name: "São Paulo", state: "SP" },
      }),
    ).toEqual({
      city: { code: 3550308, name: "São Paulo", state: "sp" },
      district: "Centro",
      number: "S/N",
      street: "Não informado",
    });
  });
});

describe("buildSpedyIssuePayload (NFS-e receiver)", () => {
  const baseInput = {
    documentKind: "nfse" as const,
    documentType: "nfse",
    externalReference: "sale_1",
    integrationId: "local_document_1",
    storeId: "store_1",
    tenantId: "tenant_1",
  };
  const taxDefaults = {
    nfse: {
      cityServiceCode: "6203100",
      federalServiceCode: "1.05",
      taxLocation: "companyMunicipality",
      taxationType: "taxationInMunicipality",
    },
  };

  it("omits the receiver address when the recipient has none", () => {
    const payload = buildSpedyIssuePayload(
      {
        ...baseInput,
        metadata: {
          grossAmount: 1_500,
          recipient: {
            address: {},
            documentNumber: "12345678909",
            legalName: "Cliente NFSe",
          },
          renderedDescription: "Servico de intermediacao",
        },
      },
      taxDefaults,
    );

    expect(payload.receiver).toEqual({
      federalTaxNumber: "12345678909",
      name: "Cliente NFSe",
    });
  });

  it("sends the normalized address with fallbacks and IBGE city code", () => {
    const payload = buildSpedyIssuePayload(
      {
        ...baseInput,
        metadata: {
          grossAmount: 1_500,
          recipient: {
            address: { city: "São Paulo", cityCode: "3550308" },
            documentNumber: "12345678909",
            legalName: "Cliente NFSe",
          },
          renderedDescription: "Servico de intermediacao",
        },
      },
      taxDefaults,
    );

    expect(payload.receiver?.address).toEqual({
      city: { code: 3550308, name: "São Paulo" },
      district: "Centro",
      number: "S/N",
      street: "Não informado",
    });
  });
});
