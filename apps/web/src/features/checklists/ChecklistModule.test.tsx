// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../inventory/api/apiClient";
import type { InventoryChecklistOverview } from "../inventory/model/checklistOverviewTypes";
import { ChecklistModule } from "./ChecklistModule";

afterEach(cleanup);

describe("ChecklistModule", () => {
  it("shows the fleet overview and opens the schema-rich editor", async () => {
    const api = {
      listChecklistOverview: vi.fn(async () => overviewFixture()),
    } as unknown as InventoryApi;
    const user = userEvent.setup();

    render(<ChecklistModule api={api} />);

    expect(
      await screen.findByRole("heading", { name: "Checklists de veículos" }),
    ).toBeVisible();
    await waitFor(() => expect(api.listChecklistOverview).toHaveBeenCalled());
    expect(screen.getAllByText("Fiat Toro Volcano").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Com reprovação").length).toBeGreaterThan(0);

    await user.click(
      screen.getAllByRole("button", { name: "Editar checklist" })[0]!,
    );

    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByText("Checklist de entrega")).toBeVisible();
    expect(screen.getByLabelText("Situação de Manual")).toHaveTextContent(
      "Reprovado",
    );
    expect(screen.getByLabelText("Observações de Manual")).toHaveValue(
      "Não localizado",
    );
  });

  it("keeps mutation controls read-only without checklist update permission", async () => {
    const api = {
      listChecklistOverview: vi.fn(async () => overviewFixture()),
      updateChecklist: vi.fn(),
    } as unknown as InventoryApi;
    const user = userEvent.setup();

    render(
      <ChecklistModule
        api={api}
        grantedPermissions={["inventory.checklist_read"]}
      />,
    );

    await user.click(
      (await screen.findAllByRole("button", { name: "Editar checklist" }))[0]!,
    );

    expect(
      screen.getByRole("button", { name: "Resetar itens" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Observações de Manual")).toBeDisabled();
    expect(screen.getByLabelText("Situação de Manual")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Excluir Manual" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Adicionar item ao checklist" }),
    ).toBeDisabled();
    expect(api.updateChecklist).not.toHaveBeenCalled();
  });

  it("preserves the selected checklist after a mutation refresh", async () => {
    const api = {
      listChecklistOverview: vi.fn(async () =>
        overviewWithMultipleChecklists(),
      ),
      updateChecklist: vi.fn(async () => undefined),
    } as unknown as InventoryApi;
    const user = userEvent.setup();

    render(
      <ChecklistModule
        api={api}
        grantedPermissions={[
          "inventory.checklist_read",
          "inventory.checklist_update",
        ]}
      />,
    );

    await user.click(
      (await screen.findAllByRole("button", { name: "Editar checklist" }))[0]!,
    );
    await user.click(
      screen.getByRole("button", { name: "Checklist selecionado" }),
    );
    await user.click(screen.getByRole("option", { name: "Inspeção mecânica" }));
    expect(
      screen.getByRole("button", { name: "Checklist selecionado" }),
    ).toHaveTextContent("Inspeção mecânica");

    await user.click(screen.getByLabelText("Situação de Freios"));
    await user.click(screen.getByRole("option", { name: "Aprovado" }));

    await waitFor(() =>
      expect(api.updateChecklist).toHaveBeenCalledWith(
        "unit_1",
        "checklist_2",
        expect.any(Object),
      ),
    );
    await waitFor(() =>
      expect(api.listChecklistOverview).toHaveBeenCalledTimes(2),
    );
    expect(
      screen.getByRole("button", { name: "Checklist selecionado" }),
    ).toHaveTextContent("Inspeção mecânica");
  });

  it("ignores an older overview response that finishes last", async () => {
    const first = deferred<InventoryChecklistOverview>();
    const latest = deferred<InventoryChecklistOverview>();
    const api = {
      listChecklistOverview: vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(latest.promise),
    } as unknown as InventoryApi;
    const user = userEvent.setup();

    render(<ChecklistModule api={api} />);
    await waitFor(() =>
      expect(api.listChecklistOverview).toHaveBeenCalledTimes(1),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: "Buscar veículos nos checklists",
      }),
      "x",
    );
    await waitFor(() =>
      expect(api.listChecklistOverview).toHaveBeenCalledTimes(2),
    );

    await act(async () => {
      latest.resolve(overviewFixture("Resultado atual"));
      await latest.promise;
    });
    expect(
      (await screen.findAllByText("Resultado atual")).length,
    ).toBeGreaterThan(0);

    await act(async () => {
      first.resolve(overviewFixture("Resultado antigo"));
      await first.promise;
    });
    expect(screen.queryByText("Resultado antigo")).not.toBeInTheDocument();
    expect(screen.getAllByText("Resultado atual").length).toBeGreaterThan(0);
  });

  it("sorts Pendências by failed and pending items together", async () => {
    const overview = overviewFixture();
    const source = overview.items[0]!;
    const api = {
      listChecklistOverview: vi.fn(async () => ({
        ...overview,
        items: [
          {
            ...source,
            listing: { ...source.listing, title: "Mais pendências" },
            metrics: {
              ...source.metrics,
              failedItemCount: 0,
              pendingItemCount: 2,
            },
            unit: { ...source.unit, id: "unit_more" },
          },
          {
            ...source,
            listing: { ...source.listing, title: "Menos pendências" },
            metrics: {
              ...source.metrics,
              failedItemCount: 0,
              pendingItemCount: 1,
            },
            unit: { ...source.unit, id: "unit_less" },
          },
        ],
      })),
    } as unknown as InventoryApi;
    const user = userEvent.setup();

    render(<ChecklistModule api={api} />);
    await screen.findAllByText("Mais pendências");
    await user.click(screen.getByRole("button", { name: "Pendências" }));

    const dataRows = screen.getAllByRole("row").slice(1);
    expect(
      within(dataRows[0]!).getByText("Menos pendências"),
    ).toBeInTheDocument();
    expect(
      within(dataRows[1]!).getByText("Mais pendências"),
    ).toBeInTheDocument();
  });
});

function overviewFixture(
  title = "Fiat Toro Volcano",
): InventoryChecklistOverview {
  return {
    generatedAt: "2026-07-15T12:00:00.000Z",
    items: [
      {
        checklists: [
          {
            completedAt: null,
            completedByUserId: null,
            createdAt: "2026-07-15T10:00:00.000Z",
            id: "checklist_1",
            items: [
              {
                id: "item_1",
                label: "Manual",
                notes: "Não localizado",
                status: "failed",
              },
            ],
            name: "Checklist de entrega",
            status: "failed",
            storeId: "store_1",
            tenantId: "tenant_1",
            unitId: "unit_1",
            updatedAt: "2026-07-15T11:00:00.000Z",
          },
        ],
        listing: {
          id: "listing_1",
          manufactureYear: 2024,
          modelYear: 2025,
          status: "published",
          title,
        },
        metrics: {
          checklistCount: 1,
          failedItemCount: 1,
          itemCount: 1,
          pendingItemCount: 0,
          progressPercent: 0,
          resolvedItemCount: 0,
          waivedItemCount: 0,
        },
        status: "failed",
        unit: {
          colorName: "white",
          id: "unit_1",
          plate: "ABC1D23",
          status: "available",
          stockNumber: "42",
          vin: null,
        },
        updatedAt: "2026-07-15T11:00:00.000Z",
      },
    ],
    summary: {
      attentionUnitCount: 1,
      checklistCount: 1,
      failedItemCount: 1,
      itemCount: 1,
      missingChecklistUnitCount: 0,
      pendingItemCount: 0,
      progressPercent: 0,
      resolvedItemCount: 0,
      unitCount: 1,
      waivedItemCount: 0,
    },
  };
}

function overviewWithMultipleChecklists(): InventoryChecklistOverview {
  const overview = overviewFixture();
  const item = overview.items[0]!;
  const firstChecklist = item.checklists[0]!;
  return {
    ...overview,
    items: [
      {
        ...item,
        checklists: [
          firstChecklist,
          {
            ...firstChecklist,
            id: "checklist_2",
            items: [
              {
                id: "item_2",
                label: "Freios",
                notes: null,
                status: "pending",
              },
            ],
            name: "Inspeção mecânica",
            status: "pending",
          },
        ],
      },
    ],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
