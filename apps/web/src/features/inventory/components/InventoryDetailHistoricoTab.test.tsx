// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import { createInventoryDetailFixture } from "../model/inventoryDetail.testSupport";
import { InventoryDetailHistoricoTab } from "./InventoryDetailHistoricoTab";

afterEach(cleanup);

describe("InventoryDetailHistoricoTab", () => {
  it("renders persisted analysis, operational events, and backend audit events", async () => {
    const baseDetail = createInventoryDetailFixture();
    const detail = createInventoryDetailFixture({
      listing: {
        ...baseDetail.listing,
        resaleAnalysis: {
          dealRiskScore: 32,
          generatedAt: "2026-02-04T10:00:00.000Z",
          provider: { model: "gpt-5.4-mini", name: "openai" },
          riskLevel: "low",
          suggestedDescription: "Descrição sugerida",
          summary: "Boa liquidez com margem controlada.",
          topics: [
            {
              code: "W",
              message: "Quilometragem compatível.",
              title: "Liquidez",
              type: "positive",
            },
          ],
        },
      },
      priceHistory: [
        {
          actorUserId: "user_1",
          changedAt: "2026-02-03T10:00:00.000Z",
          id: "price_1",
          listingId: "listing_1",
          newPriceCents: 18990000,
          oldPriceCents: 18500000,
          reason: null,
        },
      ],
    });
    const api = {
      listListingAuditEvents: vi.fn(async () => [
        {
          action: "vehicle_listing.details.update",
          actorId: "user_123456789",
          actorKind: "user" as const,
          category: "data_change" as const,
          changes: [{ path: "priceCents" }],
          id: "audit_1",
          occurredAt: "2026-02-03T10:00:00.000Z",
          outcome: "succeeded" as const,
          providerName: null,
          summary: "Updated vehicle listing details",
        },
      ]),
    } as unknown as InventoryApi;

    render(
      <InventoryDetailHistoricoTab
        api={api}
        detail={detail}
        onUpdated={vi.fn()}
      />,
    );

    expect(screen.getByText("Preço do anúncio alterado")).toBeVisible();
    expect(screen.getByText(/185\.000.*189\.900/)).toBeVisible();
    expect(
      screen.getByText("Boa liquidez com margem controlada."),
    ).toBeVisible();
    expect(screen.getByText(/openai.*gpt-5.4-mini/i)).toBeVisible();
    expect(await screen.findByText("Dados do veículo alterados")).toBeVisible();
    expect(screen.getByText(/Operador user_123456/)).toBeVisible();
    expect(screen.queryByText(/Nenhuma análise.*foi gerada/i)).toBeNull();
    expect(
      screen.queryByText(/Operadores e ações detalhadas não são simulados/i),
    ).toBeNull();
  });
});
