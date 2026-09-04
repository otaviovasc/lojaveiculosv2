// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInventoryDetailFixture } from "../model/inventoryDetail.testSupport";
import { InventoryDetailVitrineTab } from "./InventoryDetailVitrineTab";
import { createVitrinePageSlug } from "./VitrineTabComponentsHelper";

const runtime = vi.hoisted(() => ({
  createOrReuseVehicleVitrine: vi.fn(),
  deletePage: vi.fn(),
  getStoreSettings: vi.fn(),
  listPages: vi.fn(),
  updatePage: vi.fn(),
}));

vi.mock("../../publicSite/storefrontRuntimeApis", () => ({
  createRuntimeSettingsApi: () => ({
    getStoreSettings: runtime.getStoreSettings,
  }),
  createRuntimeStorefrontPagesApi: () => ({
    createOrReuseVehicleVitrine: runtime.createOrReuseVehicleVitrine,
    deletePage: runtime.deletePage,
    listPages: runtime.listPages,
    updatePage: runtime.updatePage,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InventoryDetailVitrineTab", () => {
  it("uses the server command and exposes an accessible publish control", async () => {
    const detail = createInventoryDetailFixture();
    const page = {
      components: [],
      id: "page_1",
      order: 0,
      slug: "vitrine-veiculo-de-teste-listing-1",
      title: "Veículo de teste - Oferta Exclusiva",
      visible: true,
    };
    runtime.getStoreSettings.mockResolvedValue(settings);
    runtime.listPages.mockResolvedValue([]);
    runtime.createOrReuseVehicleVitrine.mockResolvedValue(page);
    runtime.updatePage.mockResolvedValue({ ...page, visible: false });
    const user = userEvent.setup();

    render(
      <InventoryDetailVitrineTab
        detail={detail}
        primaryUnit={detail.units[0] ?? null}
        specs={specs}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Criar Vitrine Customizada" }),
    );
    expect(runtime.createOrReuseVehicleVitrine).toHaveBeenCalledWith(
      "listing_1",
      { visible: true },
    );

    const publish = await screen.findByRole("checkbox", {
      name: "Publicar Vitrine",
    });
    expect(publish).toBeChecked();
    await user.click(publish);
    await waitFor(() =>
      expect(runtime.updatePage).toHaveBeenCalledWith("page_1", {
        visible: false,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Editar no Editor" }));
    expect(window.location.hash).toBe("#/custom-pages?page=page_1");
  });

  it("finds the durable listing binding after the page slug changes", async () => {
    const detail = createInventoryDetailFixture({
      listing: { title: "Título alterado" } as never,
    });
    runtime.getStoreSettings.mockResolvedValue(settings);
    runtime.listPages.mockResolvedValue([
      {
        components: [],
        id: "page_bound",
        order: 0,
        slug: "slug-editado-manualmente",
        sourceListingId: "listing_1",
        title: "Página editada",
        visible: true,
      },
    ]);

    render(
      <InventoryDetailVitrineTab
        detail={detail}
        primaryUnit={detail.units[0] ?? null}
        specs={specs}
      />,
    );

    expect(
      await screen.findByRole("checkbox", { name: "Publicar Vitrine" }),
    ).toBeChecked();
    expect(runtime.createOrReuseVehicleVitrine).not.toHaveBeenCalled();
  });

  it("adopts an existing published deterministic-slug Vitrine before activating it", async () => {
    const detail = createInventoryDetailFixture();
    const legacyPage = {
      components: [],
      id: "page_legacy",
      order: 0,
      slug: createVitrinePageSlug(detail.listing),
      sourceListingId: null,
      title: "Página editada",
      visible: true,
    };
    const adoptedPage = {
      ...legacyPage,
      sourceListingId: detail.listing.id,
    };
    runtime.getStoreSettings.mockResolvedValue(settings);
    runtime.listPages.mockResolvedValue([legacyPage]);
    runtime.createOrReuseVehicleVitrine.mockResolvedValue(adoptedPage);

    render(
      <InventoryDetailVitrineTab
        detail={detail}
        primaryUnit={detail.units[0] ?? null}
        specs={specs}
      />,
    );

    expect(
      await screen.findByRole("checkbox", { name: "Publicar Vitrine" }),
    ).toBeChecked();
    expect(runtime.createOrReuseVehicleVitrine).toHaveBeenCalledWith(
      detail.listing.id,
      { visible: true },
    );
  });
});

const settings = {
  identity: {
    legalName: "Loja Demo Ltda",
    publicSlug: "demo",
    tradingName: "Loja Demo",
  },
  profile: { logoImageUrl: null, whatsappPhone: "11999999999" },
  publicSite: { theme: {} },
} as never;

const specs = {
  bodyType: "Sedã",
  color: "Preto",
  doors: "4",
  engine: "2.0",
  fuel: "Flex",
  km: "12.000 km",
  modality: "Seminovo",
  plate: "ABC1D23",
  transmission: "Automático",
  vin: "9BWZZZ377VT004251",
};
