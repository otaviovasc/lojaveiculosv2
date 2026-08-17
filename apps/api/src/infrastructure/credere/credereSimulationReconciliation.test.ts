import { describe, expect, it, vi } from "vitest";
import {
  gateway,
  jsonResponse,
  tokenSet,
} from "./credereHttpGateway.testSupport.js";

describe("Credere simulation reconciliation", () => {
  it("lists only hashed technical candidates", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        data: [
          {
            assets_value: 6_000_000,
            created_at: "2026-07-27T12:00:00Z",
            lead: {
              cpf_cnpj: "123.456.789-01",
              email: "must-not-leave-adapter@example.test",
            },
            uuid: "simulation_1",
            vehicle: {
              manufacture_year: 2022,
              model_year: 2023,
              vehicle_model: { molicar_code: "01906108-0" },
            },
          },
        ],
      }),
    );

    const candidates = await gateway(fetcher).listSimulationCandidates({
      createdAfter: new Date("2026-07-27T12:00:00.000Z"),
      credereStoreId: "store_123",
      token: tokenSet(),
    });

    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://app.meucredere.com.br/api/v1/proposal_simulations?after=2026-07-27&page=1&per_page=100&sort=created_at_desc",
    );
    expect(candidates).toEqual([
      {
        assetValueCents: 6_000_000,
        createdAt: "2026-07-27T12:00:00Z",
        customerDocumentHash:
          "254aa248acb47dd654ca3ea53f48c2c26d641d23d7e2e93a1ec56258df7674c4",
        manufactureYear: 2022,
        modelYear: 2023,
        vehicleMolicarCode: "01906108-0",
        uuid: "simulation_1",
      },
    ]);
    expect(JSON.stringify(candidates)).not.toContain("123.456.789-01");
    expect(JSON.stringify(candidates)).not.toContain("must-not-leave-adapter");
  });

  it("reads every candidate page instead of stopping at the first 100", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      providerCandidate(`simulation_${index}`, index),
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: firstPage }))
      .mockResolvedValueOnce(
        jsonResponse({ data: [providerCandidate("simulation_100", 100)] }),
      );

    const candidates = await gateway(fetcher).listSimulationCandidates({
      createdAfter: new Date("2026-07-27T12:00:00.000Z"),
      credereStoreId: "store_123",
      token: tokenSet(),
    });

    expect(candidates).toHaveLength(101);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[0]).toContain("page=2");
    expect(candidates.at(-1)?.uuid).toBe("simulation_100");
  });
});

function providerCandidate(uuid: string, index: number) {
  return {
    assets_value: 6_000_000 + index,
    created_at: "2026-07-27T12:00:00Z",
    lead: { cpf_cnpj: String(10_000_000_000 + index) },
    uuid,
    vehicle: {
      manufacture_year: 2022,
      model_year: 2023,
      vehicle_model: { molicar_code: "01906108-0" },
    },
  };
}
