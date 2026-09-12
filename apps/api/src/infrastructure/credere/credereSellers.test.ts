import { describe, expect, it, vi } from "vitest";
import { createCredereHttpGateway } from "./credereHttpGateway.js";

describe("Credere seller discovery", () => {
  it("lists active sellers for the mapped provider store only", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          users: [
            seller("seller_1", "Ana Seller", "111.222.333-44", "active"),
            seller("seller_2", "Inactive", "555.666.777-88", "inactive"),
            seller("seller_3", "No CPF", null, "active"),
          ],
        }),
      ),
    );

    const sellers = await createCredereHttpGateway({
      auth: { clientId: "client_1", clientSecret: "secret_1" },
      fetch: fetcher,
    }).listSellers({
      credereStoreId: "credere_store_1",
      token: {
        accessToken: "access_1",
        expiresAt: null,
        providerAccountId: null,
        refreshToken: null,
        scope: "simulator proposals",
        tokenType: "bearer",
      },
    });

    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://app.meucredere.com.br/api/v1/users/proposals_filter_list?store_id=credere_store_1",
    );
    expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual({
      Authorization: "Bearer access_1",
      "Content-Type": "application/json",
    });
    expect(sellers).toEqual([
      {
        active: true,
        cpf: "11122233344",
        id: "seller_1",
        name: "Ana Seller",
      },
    ]);
  });
});

function seller(
  id: string,
  name: string,
  cpf: string | null,
  status: "active" | "inactive",
) {
  return { cpf, id, name, status };
}
