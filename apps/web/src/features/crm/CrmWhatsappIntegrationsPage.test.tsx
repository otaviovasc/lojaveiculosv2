// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappIntegrationsPage } from "./CrmWhatsappIntegrationsPage";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { CrmWhatsappBotIntegration } from "./crmWhatsappIntegrationTypes";

describe("CrmWhatsappIntegrationsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("saves the external bot URL and write-only secret", async () => {
    const user = userEvent.setup();
    const updateBotIntegration = vi.fn(async () => ({
      integration: createIntegration({
        enabled: true,
        secretConfigured: true,
        webhookUrl: "https://bot.example.test/webhook",
      }),
    }));
    const api = createApi({ updateBotIntegration });

    renderPage(api);

    const urlInput = await screen.findByDisplayValue(
      "https://bot.old.test/webhook",
    );
    await user.clear(urlInput);
    await user.type(urlInput, "https://bot.example.test/webhook");
    await user.type(
      screen.getByPlaceholderText("Segredo configurado"),
      "novo-segredo",
    );
    await user.click(screen.getByRole("checkbox", { name: /bot habilitado/i }));
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(updateBotIntegration).toHaveBeenCalledWith({
        enabled: true,
        webhookSecret: "novo-segredo",
        webhookUrl: "https://bot.example.test/webhook",
      }),
    );
    expect(screen.queryByDisplayValue("old-secret")).not.toBeInTheDocument();
    expect(screen.getAllByText("POST")[0]).toBeVisible();
    expect(
      screen.getAllByText("/api/v1/crm/whatsapp/integrations/bot/actions")[0],
    ).toBeVisible();
    expect(
      screen.getAllByText(/CRM_WHATSAPP_BOT_ACTION_BLOCKED/)[0],
    ).toBeVisible();
    expect(screen.getAllByText("connection_status_changed")[0]).toBeVisible();
    expect(screen.getAllByText(/imageUrl/)[0]).toBeVisible();
    expect(screen.getAllByText(/audioUrl/)[0]).toBeVisible();
    expect(screen.getAllByText(/documentUrl/)[0]).toBeVisible();
    expect(screen.getByText("message.senderOrigin")).toBeVisible();
    expect(screen.getByText(/Base64 nao e aceito aqui/)).toBeVisible();
  });

  it("shows a permission state without loading bot config", async () => {
    const api = createApi();
    render(
      <CrmWhatsappIntegrationsPage
        api={api}
        canManage={false}
        canRead={false}
        canRetry={false}
      />,
    );

    expect(
      screen.getByText(
        "Seu usuario nao tem permissao para gerenciar integracoes.",
      ),
    ).toBeVisible();
    expect(api.getBotIntegration).not.toHaveBeenCalled();
  });
});

function renderPage(api: CrmWhatsappApi) {
  render(<CrmWhatsappIntegrationsPage api={api} canManage canRead canRetry />);
}

function createApi(overrides: Partial<CrmWhatsappApi> = {}): CrmWhatsappApi {
  return {
    getBotIntegration: vi.fn(async () => ({
      integration: createIntegration({
        enabled: false,
        secretConfigured: true,
        webhookUrl: "https://bot.old.test/webhook",
      }),
    })),
    listProviderEventIssues: vi.fn(async () => ({ events: [] })),
    updateBotIntegration: vi.fn(async () => ({
      integration: createIntegration(),
    })),
    ...overrides,
  } as CrmWhatsappApi;
}

function createIntegration(
  overrides: Partial<CrmWhatsappBotIntegration> = {},
): CrmWhatsappBotIntegration {
  return {
    createdAt: "2026-07-06T12:00:00.000Z",
    enabled: false,
    id: "integration_1",
    secretConfigured: false,
    secretUpdatedAt: null,
    updatedAt: "2026-07-06T12:00:00.000Z",
    webhookUrl: null,
    ...overrides,
  };
}
