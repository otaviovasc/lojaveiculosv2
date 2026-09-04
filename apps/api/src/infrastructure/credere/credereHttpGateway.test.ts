import { describe, expect, it, vi } from "vitest";
import {
  condition,
  gateway,
  jsonResponse,
  simulationFixture,
  simulationInput,
  tokenSet,
} from "./credereHttpGateway.testSupport.js";

describe("createCredereHttpGateway", () => {
  it("scopes banks_api requests with the trusted Store-Id argument", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(simulationFixture()));

    await gateway(fetcher).createSimulation({
      credereStoreId: "store_123",
      simulation: simulationInput(),
      token: tokenSet(),
    });

    const init = fetcher.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as {
      simulation: { bank_febraban_codes: string[] };
    };
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://app.meucredere.com.br/api/v1/banks_api/simulations",
    );
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer access_1",
      "Store-Id": "store_123",
    });
    expect(body.simulation.bank_febraban_codes).toEqual(["655", "623"]);
    expect(JSON.stringify(body)).not.toContain("store_999");
    expect(JSON.stringify(body)).not.toContain("vehicle_molicar_code");
    expect(body).toMatchObject({
      simulation: {
        vehicle: { credere_vehicle_model_id: "20089" },
      },
    });
  });

  it("preserves provider store status from discovery", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        stores: [
          {
            cnpj: "00.000.000/0001-00",
            display_name: "Credere Filial",
            id: "store_inactive",
            name: "Filial",
            status: "inactive",
          },
        ],
      }),
    );

    await expect(
      gateway(fetcher).listStores({ token: tokenSet() }),
    ).resolves.toEqual([
      {
        cnpj: "00.000.000/0001-00",
        displayName: "Credere Filial",
        id: "store_inactive",
        name: "Filial",
        status: "inactive",
      },
    ]);
  });

  it("maps safe provider errors without raw PII or provider bodies", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        { cpf_cnpj: "123.456.789-09", email: "lead@test.invalid" },
        429,
        {
          "retry-after": "900",
        },
      ),
    );

    await expect(
      gateway(fetcher).getSimulation({
        credereStoreId: "store_123",
        token: tokenSet(),
        uuid: "sim_1",
      }),
    ).rejects.toMatchObject({
      details: { retryAfterSeconds: 300 },
      kind: "rate_limited",
      retryAfterSeconds: 300,
    });
  });

  it("represents refresh-token rotation for repository callers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        access_token: "access_2",
        expires_in: 3600,
        refresh_token: "refresh_2",
        scope: "simulator proposals",
        token_type: "bearer",
        user: { id: 411 },
      }),
    );

    const token = await gateway(fetcher).refreshToken("refresh_1");
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as {
      grant_type: string;
      refresh_token: string;
    };

    expect(body).toMatchObject({
      grant_type: "refresh_token",
      refresh_token: "refresh_1",
    });
    expect(token).toMatchObject({
      accessToken: "access_2",
      providerAccountId: "411",
      refreshToken: "refresh_2",
    });
  });

  it("does not blindly retry create simulation on ambiguous failure", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ message: "created maybe" }, 503));

    await expect(
      gateway(fetcher).createSimulation({
        credereStoreId: "store_123",
        simulation: simulationInput(),
        token: tokenSet(),
      }),
    ).rejects.toMatchObject({ kind: "indeterminate" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("maps simulation polling conditions without returning lead PII", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        data: {
          conditions: [
            condition("1", null, true, false),
            condition("2", "2026-07-27T10:00:00Z", true, true),
            condition("3", "2026-07-27T10:00:00Z", true, false),
            condition("4", "2026-07-27T10:00:00Z", false, false),
          ],
          created_at: "2026-07-27T10:00:00Z",
          lead: { cpf_cnpj: "123.456.789-09", email: "lead@test.invalid" },
          success: true,
          uuid: "sim_1",
        },
      }),
    );

    const result = await gateway(fetcher).getSimulation({
      credereStoreId: "store_123",
      token: tokenSet(),
      uuid: "sim_1",
    });

    expect(result.status).toBe("pending");
    expect(result.conditions.map((entry) => entry.status)).toEqual([
      "pending",
      "available",
      "rejected",
      "failed",
    ]);
    expect(JSON.stringify(result)).not.toContain("123.456.789-09");
  });

  it("preserves an explicit failed simulation even when a condition is still pending", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        data: {
          conditions: [condition("1", null, true, false)],
          reason: "Provider processing failed.",
          success: false,
          uuid: "sim_failed",
        },
      }),
    );

    const result = await gateway(fetcher).getSimulation({
      credereStoreId: "store_123",
      token: tokenSet(),
      uuid: "sim_failed",
    });

    expect(result).toMatchObject({
      reason: "Provider processing failed.",
      status: "failed",
      success: false,
    });
  });
});
