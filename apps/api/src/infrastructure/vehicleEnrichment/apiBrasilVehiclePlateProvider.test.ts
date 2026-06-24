import { describe, expect, it } from "vitest";
import {
  createApiBrasilVehiclePlateProvider,
  normalizeApiBrasilPlateResponse,
} from "./apiBrasilVehiclePlateProvider.js";

describe("APIBrasil vehicle plate provider", () => {
  it("posts to the base 000 vehicle data endpoint with bearer auth", async () => {
    const calls: Array<{ init?: RequestInit; url: string }> = [];
    const fetchMock: typeof globalThis.fetch = async (input, init) => {
      calls.push({ ...(init ? { init } : {}), url: String(input) });
      return new Response(
        JSON.stringify({
          data: {
            dados: {
              ano: "2023",
              anoModelo: "2024",
              cor: "Branca",
              marca: "Fiat",
              modelo: "Strada",
              placa: "ABC1D23",
            },
          },
          error: false,
        }),
      );
    };
    const provider = createApiBrasilVehiclePlateProvider({
      fetch: fetchMock,
      token: "bearer-token",
    });

    const result = await provider.lookupPlate({ plate: "abc1d23" });

    expect(calls[0]?.url).toBe(
      "https://gateway.apibrasil.io/api/v2/vehicles/base/000/dados",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.headers).toMatchObject({
      Authorization: "Bearer bearer-token",
    });
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ placa: "ABC1D23" }));
    expect(result.vehicle).toMatchObject({
      brand: "Fiat",
      color: "Branca",
      model: "Strada",
      modelYear: 2024,
    });
  });

  it("maps network failures to provider 503 errors", async () => {
    const provider = createApiBrasilVehiclePlateProvider({
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
      token: "bearer-token",
    });

    await expect(
      provider.lookupPlate({ plate: "ABC1D23" }),
    ).rejects.toMatchObject({
      message: "Plate lookup provider request failed.",
      name: "InventoryEnrichmentProviderError",
      statusCode: 503,
    });
  });

  it("normalizes nested vehicle, metadata, and highest-score FIPE data", () => {
    const result = normalizeApiBrasilPlateResponse(
      {
        data: {
          dados: {
            ano: "2023",
            anoModelo: "2023",
            cor: "Branca",
            extra: {
              caixa_cambio: "Automatica",
              combustivel: "Flex",
              municipio: "Belo Horizonte",
              tipo_veiculo: "Automovel",
              uf_placa: "MG",
            },
            fipe: {
              dados: [
                {
                  ano_modelo: "2023",
                  codigo_fipe: "001267-0",
                  combustivel: "Gasolina",
                  mes_referencia: "junho de 2026",
                  score: 80,
                  texto_marca: "Fiat",
                  texto_modelo: "Strada Freedom",
                  texto_valor: "R$ 95.000,00",
                },
                {
                  ano_modelo: "2023",
                  codigo_fipe: "001268-0",
                  combustivel: "Flex",
                  mes_referencia: "junho de 2026",
                  score: 101,
                  texto_marca: "Fiat",
                  texto_modelo: "Strada Ranch",
                  texto_valor: "R$ 105.500,00",
                },
              ],
            },
            marca: "Fiat",
            modelo: "Strada",
            placa: "ABC1D23",
            versao: "Ranch",
          },
        },
      },
      "ABC1D23",
    );

    expect(result.fipe).toMatchObject({
      code: "001268-0",
      modelName: "Strada Ranch",
      priceCents: 10550000,
      score: 101,
    });
    expect(result.vehicle).toMatchObject({
      brand: "Fiat",
      fuel: "Flex",
      transmission: "Automatica",
      version: "Ranch",
    });
    expect(result.metadata).toContainEqual({
      label: "Municipio",
      value: "Belo Horizonte",
    });
  });
});
