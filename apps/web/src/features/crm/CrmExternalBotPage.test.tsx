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
import type { CrmExternalBotConfiguration } from "@lojaveiculosv2/shared";
import { CrmExternalBotPage } from "./CrmExternalBotPage";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmProviderConnection } from "./crmConversationTypes";
import type { CrmSpecialDateApi } from "./crmSpecialDateApi";
import { CRM_SPECIAL_DATE_TYPES } from "./crmSpecialDateTypes";

describe("CrmExternalBotPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("saves the external bot URL, write-only secret and API token", async () => {
    const updateBotIntegration = vi.fn(async () => ({
      configuration: createIntegration({
        apiTokenConfigured: true,
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
    fireEvent.change(screen.getByLabelText(/Novo token da API de acoes/i), {
      target: { value: "novo-token-de-integracao-com-32-chars" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /bot habilitado/i }));
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(updateBotIntegration).toHaveBeenCalledWith({
        apiToken: "novo-token-de-integracao-com-32-chars",
        enabled: true,
        webhookSecret: "novo-segredo",
        webhookUrl: "https://bot.example.test/webhook",
      }),
    );
    expect(screen.queryByDisplayValue("old-secret")).not.toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("novo-token-de-integracao-com-32-chars"),
    ).not.toBeInTheDocument();
  });

  it("separates reference content and keeps documentation closed", async () => {
    const user = userEvent.setup();
    renderPage(createApi());

    expect(await screen.findByText("Bot externo")).toBeVisible();
    expect(
      screen.queryByLabelText("Documentacao operacional do bot"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Referencia" }));
    expect(
      screen.getByLabelText("Documentacao operacional do bot"),
    ).toBeVisible();

    await user.click(screen.getByText("Bot Action API"));
    expect(screen.getAllByText(/CRM_BOT_POLICY_DENIED/)[0]).toBeVisible();

    await user.click(screen.getByText("Estados de atendimento humano"));
    expect(screen.getByText("payload.humanAttendanceState")).toBeVisible();
    expect(screen.getByText("payload.humanAttendanceActive")).toBeVisible();
    expect(
      screen.getByText("payload.humanAttendanceStateVersion"),
    ).toBeVisible();
    expect(screen.getByText("expectedAttendanceRevision")).toBeVisible();
    expect(screen.getByText("Atendimento concluido no CRM")).toBeVisible();
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
      <CrmExternalBotPage
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

  it("loads special dates for the selected connection", async () => {
    const user = userEvent.setup();
    const specialDateApi: CrmSpecialDateApi = {
      getConfigs: vi.fn(async (connectionId: string) => ({
        configs: CRM_SPECIAL_DATE_TYPES.map((dateType) => ({
          connectionId,
          dateType,
          enabled: false,
          leadDays: 0,
          messageTemplate: "Mensagem para {nome}.",
          sendTime: "09:00",
        })),
      })),
      updateConfig: vi.fn(),
    };
    const api = createApi();
    const connection: CrmProviderConnection = {
      capabilities: ["outbound", "scheduling", "text"],
      channel: "whatsapp",
      displayName: "WhatsApp principal",
      id: "connection_1",
      provider: "zapi",
      status: "active",
    };

    render(
      <CrmExternalBotPage
        api={api}
        canManage
        canManageSpecialDates
        canRead
        canRetry
        connections={[connection]}
        specialDateApi={specialDateApi}
      />,
    );

    await user.click(
      await screen.findByRole("tab", { name: "Datas especiais" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Datas especiais" }),
    ).toBeVisible();
    const getConfigs = vi.mocked(specialDateApi.getConfigs);
    const firstCall = getConfigs.mock.calls.at(0);
    expect(firstCall?.[0]).toBe("connection_1");
    expect(firstCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps special dates unavailable until scheduling capability is confirmed", async () => {
    const user = userEvent.setup();
    const specialDateApi: CrmSpecialDateApi = {
      getConfigs: vi.fn(),
      updateConfig: vi.fn(),
    };
    const connection: CrmProviderConnection = {
      channel: "whatsapp",
      displayName: "WhatsApp sem capacidades",
      id: "connection_without_capability",
      provider: "zapi",
      status: "active",
    };

    render(
      <CrmExternalBotPage
        api={createApi()}
        canManage
        canManageSpecialDates
        canRead
        canRetry
        connections={[connection]}
        specialDateApi={specialDateApi}
      />,
    );

    await user.click(
      await screen.findByRole("tab", { name: "Datas especiais" }),
    );
    expect(
      await screen.findByText(/ainda não informa a capacidade de agendamento/i),
    ).toBeVisible();
    expect(specialDateApi.getConfigs).not.toHaveBeenCalled();
  });
});

function renderPage(api: CrmConversationApi) {
  return render(<CrmExternalBotPage api={api} canManage canRead canRetry />);
}

function createApi(
  overrides: Partial<CrmConversationApi> = {},
): CrmConversationApi {
  return {
    getBotIntegration: vi.fn(async () => ({
      configuration: createIntegration({
        enabled: false,
        secretConfigured: true,
        webhookUrl: "https://bot.old.test/webhook",
      }),
    })),
    listProviderEventIssues: vi.fn(async () => ({ events: [] })),
    updateBotIntegration: vi.fn(async () => ({
      configuration: createIntegration(),
    })),
    ...overrides,
  } as CrmConversationApi;
}

function createIntegration(
  overrides: Partial<CrmExternalBotConfiguration> = {},
): CrmExternalBotConfiguration {
  return {
    apiTokenConfigured: false,
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
