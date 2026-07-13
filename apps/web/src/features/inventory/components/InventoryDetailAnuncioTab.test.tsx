// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import { createInventoryDetailFixture } from "../model/inventoryDetail.testSupport";
import type { UpdateInventoryListingInput } from "../model/types";
import { InventoryDetailAnuncioTab } from "./InventoryDetailAnuncioTab";

afterEach(cleanup);

describe("InventoryDetailAnuncioTab", () => {
  it("persists description and price through the inventory API", async () => {
    let persisted = createInventoryDetailFixture();
    const updateListingDetails = vi.fn(
      async (_listingId: string, input: UpdateInventoryListingInput) => {
        persisted = {
          ...persisted,
          listing: { ...persisted.listing, ...input },
        };
        return persisted;
      },
    );
    const onUpdated = vi.fn();
    const user = userEvent.setup();

    render(
      <InventoryDetailAnuncioTab
        api={{ updateListingDetails } as unknown as InventoryApi}
        detail={persisted}
        onUpdated={onUpdated}
        publicListingUrl="/test-store?listing=veiculo-teste"
      />,
    );

    const description = screen.getByLabelText("Descrição do anúncio");
    await user.clear(description);
    await user.type(description, "Descrição salva no backend");
    await user.click(screen.getByRole("button", { name: "Salvar descrição" }));

    await waitFor(() =>
      expect(updateListingDetails).toHaveBeenCalledWith("listing_1", {
        description: "Descrição salva no backend",
      }),
    );

    fireEvent.change(screen.getByLabelText("Valor do anúncio"), {
      target: { value: "210.000,00" },
    });
    await user.click(screen.getByRole("button", { name: "Salvar valor" }));

    await waitFor(() =>
      expect(updateListingDetails).toHaveBeenLastCalledWith("listing_1", {
        priceCents: 21000000,
      }),
    );
    expect(onUpdated).toHaveBeenCalledTimes(2);
  });

  it("does not expose local-only tag, video, or partner mutations", () => {
    render(
      <InventoryDetailAnuncioTab
        api={{} as InventoryApi}
        detail={createInventoryDetailFixture()}
        onUpdated={vi.fn()}
        publicListingUrl="/test-store?listing=veiculo-teste"
      />,
    );

    expect(
      screen.getByText(/tags comerciais e vídeo ainda não fazem parte/i),
    ).toBeVisible();
    expect(screen.queryByPlaceholderText("Tag personalizada...")).toBeNull();
    expect(screen.queryByText("Configurar integração")).toBeNull();
    expect(
      screen.getAllByText("Integração não disponível nesta tela."),
    ).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: "Visualizar anúncio" }),
    ).toHaveAttribute("href", "/test-store?listing=veiculo-teste");
  });

  it("locks description editing while the saved snapshot is pending", async () => {
    const detail = createInventoryDetailFixture();
    let resolveUpdate: ((value: typeof detail) => void) | undefined;
    const updateListingDetails = vi.fn(
      () =>
        new Promise<typeof detail>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    const user = userEvent.setup();

    render(
      <InventoryDetailAnuncioTab
        api={{ updateListingDetails } as unknown as InventoryApi}
        detail={detail}
        onUpdated={vi.fn()}
        publicListingUrl={null}
      />,
    );

    const description = screen.getByLabelText("Descrição do anúncio");
    await user.clear(description);
    await user.type(description, "Descrição enviada");
    await user.click(screen.getByRole("button", { name: "Salvar descrição" }));

    expect(description).toBeDisabled();
    await user.type(description, " não pode sobrescrever");
    expect(description).toHaveValue("Descrição enviada");

    resolveUpdate?.({
      ...detail,
      listing: { ...detail.listing, description: "Descrição enviada" },
    });
    await waitFor(() => expect(description).toBeEnabled());
    expect(description).toHaveValue("Descrição enviada");
  });
});
