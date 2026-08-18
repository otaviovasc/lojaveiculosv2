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

  it("summarizes the effective route per channel in plain language", async () => {
    render(
      <CrmChannelRoutingPanel
        api={createApi(
          createPolicy([
            readyRoute(
              "whatsapp",
              "zapi-a",
              "Equipe vendas",
              "disabled",
              "zapi",
            ),
            blockedOlxRoute(),
          ]),
          vi.fn(),
        )}
        canManage
        connections={[
          legacyConnection(
            "zapi-a",
            "zapi",
            "Equipe vendas",
            "+55 11 99999-0000",
          ),
        ]}
      />,
    );

    expect(await screen.findByText("WhatsApp")).toBeVisible();
    expect(screen.getByText(/Z-API · Equipe vendas — pronta/)).toBeVisible();
    expect(screen.getByText("Rota ativa")).toBeVisible();
    expect(
      screen.getAllByText("Nenhuma conexão padrão definida."),
    ).toHaveLength(2);
    expect(
      screen.getAllByText("Bot externo desativado neste canal."),
    ).toHaveLength(3);
  });

  it("edits a channel route in a focused modal with only ready compatible connections", async () => {
    const user = userEvent.setup();
    const initial = createPolicy([
      readyRoute("instagram", "instagram-a", "Loja Centro", "disabled"),
    ]);
    const updateRoutingPolicy = vi.fn(async () =>
      createPolicy([
        readyRoute(
          "instagram",
          "instagram-b",
          "Loja Norte",
          "inherit_store_default",
          "composio_instagram",
        ),
      ]),
    );
    const onPolicyChange = vi.fn(async () => undefined);

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
        onPolicyChange={onPolicyChange}
      />,
    );

    const instagramRow = (await screen.findByText("Instagram")).closest(
      "article",
    ) as HTMLElement;
    await user.click(
      within(instagramRow).getByRole("button", { name: "Editar rota" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeVisible();
    await user.click(
      within(dialog).getByLabelText("Conexão padrão de Instagram"),
    );
    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent ?? "");
    expect(options.some((label) => label.includes("Loja Norte"))).toBe(true);
    expect(options.some((label) => label.includes("Loja Centro"))).toBe(true);
    expect(options.some((label) => label.includes("Equipe vendas"))).toBe(
      false,
    );
    expect(options.some((label) => label.includes("OLX principal"))).toBe(
      false,
    );

    await user.click(screen.getByRole("option", { name: /Loja Norte/ }));
    await user.click(
      within(dialog).getByRole("button", { name: "Salvar rota" }),
    );

    await waitFor(() =>
      expect(updateRoutingPolicy).toHaveBeenCalledWith({
        bot: { mode: "disabled" },
        channel: "instagram",
        defaultConnectionId: "instagram-b",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Rota salva com sucesso.")).toBeVisible();
    expect(onPolicyChange).toHaveBeenCalledOnce();
  });

  it("shows a stale route as blocked reason and remediation, with no hidden value", async () => {
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

    expect(await screen.findByText(/connection_not_found/)).toBeVisible();
    expect(screen.getByText(/Escolha outra conexão./)).toBeVisible();
    expect(
      screen.queryByText("Conexão configurada não existe mais"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Definir rota" })[0]!,
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/Nenhuma conexão pronta para este canal/),
    ).toBeVisible();
  });

  it("keeps save errors inside the dialog", async () => {
    const user = userEvent.setup();
    const updateRoutingPolicy = vi.fn(async () => {
      throw new Error("save failed");
    });
    render(
      <CrmChannelRoutingPanel
        api={createApi(
          createPolicy([
            readyRoute(
              "whatsapp",
              "zapi-a",
              "Equipe vendas",
              "disabled",
              "zapi",
            ),
          ]),
          updateRoutingPolicy,
        )}
        canManage
        connections={[legacyConnection("zapi-a", "zapi", "Equipe vendas")]}
      />,
    );

    await user.click(
      (await screen.findAllByRole("button", { name: "Editar rota" }))[0]!,
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Salvar rota" }),
    );

    expect(await within(dialog).findByText("save failed")).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("blocks manage actions without permission", async () => {
    render(
      <CrmChannelRoutingPanel
        api={createApi(createPolicy([blockedOlxRoute()]), vi.fn())}
        canManage={false}
        connections={[]}
      />,
    );

    expect(
      await screen.findAllByText(
        "Somente administradores podem alterar rotas.",
      ),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByRole("button", { name: "Definir rota" })[0],
    ).toBeDisabled();
  });

  it("uses a friendly label instead of exposing an unnamed connection id", async () => {
    const user = userEvent.setup();
    render(
      <CrmChannelRoutingPanel
        api={createApi(createPolicy([]), vi.fn())}
        canManage
        connections={[legacyConnection("internal-id-42", "zapi", "")]}
      />,
    );

    await user.click(
      (await screen.findAllByRole("button", { name: "Definir rota" }))[0]!,
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByLabelText("Conexão padrão de WhatsApp"),
    );

    expect(
      screen.getByRole("option", { name: /Z-API · Conexão sem nome/ }),
    ).toBeVisible();
    expect(screen.queryByText(/internal-id-42/)).not.toBeInTheDocument();
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
): CrmChannelRouting {
  const selected = connection(id, provider, displayName, true);
  return {
    bot:
      mode === "disabled"
        ? disabledBot()
        : {
            blocked: null,
            connection: selected,
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
    state: ready
      ? "active"
      : provider === "olx_chat"
        ? "paused"
        : "disconnected",
    status: ready
      ? "active"
      : provider === "olx_chat"
        ? "paused"
        : "disconnected",
    webhookUrl: null,
  };
}
