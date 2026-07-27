import { describe, expect, it } from "vitest";
import {
  buildSetupInput,
  createEmptyIssuerProfileDraft,
  hasIssuerProfileErrors,
  readIssuerProfileDraft,
  validateIssuerProfileDraft,
} from "./fiscalSetupModel";

const validDraft = {
  ...createEmptyIssuerProfileDraft(),
  cityCode: "3550308",
  cityName: "São Paulo",
  cityState: "sp",
  district: "Centro",
  federalTaxNumber: "12.345.678/0001-90",
  legalName: "Loja Exemplo LTDA",
  mainActivityCode: "4511101",
  name: "Loja Exemplo",
  number: "100",
  postalCode: "01001-000",
  secondaryActivityCodes: "4511102, 7711000",
  stateTaxNumber: "110.042.490.114",
  street: "Rua das Flores",
  taxRegime: "simples_nacional",
};

describe("fiscalSetupModel", () => {
  it("prefills the draft from a provider profile defensively", () => {
    const draft = readIssuerProfileDraft({
      address: {
        city: { code: 3550308, name: "São Paulo", state: "SP" },
        district: "Centro",
        number: "100",
        postalCode: "01001000",
        street: "Rua das Flores",
      },
      economicActivities: [
        { code: "4511101", type: "main" },
        { code: "4511102", type: "secondary" },
      ],
      federalTaxNumber: "12345678000190",
      legalName: "Loja Exemplo LTDA",
      name: "Loja Exemplo",
      stateTaxNumber: "110042490114",
      unexpected: { nested: true },
    });

    expect(draft).toMatchObject({
      cityCode: "3550308",
      cityName: "São Paulo",
      cityState: "SP",
      district: "Centro",
      federalTaxNumber: "12345678000190",
      legalName: "Loja Exemplo LTDA",
      mainActivityCode: "4511101",
      name: "Loja Exemplo",
      number: "100",
      postalCode: "01001000",
      secondaryActivityCodes: "4511102",
      stateTaxNumber: "110042490114",
      street: "Rua das Flores",
    });
  });

  it("tolerates an empty or malformed provider profile", () => {
    expect(readIssuerProfileDraft({})).toEqual(createEmptyIssuerProfileDraft());
    expect(
      readIssuerProfileDraft({ address: "rua", economicActivities: "n/a" }),
    ).toEqual(createEmptyIssuerProfileDraft());
  });

  it("flags the required fields before submitting", () => {
    const errors = validateIssuerProfileDraft(createEmptyIssuerProfileDraft());
    expect(errors.federalTaxNumber).toBeTruthy();
    expect(errors.name).toBeTruthy();
    expect(errors.legalName).toBeTruthy();
    expect(errors.street).toBeTruthy();
    expect(errors.postalCode).toBeTruthy();
    expect(errors.cityCode).toBeTruthy();
    expect(hasIssuerProfileErrors(errors)).toBe(true);
  });

  it("accepts a complete draft", () => {
    expect(hasIssuerProfileErrors(validateIssuerProfileDraft(validDraft))).toBe(
      false,
    );
  });

  it("builds the setup payload in the API contract shape", () => {
    expect(buildSetupInput(validDraft)).toEqual({
      issuerProfile: {
        address: {
          city: { code: 3550308, name: "São Paulo", state: "SP" },
          district: "Centro",
          number: "100",
          postalCode: "01001000",
          street: "Rua das Flores",
        },
        economicActivities: [
          { code: "4511101", type: "main" },
          { code: "4511102", type: "secondary" },
          { code: "7711000", type: "secondary" },
        ],
        federalTaxNumber: "12345678000190",
        legalName: "Loja Exemplo LTDA",
        name: "Loja Exemplo",
        stateTaxNumber: "110.042.490.114",
        taxRegime: "simples_nacional",
      },
    });
  });

  it("omits optional fields and activities when left blank", () => {
    const draft = {
      ...validDraft,
      mainActivityCode: "",
      secondaryActivityCodes: "",
      stateTaxNumber: "  ",
      taxRegime: "",
    };
    const { issuerProfile } = buildSetupInput(draft);
    expect(issuerProfile).not.toHaveProperty("economicActivities");
    expect(issuerProfile).not.toHaveProperty("stateTaxNumber");
    expect(issuerProfile).not.toHaveProperty("taxRegime");
  });
});
