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
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({ homolog: false, placa: "ABC1D23", tipo: "fipe" }),
    );
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
              aspiracao: "Turbo",
              caixa_cambio: "Automatica",
              combustivel: "Flex",
              cilindradas: 1984,
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
      aspiration: "Turbo",
      brand: "Fiat",
      engine: "1984",
      fuel: "Flex",
      transmission: "Automatica",
      version: "Ranch",
    });
    expect(result.metadata).toContainEqual({
      label: "Municipio",
      value: "Belo Horizonte",
    });
  });

  it("normalizes single-object FIPE references from provider payloads", () => {
    const result = normalizeApiBrasilPlateResponse(
      {
        data: {
          dados: {
            anoModelo: "2023",
            fipe: {
              ano_modelo: "2023",
              codigo_fipe: "008123-4",
              combustivel: "Gasolina",
              mes_referencia: "junho de 2026",
              texto_marca: "Audi",
              texto_modelo: "A3 2.0 TFSI",
              texto_valor: "R$ 120.500,00",
            },
            marca: "Audi",
            modelo: "A3",
            placa: "ABC1D23",
          },
        },
      },
      "ABC1D23",
    );

    expect(result.fipe).toMatchObject({
      brandName: "Audi",
      code: "008123-4",
      modelName: "A3 2.0 TFSI",
      modelYear: 2023,
      priceCents: 12050000,
    });
  });

  it("merges live-shaped camelCase FIPE arrays and preserves the Mercosul input", () => {
    const result = normalizeApiBrasilPlateResponse(
      {
        data: {
          ano_fabricacao: 2013,
          ano_modelo: 2013,
          cilindradas: "1984",
          combustivel: "GASOLINA",
          cor: "BRANCA",
          marca: "VOLVO",
          modelo: "I/VOLVO V40 T4 DYNAMIC",
          placa: "AXD9738",
          placaMercosul: "AXD9H38",
          potencia: 180,
          tipo_veiculo: "Automovel",
          uf_jurisdicao: "PR",
        },
      },
      "AXD9H38",
      {
        fipePayload: {
          data: [
            {
              anoFabricacao: 2013,
              anoModelo: "2013",
              codigoFipe: "029039-4",
              combustivel: "gasolina",
              marca: "Volvo",
              mesReferencia: "agosto de 2026",
              modelo: "V40 T-4 2.0 Aut./Mec.",
              principal: true,
              valor: 65526,
            },
          ],
        },
      },
    );

    expect(result).toMatchObject({
      catalogIdentity: { reason: "catalog_not_found", status: "unresolved" },
      fipe: {
        code: "029039-4",
        modelName: "V40 T-4 2.0 Aut./Mec.",
        priceCents: 6552600,
        referenceMonth: "agosto de 2026",
      },
      lookupVersion: 2,
      plate: "AXD9H38",
      vehicle: {
        brand: "VOLVO",
        engine: "1984",
        model: "I/VOLVO V40 T4 DYNAMIC",
        state: "PR",
      },
    });
    expect(result.fipeCandidates).toHaveLength(1);
  });
});
