// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, type MockedFunction } from "vitest";
import type { PublicApi } from "./apiClient";
import { PublicApiModule } from "./PublicApiModule";
import type { PublicApiClient } from "./types";

describe("PublicApiModule", () => {
  it("renders the developer portal and creates keys from presets", async () => {
    const api = createApiStub();
    const user = userEvent.setup();

    render(<PublicApiModule api={api} />);

    await waitFor(() => expect(api.listClients).toHaveBeenCalledOnce());
    expect(screen.getByText("/api/v1/external-api/docs")).toBeVisible();
    expect(screen.getByText("/api/v1/external-api/llms.txt")).toBeVisible();
    expect(screen.getByText("/api/v1/external-api/manifest")).toBeVisible();
    expect(screen.getByText("/api/v1/external-api/ai-tools")).toBeVisible();
    expect(screen.getByText("Integra Zapier")).toBeVisible();
    expect(screen.queryByText("api_client_1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /DMS de estoque/ }));
    await user.click(screen.getByRole("button", { name: "Criar chave" }));

    const createInput = api.createClient.mock.calls.at(0)?.[0];
    expect(createInput?.name).toBe("DMS de estoque");
    expect(createInput?.scopes).toEqual(
      expect.arrayContaining([
        "inventory.create",
        "inventory.media_update",
        "inventory.read",
        "inventory.update_price",
        "inventory.update_status",
      ]),
    );
    expect(await screen.findByText("lv2_created_secret")).toBeVisible();
  });
});

function createApiStub(): PublicApiStub {
  const client: PublicApiClient = {
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "api_client_1",
    keyPrefixes: ["lv2_abcd1234"],
    name: "Integra Zapier",
    scopes: ["inventory.read", "lead.create"],
    status: "active",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const createClient: MockedFunction<PublicApi["createClient"]> = vi.fn(
    async (input) => ({
      apiKey: "lv2_created_secret",
      client: { ...client, name: input.name, scopes: input.scopes },
    }),
  );
  const listClients: MockedFunction<PublicApi["listClients"]> = vi.fn(
    async () => ({ clients: [client] }),
  );
  const revokeClient: MockedFunction<PublicApi["revokeClient"]> = vi.fn(
    async () => ({
      ...client,
      status: "revoked" as const,
    }),
  );
  return { createClient, listClients, revokeClient };
}

type PublicApiStub = {
  createClient: MockedFunction<PublicApi["createClient"]>;
  listClients: MockedFunction<PublicApi["listClients"]>;
  revokeClient: MockedFunction<PublicApi["revokeClient"]>;
};
