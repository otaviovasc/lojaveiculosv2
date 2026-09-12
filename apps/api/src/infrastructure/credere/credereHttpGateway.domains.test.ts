import { describe, expect, it, vi } from "vitest";
import {
  bank,
  gateway,
  jsonResponse,
  tokenSet,
} from "./credereHttpGateway.testSupport.js";

describe("Credere bank and domain discovery", () => {
  it("preserves unique integrated bank health for readiness classification", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        banks: [
          bank("655", true, "okay"),
          bank("655", true, "okay"),
          bank("623", false, "okay"),
          bank("394", true, "error"),
          bank("237", true, "okay"),
        ],
      }),
    );

    await expect(
      gateway(fetcher).listIntegratedBanks({
        credereStoreId: "store_123",
        token: tokenSet(),
      }),
    ).resolves.toEqual([
      bankResult("655", true, "okay"),
      bankResult("623", false, "okay"),
      bankResult("394", true, "error"),
      bankResult("237", true, "okay"),
    ]);
  });

  it("loads coded provider domains with the mapped Store-Id", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        data: {
          occupation: [
            { credere_identifier: "43", id: 4411, label: "Servidor público" },
          ],
        },
      }),
    );

    await expect(
      gateway(fetcher).listDomainOptions({
        credereStoreId: "store_123",
        token: tokenSet(),
        types: ["occupation"],
      }),
    ).resolves.toEqual({
      occupation: [{ label: "Servidor público", value: "43" }],
    });
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      "Store-Id": "store_123",
    });
  });
});

function bankResult(code: string, active: boolean, status: string) {
  return {
    active,
    code,
    name: `Bank ${code}`,
    status,
    tradename: `B${code}`,
  };
}
