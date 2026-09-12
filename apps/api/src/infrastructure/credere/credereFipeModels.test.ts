import { describe, expect, it, vi } from "vitest";
import {
  gateway,
  jsonResponse,
  tokenSet,
} from "./credereHttpGateway.testSupport.js";

describe("Credere FIPE vehicle models gateway", () => {
  it("sends exact FIPE and both compatible-year bounds", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        vehicle_models: [
          {
            available: true,
            fipe_code: "005340-6",
            fuel_type: { label: "Flex" },
            id: "model_1",
            model_name: "Gol",
            molicar_code: "01906108-0",
            version: "1.0 MPI",
            year_end: 2025,
            year_start: 2020,
          },
        ],
      }),
    );

    await expect(
      gateway(fetcher).listVehicleModelsByFipe({
        credereStoreId: "trusted_store_1",
        fipeCode: "005340-6",
        modelYear: 2023,
        token: tokenSet(),
      }),
    ).resolves.toMatchObject([
      {
        available: true,
        fipeCode: "005340-6",
        fuelType: "Flex",
        id: "model_1",
        molicarCode: "01906108-0",
        version: "1.0 MPI",
        yearEnd: 2025,
        yearStart: 2020,
      },
    ]);
    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/v1/vehicle_models");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      fipe_code: "005340-6",
      per_page: "100",
      year_end_greater_than_or_equal_to: "2023",
      year_start_less_than_or_equal_to: "2023",
    });
    expect(fetcher.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Store-Id");
  });
});
