import { describe, expect, it, vi } from "vitest";
import { fetchBrazilianZipCodeAddress } from "./settingsCep";

describe("settings CEP lookup", () => {
  it("looks up city and state through BrasilAPI for valid CEP digits", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ city: "Sao Paulo", state: "SP" }), {
        status: 200,
      }),
    );

    await expect(
      fetchBrazilianZipCodeAddress("01001-000", fetch),
    ).resolves.toEqual({
      city: "Sao Paulo",
      state: "SP",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://brasilapi.com.br/api/cep/v1/01001000",
    );
  });

  it("skips incomplete CEP values", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();

    await expect(fetchBrazilianZipCodeAddress("0100", fetch)).resolves.toBe(
      null,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
