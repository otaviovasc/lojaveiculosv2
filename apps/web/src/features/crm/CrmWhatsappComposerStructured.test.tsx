// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanupTest, renderComposer } from "./CrmWhatsappComposer.testSupport";

describe("CrmWhatsappComposer structured sends", () => {
  afterEach(cleanupTest);

  it("sends catalog data from the structured dialog", async () => {
    const user = userEvent.setup();
    const { callbacks } = renderComposer({
      catalogUrl: "https://loja.local/test-store",
      onLoadCatalogProducts: vi.fn(async () => ({
        catalogPhone: "5511940231407",
        products: [],
      })),
    });

    await openAttachment(user, "Enviar catalogo");
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("Catalogo da loja")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Enviar" }));

    expect(callbacks.onSendCatalog).toHaveBeenCalledWith({
      catalogPhone: "5511940231407",
      catalogUrl: "https://loja.local/test-store",
      message: "Confira nosso catalogo de veiculos:",
      title: "Catalogo da loja",
    });
  });

  it("loads and sends a catalog product from the structured dialog", async () => {
    const user = userEvent.setup();
    const { callbacks } = renderComposer({
      onLoadCatalogProducts: vi.fn(async () => ({
        catalogPhone: "5511940231407",
        products: [catalogProduct("prod_1", "Honda Civic EXL")],
      })),
    });

    await openAttachment(user, "Enviar catalogo");
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("Honda Civic EXL")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Enviar" }));

    expect(callbacks.onSendCatalogProduct).toHaveBeenCalledWith({
      catalogPhone: "5511940231407",
      productId: "prod_1",
      productName: "Honda Civic EXL",
    });
    expect(callbacks.onSendCatalog).not.toHaveBeenCalled();
  });

  it("keeps product send disabled when catalog loading fails", async () => {
    const user = userEvent.setup();
    const { callbacks } = renderComposer({
      onLoadCatalogProducts: vi.fn(async () => {
        throw new Error("catalog unavailable");
      }),
    });

    await openAttachment(user, "Enviar catalogo");
    const dialog = screen.getByRole("dialog");

    expect(
      await within(dialog).findByText(/Nao foi possivel carregar/),
    ).toBeVisible();
    await expect(
      within(dialog).getByRole("button", { name: "Enviar" }),
    ).toBeDisabled();
    expect(callbacks.onSendCatalog).not.toHaveBeenCalled();
  });

  it("loads additional catalog product pages before sending", async () => {
    const user = userEvent.setup();
    const onLoadCatalogProducts = vi
      .fn()
      .mockResolvedValueOnce({
        catalogPhone: "5511940231407",
        nextCursor: "cursor_2",
        products: [catalogProduct("prod_1", "Honda Civic EXL")],
      })
      .mockResolvedValueOnce({
        catalogPhone: "5511940231407",
        products: [catalogProduct("prod_2", "Toyota Corolla XEI")],
      });
    const { callbacks } = renderComposer({ onLoadCatalogProducts });

    await openAttachment(user, "Enviar catalogo");
    const dialog = screen.getByRole("dialog");
    await user.click(
      await within(dialog).findByRole("button", { name: "Carregar mais" }),
    );
    await user.click(await within(dialog).findByText("Toyota Corolla XEI"));
    await user.click(within(dialog).getByRole("button", { name: "Enviar" }));

    expect(onLoadCatalogProducts).toHaveBeenLastCalledWith({
      catalogPhone: "5511940231407",
      nextCursor: "cursor_2",
    });
    expect(callbacks.onSendCatalogProduct).toHaveBeenCalledWith({
      catalogPhone: "5511940231407",
      productId: "prod_2",
      productName: "Toyota Corolla XEI",
    });
  });

  it("sends location data from the structured dialog", async () => {
    const user = userEvent.setup();
    const { callbacks } = renderComposer();

    await openAttachment(user, "Localizacao");
    await user.type(screen.getByLabelText("Latitude"), "-23.56168");
    await user.type(screen.getByLabelText("Longitude"), "-46.65598");
    await user.type(screen.getByLabelText("Endereco"), "Av. Paulista, 1000");
    expect(screen.getByTitle("Mapa da localizacao")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "N" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Enviar",
      }),
    );

    expect(callbacks.onSendLocation).toHaveBeenCalledWith({
      address: "Av. Paulista, 1000",
      latitude: -23.56148,
      longitude: -46.65598,
      name: "Loja",
    });
  });

  it("loads stock vehicles and sends the selected vehicle package", async () => {
    const user = userEvent.setup();
    const { callbacks } = renderComposer({
      onLoadVehicles: vi.fn(async () => [
        {
          listingId: "10000000-0000-4000-8000-000000000001",
          mediaCount: 3,
          mileageLabel: "32.000 km",
          plate: "ABC1D23",
          priceLabel: "R$ 189.900",
          status: "available",
          stockNumber: "LV-A4-PRETO",
          thumbnailUrl: "https://cdn.local/audi.jpg",
          title: "Audi A4 Prestige Plus 2022",
          unitId: "11000000-0000-4000-8000-000000000001",
          yearLabel: "2021/2022",
        },
      ]),
    });

    await openAttachment(user, "Enviar veiculo");
    const dialog = screen.getByRole("dialog");
    expect(
      await within(dialog).findByText("Audi A4 Prestige Plus 2022"),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Enviar" }));

    expect(callbacks.onSendVehicle).toHaveBeenCalledWith({
      listingId: "10000000-0000-4000-8000-000000000001",
      mediaLimit: 4,
      mileageLabel: "32.000 km",
      priceLabel: "R$ 189.900",
      thumbnailUrl: "https://cdn.local/audi.jpg",
      title: "Audi A4 Prestige Plus 2022",
      unitId: "11000000-0000-4000-8000-000000000001",
      year: "2021/2022",
    });
  });
});

async function openAttachment(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole("button", { name: "Anexos" }));
  await user.click(screen.getByRole("button", { name }));
}

function catalogProduct(id: string, name: string) {
  return {
    currency: "BRL",
    id,
    images: id === "prod_1" ? ["https://cdn.local/civic.jpg"] : [],
    name,
    price: id === "prod_1" ? "119900" : "129900",
    retailerId: id === "prod_1" ? "CIVIC-1" : "COROLLA-1",
  };
}
