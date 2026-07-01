import { describe, expect, it } from "vitest";
import {
  validateAgencyStoreForm,
  validateOwnerStoreForm,
} from "./onboardingValidation";

describe("onboarding validation", () => {
  it("blocks incomplete CNPJ values before submitting owner onboarding", () => {
    const result = validateOwnerStoreForm({
      contactPhone: "",
      documentNumber: "12.345",
      publicSlug: "auto-prime",
      storeLegalName: "",
      storeTradingName: "Auto Prime",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.documentNumber).toBe(
        "Informe um CNPJ completo com 14 dígitos.",
      );
    }
  });

  it("blocks full-length CNPJ values with invalid check digits", () => {
    const result = validateOwnerStoreForm({
      contactPhone: "",
      documentNumber: "11.111.111/1111-11",
      publicSlug: "auto-prime",
      storeLegalName: "",
      storeTradingName: "Auto Prime",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.documentNumber).toBe("Informe um CNPJ válido.");
    }
  });

  it("builds an owner-store payload aligned with the backend schema", () => {
    const result = validateOwnerStoreForm({
      contactPhone: "11987654321",
      documentNumber: "11222333000181",
      publicSlug: "Auto Prime!!",
      storeLegalName: " Auto Prime LTDA ",
      storeTradingName: " Auto Prime ",
    });

    expect(result).toEqual({
      input: {
        profile: {
          contactPhone: "(11) 98765-4321",
          documentNumber: "11.222.333/0001-81",
        },
        publicSlug: "auto-prime",
        storeLegalName: "Auto Prime LTDA",
        storeTradingName: "Auto Prime",
      },
      ok: true,
    });
  });

  it("blocks incomplete agency store forms before submitting", () => {
    const result = validateAgencyStoreForm({
      publicSlug: "a",
      storeTradingName: "",
      tenantId: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        publicSlug: "Informe um subdomínio com pelo menos 2 caracteres.",
        storeTradingName:
          "Informe o nome da concessionária com pelo menos 2 caracteres.",
        tenantId: "Selecione a conta de agência.",
      });
    }
  });
});
