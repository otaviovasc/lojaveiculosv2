// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmChannelRoutingPanel } from "./CrmChannelRoutingPanel";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";
import type { CrmChannelRouting, CrmRoutingPolicy } from "./crmRoutingTypes";

describe("CrmChannelRoutingPanel", () => {
  afterEach(cleanup);

  it("selects explicit Instagram accounts and keeps pending OLX unavailable", async () => {
    const user = userEvent.setup();
    const initial = createPolicy([
      readyRoute("instagram", "instagram-a", "Loja Centro", "disabled"),
      readyRoute(
        "whatsapp",
        "zapi-a",
        "Equipe vendas",
        "inherit_store_default",
        "zapi",
      ),
      blockedOlxRoute(),
    ]);
    const updateRoutingPolicy = vi.fn(async () =>
      createPolicy([
        readyRoute(
          "instagram",
          "instagram-b",
          "Loja Norte",
          "explicit_connection",
          "composio_instagram",
          "instagram-a",
        ),
        readyRoute(
          "whatsapp",
          "zapi-a",
          "Equipe vendas",
          "inherit_store_default",
          "zapi",
        ),
        blockedOlxRoute(),
      ]),
    );

    render(
      <CrmChannelRoutingPanel
        api={createApi(initial, updateRoutingPolicy)}
        canManage
        connections={[
          legacyConnection("instagram-a", "composio_instagram", "Loja Centro"),
          legacyConnection("instagram-b", "composio_instagram", "Loja Norte"),
          legacyConnection(
            "zapi-a",
            "zapi",
            "Equipe vendas",
            "+55 11 99999-0000",
          ),
          legacyConnection(
            "olx-pending",
            "olx_chat",
            "OLX principal",
            null,
            false,
          ),
        ]}
      />,
    );

    const instagram = (await screen.findByText("Instagram")).closest("article");
    expect(instagram).not.toBeNull();
    const row = within(instagram as HTMLElement);

    await user.click(row.getByLabelText("Conexão padrão de Instagram"));
    await user.click(screen.getByRole("option", { name: /Loja Norte/ }));
    await user.click(row.getByLabelText("Modo do bot em Instagram"));
    await user.click(screen.getByRole("option", { name: "Escolher conexão" }));
    await user.click(
      row.getByLabelText("Conexão explícita do bot em Instagram"),
    );
    await user.click(screen.getByRole("option", { name: /Loja Centro/ }));
    await user.click(row.getByRole("button", { name: "Salvar rota" }));

    await waitFor(() =>
      expect(updateRoutingPolicy).toHaveBeenCalledWith({
        bot: { connectionId: "instagram-a", mode: "explicit_connection" },
        channel: "instagram",
        defaultConnectionId: "instagram-b",
      }),
    );
    expect(screen.getByText("Rota salva com sucesso.")).toBeVisible();
    expect(screen.getByText(/OLX Chat ainda está pendente/)).toBeVisible();

    const olx = screen.getByText("OLX Chat").closest("article");
    await user.click(
      within(olx as HTMLElement).getByLabelText("Conexão padrão de OLX Chat"),
    );
    expect(
      screen.queryByRole("option", { name: /OLX principal/ }),
    ).not.toBeInTheDocument();
  });

  it("preserves a stale route until the user explicitly replaces it", async () => {
    const user = userEvent.setup();
    const updateRoutingPolicy = vi.fn();
    render(
      <CrmChannelRoutingPanel
        api={createApi(
          createPolicy([staleWhatsappRoute()]),
          updateRoutingPolicy,
        )}
        canManage
        connections={[]}
      />,
    );

    expect(
      await screen.findByText("Conexão configurada não existe mais"),
    ).toBeVisible();
    expect(screen.getByText(/conexão salva não existe mais/)).toBeVisible();

    const whatsapp = screen.getByText("WhatsApp").closest("article");
    await user.click(
      within(whatsapp as HTMLElement).getByRole("button", {
        name: "Salvar rota",
      }),
    );

    expect(updateRoutingPolicy).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Escolha uma conexão pronta antes de substituir/),
    ).toBeVisible();
  });

  it("shows a disconnected selected route without silently changing it", async () => {
    const disconnected = connection("zapi-old", "zapi", "Número antigo", false);
    render(
      <CrmChannelRoutingPanel
        api={createApi(
          createPolicy([
            {
              bot: disabledBot(),
              channel: "whatsapp",
              storeDefault: {
                blocked: blocked("connection_not_connected"),
                connection: disconnected,
                ready: false,
                requiredCapabilities: ["text"],
              },
            },
          ]),
          vi.fn(),
        )}
        canManage
        connections={[]}
      />,
    );

    expect(
      await screen.findByText(/Z-API · Número antigo \(desconectada\)/i),
    ).toBeVisible();
    expect(
      screen.getByText(/está desconectada e foi preservada/),
    ).toBeVisible();
  });

  it("renders load errors and offers a retry", async () => {
    const getRoutingPolicy = vi
      .fn<() => Promise<CrmRoutingPolicy>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(createPolicy([]));
    render(
      <CrmChannelRoutingPanel
        api={{ getRoutingPolicy, updateRoutingPolicy: vi.fn() }}
        canManage
        connections={[]}
      />,
    );

    expect(await screen.findByText("offline")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar novamente" }),
    );
    expect(await screen.findByText("WhatsApp")).toBeVisible();
    expect(getRoutingPolicy).toHaveBeenCalledTimes(2);
  });
});

function createApi(
  policy: CrmRoutingPolicy,
  updateRoutingPolicy: ReturnType<typeof vi.fn>,
) {
  return {
    getRoutingPolicy: vi.fn(async () => policy),
    updateRoutingPolicy,
  } as Pick<CrmWhatsappApi, "getRoutingPolicy" | "updateRoutingPolicy">;
}

function createPolicy(channels: CrmChannelRouting[]): CrmRoutingPolicy {
  return { channels, storeId: "store-1", tenantId: "tenant-1" };
}

function readyRoute(
  channel: CrmChannelRouting["channel"],
  id: string,
  displayName: string,
  mode: CrmChannelRouting["bot"]["mode"],
  provider: "composio_instagram" | "zapi" = "composio_instagram",
  botConnectionId = id,
): CrmChannelRouting {
  const selected = connection(id, provider, displayName, true);
  const botConnection = connection(
    botConnectionId,
    provider,
    botConnectionId === id ? displayName : "Loja Centro",
    true,
  );
  return {
    bot:
      mode === "disabled"
        ? disabledBot()
        : {
            blocked: null,
            connection:
              mode === "explicit_connection" ? botConnection : selected,
            mode,
            ready: true,
            requiredCapabilities: ["text"],
          },
    channel,
    storeDefault: {
      blocked: null,
      connection: selected,
      ready: true,
      requiredCapabilities: ["text"],
    },
  };
}

function blockedOlxRoute(): CrmChannelRouting {
  return {
    bot: disabledBot(),
    channel: "olx_chat",
    storeDefault: {
      blocked: blocked("policy_not_configured"),
      connection: null,
      ready: false,
      requiredCapabilities: ["text"],
    },
  };
}

function staleWhatsappRoute(): CrmChannelRouting {
  return {
    bot: disabledBot(),
    channel: "whatsapp",
    storeDefault: {
      blocked: blocked("connection_not_found"),
      connection: null,
      ready: false,
      requiredCapabilities: ["text"],
    },
  };
}

function disabledBot(): CrmChannelRouting["bot"] {
  return {
    blocked: blocked("route_disabled"),
    connection: null,
    mode: "disabled",
    ready: false,
    requiredCapabilities: ["text"],
  };
}

function blocked(
  code: NonNullable<CrmChannelRouting["storeDefault"]["blocked"]>["code"],
) {
  return { code, message: code, remediation: "Escolha outra conexão." };
}

function connection(
  id: string,
  provider: "composio_instagram" | "composio_whatsapp" | "zapi",
  displayName: string,
  ready: boolean,
) {
  return {
    active: ready,
    capabilities: ["text"],
    connected: ready,
    displayName,
    id,
    provider,
  };
}

function legacyConnection(
  id: string,
  provider: CrmWhatsappProviderConnection["provider"],
  displayName: string,
  phone: string | null = null,
  ready = true,
): CrmWhatsappProviderConnection {
  return {
    channel:
      provider === "composio_instagram"
        ? "instagram"
        : provider === "olx_chat"
          ? "olx_chat"
          : "whatsapp",
    displayName,
    externalConnectionId: ready ? `external-${id}` : null,
    externalInstanceId: null,
    id,
    live: {
      checkedAt: "2026-08-17T12:00:00.000Z",
      connected: ready,
      connectedPhone: phone,
      providerStatus: ready ? "connected" : "disconnected",
      smartphoneConnected: null,
    },
    phone,
    provider,
    readiness: {
      ready,
      reason: ready ? null : "A conexão ainda não está pronta.",
      reasonCode: ready ? "ready" : "pending_webhook",
    },
    ready,
    status: ready ? "active" : "disconnected",
    webhookUrl: null,
  };
}
