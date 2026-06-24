import { describe, expect, it, vi } from "vitest";
import {
  createFipeVehicleCatalogProvider,
  parseFipePriceCents,
} from "./fipeVehicleCatalogProvider.js";

describe("FIPE vehicle catalog provider", () => {
  it("parses FIPE BRL values into cents", () => {
    expect(parseFipePriceCents("R$ 72.900,00")).toBe(7290000);
    expect(parseFipePriceCents("R$ 1.234.567,89")).toBe(123456789);
    expect(parseFipePriceCents("")).toBeNull();
  });

  it("retries rate limited FIPE requests before returning data", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response("Too many requests", {
          headers: { "retry-after": "2" },
          status: 429,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ code: 21, name: "Fiat" }]), {
          status: 200,
        }),
      );
    const sleep = vi.fn(async () => undefined);
    const provider = createFipeVehicleCatalogProvider({
      baseUrl: "https://fipe.example.test/api/",
      fetch,
      maxAttempts: 2,
      sleep,
    });

    await expect(provider.listBrands({ vehicleType: "cars" })).resolves.toEqual(
      [
        {
          code: "21",
          imageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/1/12/Fiat_Automobiles_logo.svg",
          name: "Fiat",
        },
      ],
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("maps FIPE brand names to old seed brand logo URLs", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          { code: 23, name: "GM - Chevrolet" },
          { code: 59, name: "VW - VolksWagen" },
        ]),
        { status: 200 },
      ),
    );
    const provider = createFipeVehicleCatalogProvider({
      baseUrl: "https://fipe.example.test/api/",
      fetch,
    });

    await expect(provider.listBrands({ vehicleType: "cars" })).resolves.toEqual(
      [
        {
          code: "23",
          imageUrl: "https://cdn.worldvectorlogo.com/logos/chevrolet-1.svg",
          name: "GM - Chevrolet",
        },
        {
          code: "59",
          imageUrl:
            "https://cdn.worldvectorlogo.com/logos/volkswagen-logo-till-1995.svg",
          name: "VW - VolksWagen",
        },
      ],
    );
  });

  it("retries FIPE requests that fail before receiving a response", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error("socket timeout"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ code: 21, name: "Fiat" }]), {
          status: 200,
        }),
      );
    const sleep = vi.fn(async () => undefined);
    const provider = createFipeVehicleCatalogProvider({
      baseUrl: "https://fipe.example.test/api/",
      fetch,
      maxAttempts: 2,
      sleep,
    });

    await expect(
      provider.listBrands({ vehicleType: "cars" }),
    ).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it("does not retry non-transient FIPE responses", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response("Not found", {
        status: 404,
      }),
    );
    const provider = createFipeVehicleCatalogProvider({
      baseUrl: "https://fipe.example.test/api/",
      fetch,
      maxAttempts: 3,
      sleep: vi.fn(async () => undefined),
    });

    await expect(
      provider.listBrands({ vehicleType: "cars" }),
    ).rejects.toMatchObject({
      name: "FipeCatalogProviderError",
      status: 404,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
