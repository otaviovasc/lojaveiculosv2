// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    fireEvent.change(urlInput, {
      target: { value: "https://bot.example.test/webhook" },
    });
    fireEvent.change(screen.getByPlaceholderText("Segredo configurado"), {
      target: { value: "novo-segredo" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /bot habilitado/i }));
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(updateBotIntegration).toHaveBeenCalledWith({
        enabled: true,
        webhookSecret: "novo-segredo",
        webhookUrl: "https://bot.example.test/webhook",
      }),
    );
    expect(screen.queryByDisplayValue("old-secret")).not.toBeInTheDocument();
  });

  it("separates reference content and keeps documentation closed", async () => {
    const user = userEvent.setup();
    const { container } = renderPage(createApi());

    expect(await screen.findByText("Bot externo")).toBeVisible();
    expect(
      screen.queryByLabelText("Documentacao operacional do bot"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Referencia" }));
    expect(
      screen.getByLabelText("Documentacao operacional do bot"),
    ).toBeVisible();
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);

    await user.click(screen.getByText("Bot Action API"));
    expect(container.querySelectorAll("details[open]")).toHaveLength(1);
    expect(
      screen.getAllByText(/CRM_WHATSAPP_BOT_ACTION_BLOCKED/)[0],
    ).toBeVisible();
  });

  it("shows a healthy provider state in the events view", async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderPage(api);

    await user.click(screen.getByRole("tab", { name: "Eventos" }));
    expect(
      await screen.findByText("Nenhum evento exige atenção"),
    ).toBeVisible();
    expect(api.listProviderEventIssues).toHaveBeenCalledTimes(1);
  });

  it("shows permission states without loading bot config", async () => {
    const user = userEvent.setup();
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
        "Seu usuário não tem permissão para gerenciar integrações.",
      ),
    ).toBeVisible();
    expect(api.getBotIntegration).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: "Eventos" }));
    expect(
      screen.getByText(/não tem permissão para visualizar eventos/i),
    ).toBeVisible();
  });
});

function renderPage(api: CrmWhatsappApi) {
  return render(
    <CrmWhatsappIntegrationsPage api={api} canManage canRead canRetry />,
  );
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
