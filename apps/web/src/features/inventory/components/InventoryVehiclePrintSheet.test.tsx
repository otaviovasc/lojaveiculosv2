// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountSessionProvider } from "../../account/accountSession";
import type { SessionBootstrap } from "../../account/apiClient";
import type { InventoryListingDetail } from "../model/types";
import { InventoryVehiclePrintSheet } from "./InventoryVehiclePrintSheet";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("InventoryVehiclePrintSheet", () => {
  it("uses the active store identity, human labels, and accessible dialog focus", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);

    render(
      <AccountSessionProvider session={session()}>
        <PrintSheetHarness />
      </AccountSessionProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Abrir ficha" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "Ficha completa do veículo",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Auto Prime Veículos")).toBeVisible();
    expect(screen.getByText("Publicado")).toBeVisible();
    expect(screen.queryByText("published")).not.toBeInTheDocument();
    expect(screen.getByText("Combustível")).toBeVisible();
    expect(screen.getByText("Câmbio")).toBeVisible();
    expect(screen.getByText("Chassi / VIN")).toBeVisible();
    expect(screen.getByText(longVin)).toBeVisible();

    const printButton = screen.getByRole("button", {
      name: "Imprimir / Salvar PDF",
    });
    await waitFor(() => expect(printButton).toHaveFocus());
    await user.click(printButton);
    expect(print).toHaveBeenCalledOnce();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Ficha completa do veículo" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("uses an honest generic label without an account session", () => {
    render(
      <InventoryVehiclePrintSheet
        detail={detail}
        onClose={vi.fn()}
        primaryUnit={unit}
        specs={specs}
      />,
    );

    expect(screen.getByText("Loja de veículos")).toBeVisible();
    expect(screen.queryByText("Loja Veiculos")).not.toBeInTheDocument();
  });
});

function PrintSheetHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} type="button">
        Abrir ficha
      </button>
      {isOpen ? (
        <InventoryVehiclePrintSheet
          detail={detail}
          onClose={() => setIsOpen(false)}
          primaryUnit={unit}
          specs={specs}
        />
      ) : null}
    </>
  );
}

const longVin = "WAUZZZF47NA1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const unit = {
  colorName: "black",
  createdAt: "2026-07-01T12:00:00.000Z",
  id: "unit_1",
  listingId: "listing_1",
  plate: "ABC1D23",
  status: "available",
  stockNumber: "ESTOQUE-MUITO-LONGO-001-ALFA-BETA",
  storeId: "store_1",
  tenantId: "tenant_1",
  updatedAt: "2026-07-01T12:00:00.000Z",
  vin: longVin,
} as const;

const detail = {
  checklists: [],
  costs: [],
  documents: [],
  listing: {
    catalog: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    description: null,
    doors: 4,
    engineAspiration: null,
    engineDisplacement: "2.0",
    fuelType: "flex",
    id: "listing_1",
    internalNotes: null,
    manufactureYear: 2025,
    mileageKm: 12_500,
    modelYear: 2026,
    plate: "ABC1D23",
    priceCents: 18_990_000,
    publicSlug: "sedan-premium",
    status: "published",
    storeId: "store_1",
    tenantId: "tenant_1",
    title: "Sedã Premium com Título Extenso para Exposição",
    transmission: "automatic",
    trimName: "Prestige",
    unitIds: ["unit_1"],
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  media: [],
  priceHistory: [],
  status: "ready",
  statusHistory: [],
  units: [unit],
} satisfies InventoryListingDetail;

const specs = {
  bodyType: "Sedã",
  color: "Preto",
  doors: "4 portas",
  engine: "2.0",
  fuel: "Flex",
  km: "12.500 km",
  modality: "Estoque ESTOQUE-MUITO-LONGO-001-ALFA-BETA",
  plate: "ABC1D23",
  transmission: "Automático",
  vin: longVin,
};

function session(): SessionBootstrap {
  const store = {
    effectivePermissions: ["inventory.read"],
    role: "owner",
    status: "active",
    storeId: "store_1",
    storeName: "Auto Prime Veículos",
    storeSlug: "auto-prime",
    tenantId: "tenant_1",
    tenantName: "Auto Prime",
  } as const;

  return {
    defaultStore: store,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [store],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_owner",
      email: "owner@example.com",
      id: "user_1",
      name: "Owner",
    },
  };
}
