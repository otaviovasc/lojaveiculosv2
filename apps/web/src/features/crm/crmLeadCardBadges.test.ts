import { describe, expect, it } from "vitest";
import {
  cleanPhoneForWhatsapp,
  getQuickScheduleDates,
  isLeadUnread,
  readLeadCrmTags,
  readLeadFinancingBadge,
  readLeadTemperatureBadge,
  readLeadVisitBadge,
} from "./crmLeadCardBadges";
import type { ProductCrmLead } from "./productCrmTypes";

describe("crmLeadCardBadges", () => {
  it("cleans phone for whatsapp link correctly", () => {
    expect(cleanPhoneForWhatsapp("+55 (11) 99999-8888")).toBe("5511999998888");
    expect(cleanPhoneForWhatsapp("44999990000")).toBe("44999990000");
    expect(cleanPhoneForWhatsapp("123")).toBeNull();
    expect(cleanPhoneForWhatsapp(null)).toBeNull();
  });

  describe("financing badge", () => {
    it("parses V1 status_financiamento approved", () => {
      const metadata = {
        status_financiamento: {
          status: "APROVADO",
          banco: "Santander",
          valorAprovado: 45000,
        },
      };
      const badge = readLeadFinancingBadge(metadata);
      expect(badge).toEqual({
        status: "approved",
        label: "Financ. Aprovado",
        bank: "Santander",
        amountFormatted: "R$\u00A045.000",
      });
    });

    it("parses V1 status_financiamento rejected", () => {
      const metadata = {
        status_financiamento: {
          status: "REPROVADO",
          banco: "BV",
        },
      };
      const badge = readLeadFinancingBadge(metadata);
      expect(badge).toEqual({
        status: "rejected",
        label: "Financ. Reprovado",
        bank: "BV",
        amountFormatted: undefined,
      });
    });

    it("parses V2 financingStatus string", () => {
      expect(readLeadFinancingBadge({ financingStatus: "approved" })).toEqual({
        status: "approved",
        label: "Financ. Aprovado",
      });
      expect(readLeadFinancingBadge({ financingStatus: "rejected" })).toEqual({
        status: "rejected",
        label: "Financ. Reprovado",
      });
      expect(readLeadFinancingBadge({ financingStatus: "in_review" })).toEqual({
        status: "pending",
        label: "Financ. em análise",
      });
    });

    it("parses V2 financing object", () => {
      const badge = readLeadFinancingBadge({
        financing: {
          status: "approved",
          bankName: "Itaú",
          approvedAmountCents: 6000000,
        },
      });
      expect(badge).toEqual({
        status: "approved",
        label: "Financ. Aprovado",
        bank: "Itaú",
        amountFormatted: "R$\u00A060.000",
      });
    });
  });

  describe("scheduled visit badge", () => {
    it("parses V1 visita_agendada", () => {
      const metadata = {
        visita_agendada: {
          datetime: "2026-09-10T14:30:00.000Z",
          veiculoLabel: "Civic 2023",
        },
      };
      const badge = readLeadVisitBadge(metadata);
      expect(badge).not.toBeNull();
      expect(badge?.vehicleLabel).toBe("Civic 2023");
      expect(badge?.datetimeFormatted).toContain("10/09");
    });

    it("returns null for invalid or missing visit", () => {
      expect(readLeadVisitBadge({})).toBeNull();
      expect(
        readLeadVisitBadge({ visita_agendada: { datetime: "invalid" } }),
      ).toBeNull();
    });
  });

  describe("lead temperature badge", () => {
    it("parses hot lead", () => {
      expect(readLeadTemperatureBadge({ tag: "LEAD_QUENTE" })).toEqual({
        type: "hot",
        label: "Quente",
      });
      expect(readLeadTemperatureBadge({ temperature: "hot" })).toEqual({
        type: "hot",
        label: "Quente",
      });
    });

    it("parses cold lead", () => {
      expect(readLeadTemperatureBadge({ tag: "LEAD_FRIO" })).toEqual({
        type: "cold",
        label: "Frio",
      });
    });

    it("parses post-sale lead", () => {
      expect(readLeadTemperatureBadge({ tag: "POS_VENDA" })).toEqual({
        type: "after_sale",
        label: "Pós-Venda",
      });
    });
  });

  describe("CRM tags", () => {
    it("parses string array and object array tags", () => {
      const tags = readLeadCrmTags({
        tags: [
          "Entrada alta",
          { name: "Troca", color: "var(--color-accent)", emoji: "🚗" },
        ],
      });
      expect(tags).toHaveLength(2);
      expect(tags[0]).toEqual({ id: "tag_0", name: "Entrada alta" });
      expect(tags[1]).toEqual({
        id: "tag_1",
        name: "Troca",
        color: "var(--color-accent)",
        emoji: "🚗",
      });
    });
  });

  describe("unread lead indicator", () => {
    const baseLead: ProductCrmLead = {
      assignedUserId: null,
      buyerEmail: null,
      buyerName: "Test",
      buyerPhone: null,
      createdAt: "2026-09-08T00:00:00.000Z",
      id: "l1",
      lastInteractionAt: null,
      listingId: null,
      metadata: {},
      pipelineId: null,
      pipelineStageId: null,
      source: "manual",
      status: "new",
      storeId: "s1",
      tenantId: "t1",
      updatedAt: "2026-09-08T00:00:00.000Z",
      vehicleTitle: null,
    };

    it("identifies unread leads", () => {
      expect(isLeadUnread({ ...baseLead, metadata: { read: false } })).toBe(
        true,
      );
      expect(isLeadUnread({ ...baseLead, metadata: { unread: true } })).toBe(
        true,
      );
      expect(isLeadUnread({ ...baseLead, metadata: { read: true } })).toBe(
        false,
      );
      expect(isLeadUnread(baseLead)).toBe(false);
    });
  });

  describe("quick schedule dates", () => {
    it("returns 4 quick dates", () => {
      const options = getQuickScheduleDates(
        new Date("2026-09-08T10:00:00.000Z"),
      );
      expect(options).toHaveLength(4);
      expect(options[0]?.label).toBe("Hoje (17h)");
      expect(options[1]?.label).toBe("Amanhã (10h)");
      expect(options[2]?.label).toBe("Segunda-feira (10h)");
      expect(options[3]?.label).toBe("Próxima semana");
    });
  });
});
