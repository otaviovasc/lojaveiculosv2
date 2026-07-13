// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInventoryDetailFixture } from "../model/inventoryDetail.testSupport";
import { InventoryDetailHistoricoTab } from "./InventoryDetailHistoricoTab";

afterEach(cleanup);

describe("InventoryDetailHistoricoTab", () => {
  it("renders only events present in the listing detail", () => {
    const detail = createInventoryDetailFixture({
      costs: [
        {
          amountCents: 35000,
          costDate: "2026-02-02T10:00:00.000Z",
          createdAt: "2026-02-02T10:00:00.000Z",
          description: "Higienização",
          id: "cost_1",
          kind: "preparation",
          storeId: "store_1",
          tenantId: "tenant_1",
          unitId: "unit_1",
          updatedAt: "2026-02-02T10:00:00.000Z",
        },
      ],
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
      statusHistory: [
        {
          actorUserId: "user_1",
          changedAt: "2026-02-01T10:00:00.000Z",
          fromStatus: "draft",
          id: "status_1",
          listingId: "listing_1",
          reason: null,
          target: "listing",
          toStatus: "published",
          unitId: null,
        },
      ],
    });

    render(<InventoryDetailHistoricoTab detail={detail} />);

    expect(screen.getByText("Preço do anúncio alterado")).toBeVisible();
    expect(screen.getByText(/185\.000.*189\.900/)).toBeVisible();
    expect(screen.getByText("Status do anúncio alterado")).toBeVisible();
    expect(screen.getByText("Rascunho → Publicado")).toBeVisible();
    expect(screen.getByText("Custo registrado")).toBeVisible();
    expect(screen.getByText(/Preparação.*350.*Higienização/)).toBeVisible();
    expect(screen.getByText(/Nenhuma análise.*foi gerada/i)).toBeVisible();
    expect(
      screen.getByText(/Operadores e ações detalhadas não são simulados/i),
    ).toBeVisible();
    expect(screen.queryByText("Carlos Cunha")).toBeNull();
  });
});
