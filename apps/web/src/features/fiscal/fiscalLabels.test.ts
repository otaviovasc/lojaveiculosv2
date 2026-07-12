import { describe, expect, it } from "vitest";
import {
  getFiscalConfigurationLabels,
  getFiscalDocumentStatusLabel,
  getFiscalDocumentTypeLabel,
} from "./fiscalLabels";

describe("fiscalLabels", () => {
  it("translates fiscal enums without exposing unknown technical values", () => {
    expect(getFiscalDocumentTypeLabel("nfe_vehicle_sale")).toBe(
      "NF-e de venda de veículo",
    );
    expect(getFiscalDocumentTypeLabel("provider_private_kind")).toBe(
      "Documento fiscal",
    );
    expect(getFiscalDocumentStatusLabel("draft")).toBe("Aguardando emissão");
  });

  it("converts environment keys into user-facing requirements", () => {
    expect(
      getFiscalConfigurationLabels([
        "SPEDY_API_TOKEN",
        "SPEDY_RUNTIME_IMPLEMENTATION=http",
        "PRIVATE_UNKNOWN_KEY",
      ]),
    ).toEqual([
      "Credencial de acesso à Spedy",
      "Modo de conexão com a Spedy",
      "Configuração técnica da integração",
    ]);
  });
});
