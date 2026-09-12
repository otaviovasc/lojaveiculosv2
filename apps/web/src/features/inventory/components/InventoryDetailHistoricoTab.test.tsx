// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
          provider: {
            model: "openai/gpt-5.4-mini",
            name: "openrouter",
          },
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
      getVehicleUnitAcquisition: vi.fn(async () => null),
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
    expect(screen.getByText(/openrouter.*openai\/gpt-5.4-mini/i)).toBeVisible();
    expect(await screen.findByText("Dados do veículo alterados")).toBeVisible();
    expect(screen.getByText(/Operador user_123456/)).toBeVisible();
    expect(screen.queryByText(/Nenhuma análise.*foi gerada/i)).toBeNull();
    expect(
      screen.queryByText(/Operadores e ações detalhadas não são simulados/i),
    ).toBeNull();
  });

  it("does not call the Copilot while required listing data is missing", async () => {
    const analyzeListingResale = vi.fn();
    const api = {
      analyzeListingResale,
      getVehicleUnitAcquisition: vi.fn(async () => null),
      listListingAuditEvents: vi.fn(async () => []),
    } as unknown as InventoryApi;

    render(
      <InventoryDetailHistoricoTab
        api={api}
        detail={createInventoryDetailFixture()}
        onUpdated={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Gerar análise" });
    expect(button).toBeDisabled();
    const readiness = screen.getByRole("status");
    expect(readiness).toHaveTextContent("marca e modelo do catálogo");
    expect(readiness).toHaveTextContent("valor de aquisição");
    fireEvent.click(button);
    await waitFor(() => expect(analyzeListingResale).not.toHaveBeenCalled());
  });

  it("only analyzes a complete listing after the operator clicks", async () => {
    const detail = createInventoryDetailFixture({
      listing: {
        ...createInventoryDetailFixture().listing,
        catalog: {
          brandCode: "21",
          brandName: "Fiat",
          fipeCode: "001268-0",
          fuel: "Flex",
          modelCode: "4828",
          modelName: "Strada Ranch",
          modelYear: 2025,
          priceCents: 19000000,
          referenceMonth: "agosto de 2026",
          source: "fipe",
          vehicleType: "cars",
          yearCode: "2025-1",
          yearName: "2025 Gasolina",
        },
      },
    });
    const analyzeListingResale = vi.fn(async () => detail);
    const api = {
      analyzeListingResale,
      getVehicleUnitAcquisition: vi.fn(async () => ({
        acquisitionPriceCents: 16000000,
      })),
      listListingAuditEvents: vi.fn(async () => []),
    } as unknown as InventoryApi;

    render(
      <InventoryDetailHistoricoTab
        api={api}
        detail={detail}
        onUpdated={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Gerar análise" });
    expect(analyzeListingResale).not.toHaveBeenCalled();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() =>
      expect(analyzeListingResale).toHaveBeenCalledWith("listing_1"),
    );
  });
});
