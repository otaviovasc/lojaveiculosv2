import { describe, expect, it } from "vitest";
import { createConnection } from "./fiscalConnectionFixtures";
import {
  buildFiscalReadinessChecklist,
  describeFiscalCertificate,
  formatFiscalDefaultValue,
  getFiscalConnectionStatusLabel,
  getFiscalDefaultLabel,
  listFiscalCapabilities,
  requiresDigitalCertificate,
} from "./fiscalConnectionDisplay";

describe("fiscalConnectionDisplay", () => {
  it("labels connection statuses in pt-BR", () => {
    expect(getFiscalConnectionStatusLabel("ready")).toBe("Pronta para emitir");
    expect(getFiscalConnectionStatusLabel("pending_review")).toBe(
      "Revisão pendente",
    );
    expect(getFiscalConnectionStatusLabel("not_configured")).toBe(
      "Não configurada",
    );
    expect(getFiscalConnectionStatusLabel("error")).toBe("Erro na integração");
  });

  it("builds a readiness checklist that mirrors the backend rules", () => {
    const pending = createConnection({
      capabilities: { requiresDigitalCertificate: true },
      companyId: "spedy_company_1",
      defaultsStatus: "unconfirmed",
      webhookRegisteredAt: "2026-07-10T12:00:00.000Z",
    });
    expect(buildFiscalReadinessChecklist(pending)).toEqual([
      { done: true, label: "Empresa emissora criada" },
      { done: false, label: "Padrões fiscais revisados e confirmados" },
      { done: false, label: "Certificado digital A1 válido" },
      { done: true, label: "Retorno de eventos registrado" },
    ]);

    const ready = createConnection({
      capabilities: { requiresDigitalCertificate: true },
      certificateExpiresAt: "2027-06-01T00:00:00.000Z",
      companyId: "spedy_company_1",
      defaultsStatus: "confirmed",
      status: "ready",
      webhookRegisteredAt: "2026-07-10T12:00:00.000Z",
    });
    expect(
      buildFiscalReadinessChecklist(ready).every((item) => item.done),
    ).toBe(true);
  });

  it("only requires a certificate when the provider asks for one", () => {
    expect(requiresDigitalCertificate({ nfe: true })).toBe(false);
    expect(
      requiresDigitalCertificate({ requiresDigitalCertificate: true }),
    ).toBe(true);
    expect(
      requiresDigitalCertificate({
        nested: { requiresDigitalCertificate: true },
      }),
    ).toBe(true);
    expect(requiresDigitalCertificate(null)).toBe(false);
  });

  it("describes certificate validity honestly", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    expect(describeFiscalCertificate(null, now).label).toBe("Não enviado");
    expect(
      describeFiscalCertificate("2026-07-01T00:00:00.000Z", now).label,
    ).toBe("Expirado");
    expect(
      describeFiscalCertificate("2026-08-10T00:00:00.000Z", now).label,
    ).toBe("Expira em breve");
    expect(
      describeFiscalCertificate("2027-01-10T00:00:00.000Z", now).label,
    ).toBe("Válido");
  });

  it("lists meaningful capabilities with friendly labels", () => {
    const capabilities = listFiscalCapabilities({
      nfe: true,
      nfse: false,
      requiresDigitalCertificate: true,
      webhook: { active: true },
    });
    expect(capabilities.map((entry) => entry.label)).toEqual([
      "Exige certificado digital A1",
      "NF-e (produto)",
      "Retorno automático de eventos",
    ]);
  });

  it("formats tax default labels and values", () => {
    expect(getFiscalDefaultLabel("cfop")).toBe("CFOP padrão");
    expect(getFiscalDefaultLabel("icmsAliquota")).toBe("Icms aliquota");
    expect(formatFiscalDefaultValue("5.102")).toBe("5.102");
    expect(formatFiscalDefaultValue(102)).toBe("102");
    expect(formatFiscalDefaultValue({ cst: "102" })).toBe('{"cst":"102"}');
    expect(formatFiscalDefaultValue(null)).toBe("—");
  });
});
