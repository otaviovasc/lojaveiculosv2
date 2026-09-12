import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupBrazilianZipCode } from "./cepLookup";

describe("lookupBrazilianZipCode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an incomplete CEP without making a request", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);

    await expect(lookupBrazilianZipCode("1234-5")).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("normalizes the CEP and maps a complete ViaCEP response", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          bairro: "Centro",
          cep: "01001-000",
          localidade: "Sao Paulo",
          logradouro: "Praca da Se",
          uf: "SP",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(lookupBrazilianZipCode("01001-000")).resolves.toEqual({
      cep: "01001-000",
      city: "Sao Paulo",
      neighborhood: "Centro",
      state: "SP",
      street: "Praca da Se",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/01001000/json/",
    );
  });

  it("uses safe fallbacks when optional address fields are absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response("{}", { status: 200 })),
    );

    await expect(lookupBrazilianZipCode("01001000")).resolves.toEqual({
      cep: "01001000",
      city: "",
      neighborhood: "",
      state: "",
      street: "",
    });
  });

  it("returns null when ViaCEP rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(null, { status: 503 })),
    );

    await expect(lookupBrazilianZipCode("01001000")).resolves.toBeNull();
  });

  it("returns null when ViaCEP reports an unknown CEP", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify({ erro: "true" }), { status: 200 }),
        ),
    );

    await expect(lookupBrazilianZipCode("99999999")).resolves.toBeNull();
  });

  it("returns null when the lookup cannot reach ViaCEP", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof globalThis.fetch>()
        .mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(lookupBrazilianZipCode("01001000")).resolves.toBeNull();
  });
});
