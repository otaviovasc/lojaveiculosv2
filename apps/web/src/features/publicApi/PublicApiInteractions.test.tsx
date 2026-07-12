// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicApi } from "./apiClient";
import { PublicApiModule } from "./PublicApiModule";
import type { CreatePublicApiClientInput, PublicApiClient } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PublicApiModule interactions", () => {
  it("distinguishes the first load from an empty client list", async () => {
    let finishList:
      ((value: { clients: PublicApiClient[] }) => void) | undefined;
    const listClients = vi.fn(
      () =>
        new Promise<{ clients: PublicApiClient[] }>((resolve) => {
          finishList = resolve;
        }),
    );
    const api = createApi({ listClients });

    render(<PublicApiModule api={api} />);

    expect(screen.getByText("Carregando clientes externos")).toBeVisible();
    expect(
      screen.queryByText("Nenhum cliente externo criado."),
    ).not.toBeInTheDocument();

    finishList?.({ clients: [] });

    expect(
      await screen.findByText("Nenhum cliente externo criado."),
    ).toBeVisible();
    expect(
      screen.queryByText("Carregando clientes externos"),
    ).not.toBeInTheDocument();
  });

  it("requires confirmation before revoking an external client", async () => {
    const user = userEvent.setup();
    const revokeClient = vi.fn(async () => ({
      ...clientFixture,
      status: "revoked" as const,
    }));
    const api = createApi({ revokeClient });

    render(<PublicApiModule api={api} />);
    await screen.findByText(clientFixture.name);

    await user.click(
      screen.getByRole("button", { name: `Revogar ${clientFixture.name}` }),
    );

    expect(revokeClient).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Revogar acesso externo" }),
    ).toBeVisible();
    expect(screen.getByText(/não pode ser desfeita/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Revogar cliente" }));

    await waitFor(() =>
      expect(revokeClient).toHaveBeenCalledWith(clientFixture.id),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Revogar acesso externo" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("only reports copied content after clipboard success", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<PublicApiModule api={createApi()} />);
    await screen.findByText(clientFixture.name);

    await user.click(
      screen.getByRole("button", { name: "Copiar rota do artefato Docs" }),
    );

    expect(writeText).toHaveBeenCalledWith("/api/v1/external-api/docs");
    expect(screen.getByText("Rota do artefato copiada.")).toBeVisible();

    writeText.mockRejectedValueOnce(new Error("permission denied"));
    await user.click(
      screen.getByRole("button", { name: "Copiar rota do artefato OpenAPI" }),
    );

    expect(
      screen.getByText(
        "Não foi possível copiar. Selecione o conteúdo manualmente.",
      ),
    ).toBeVisible();
  });
});

const clientFixture: PublicApiClient = {
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

function createApi(overrides: Partial<PublicApi> = {}): PublicApi {
  return {
    createClient: vi.fn(async (input: CreatePublicApiClientInput) => ({
      apiKey: "lv2_created_secret",
      client: { ...clientFixture, name: input.name, scopes: input.scopes },
    })),
    listClients: vi.fn(async () => ({ clients: [clientFixture] })),
    revokeClient: vi.fn(async () => ({
      ...clientFixture,
      status: "revoked" as const,
    })),
    ...overrides,
  };
}
