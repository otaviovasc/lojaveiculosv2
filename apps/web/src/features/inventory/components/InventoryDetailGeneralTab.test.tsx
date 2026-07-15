// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryListingDetail,
  UpdateInventoryListingInput,
  UpdateInventoryUnitInput,
} from "../model/types";
import { buildInitialSpecs } from "./InventoryDetailFormatters";
import { InventoryDetailGeneralTab } from "./InventoryDetailGeneralTab";
import {
  initialObservacoes,
  initialOpcionais,
} from "./InventoryDetailWorkspaceMocks";

afterEach(cleanup);

describe("InventoryDetailGeneralTab vehicle edit", () => {
  it("opens the live editor and persists changed listing and unit fields", async () => {
    const detail = createDetail();
    const { api, getPersisted } = createEditApi(detail);
    const onEditSaved = vi.fn();
    const onUpdated = vi.fn();
    const user = userEvent.setup();

    renderGeneralTab({ api, detail, onEditSaved, onUpdated });

    await user.click(
      screen.getByRole("button", { name: "Editar especificações" }),
    );
    expect(
      screen.getByRole("heading", { name: "Editar veículo" }),
    ).toBeVisible();

    await replaceInput(user, "Quilometragem", "54321");
    await replaceInput(user, "Portas", "4");
    await replaceInput(user, "Placa", "QAE1B23");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(api.updateListingDetails).toHaveBeenCalledWith("listing_1", {
        doors: 4,
        mileageKm: 54321,
      }),
    );
    expect(api.updateUnit).toHaveBeenCalledWith("unit_1", {
      plate: "QAE1B23",
    });
    expect(onUpdated).toHaveBeenCalledWith(getPersisted());
    expect(onEditSaved).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("heading", { name: "Editar veículo" }),
    ).not.toBeInTheDocument();
  });

  it("does not resubmit a workflow-owned reserved status on a specs edit", async () => {
    const detail = createDetail({ unitStatus: "reserved" });
    const { api } = createEditApi(detail);
    const user = userEvent.setup();

    renderGeneralTab({ api, detail });
    await user.click(
      screen.getByRole("button", { name: "Editar especificações" }),
    );

    expect(screen.getByDisplayValue("Reservado")).toBeDisabled();
    await replaceInput(user, "Quilometragem", "33000");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(api.updateListingDetails).toHaveBeenCalledWith("listing_1", {
        mileageKm: 33000,
      }),
    );
    expect(api.updateUnit).not.toHaveBeenCalled();
  });
});

async function replaceInput(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

function renderGeneralTab({
  api,
  detail,
  onEditSaved = vi.fn(),
  onUpdated = vi.fn(),
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onEditSaved?: () => void;
  onUpdated?: (detail: InventoryListingDetail) => void;
}) {
  const unit = detail.units[0] ?? null;
  return render(
    <InventoryDetailGeneralTab
      api={api}
      detail={detail}
      initialUnitId={unit?.id ?? null}
      notasInternas=""
      observacoes={[...initialObservacoes]}
      onEditSaved={onEditSaved}
      onSaveNotasInternas={vi.fn()}
      onToggleObservacao={vi.fn()}
      onToggleOpcional={vi.fn()}
      onUpdated={onUpdated}
      opcionais={[...initialOpcionais]}
      specs={buildInitialSpecs(detail.listing, unit)}
    />,
  );
}

function createEditApi(initial: InventoryListingDetail) {
  let persisted = initial;
  const updateListingDetails = vi.fn(
    async (_listingId: string, input: UpdateInventoryListingInput) => {
      persisted = {
        ...persisted,
        listing: { ...persisted.listing, ...input },
      };
      return persisted;
    },
  );
  const updateUnit = vi.fn(
    async (_unitId: string, input: UpdateInventoryUnitInput) => {
      persisted = {
        ...persisted,
        units: persisted.units.map((unit) =>
          unit.id === "unit_1" ? { ...unit, ...input } : unit,
        ),
      };
      return persisted;
    },
  );
  const api = {
    listCatalogBrands: vi.fn(async () => []),
    updateListingDetails,
    updateUnit,
  } as unknown as InventoryApi;
  return { api, getPersisted: () => persisted };
}

function createDetail({
  unitStatus = "available",
}: {
  unitStatus?: InventoryListingDetail["units"][number]["status"];
} = {}): InventoryListingDetail {
  return {
    checklists: [],
    costs: [],
    documents: [],
    listing: {
      catalog: null,
      commercialTags: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      description: "Veículo de teste",
      doors: 2,
      engineAspiration: "aspirated",
      engineDisplacement: "2.0",
      fuelType: "flex",
      id: "listing_1",
      internalNotes: null,
      manufactureYear: 2022,
      mileageKm: 32000,
      modelYear: 2023,
      plate: "ABC1D23",
      priceCents: 18990000,
      publicSlug: null,
      resaleAnalysis: null,
      status: "published",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Veículo editável",
      transmission: "automatic",
      trimName: "Touring",
      unitIds: ["unit_1"],
      updatedAt: "2026-01-01T00:00:00.000Z",
      videoUrl: null,
    },
    media: [],
    priceHistory: [],
    status: "ready",
    statusHistory: [],
    units: [
      {
        colorName: "black",
        createdAt: "2026-01-01T00:00:00.000Z",
        id: "unit_1",
        listingId: "listing_1",
        plate: "ABC1D23",
        status: unitStatus,
        stockNumber: "QA-1",
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        vin: "9BWZZZ377VT004251",
      },
    ],
  };
}
