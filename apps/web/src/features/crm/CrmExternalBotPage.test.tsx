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
import { CrmExternalBotPage } from "./CrmExternalBotPage";
import type { CrmConversationApi } from "./crmConversationApi";

describe("CrmExternalBotPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates a bot profile with URL, action token and HMAC secret", async () => {
    const createBotProfile = vi.fn(async () => createProfile());
    const api = createApi({ createBotProfile });

    renderPage(api);
    fireEvent.change(await screen.findByLabelText("Nome"), {
      target: { value: "Bot WhatsApp" },
    });
    fireEvent.change(screen.getByLabelText(/Webhook URL/i), {
      target: { value: "https://bot.example.test/webhook" },
    });
    fireEvent.change(screen.getByLabelText(/Novo token de ações/i), {
      target: { value: "novo-token-de-acoes-com-32-caracteres" },
    });
    fireEvent.change(screen.getByLabelText(/Novo segredo HMAC/i), {
      target: { value: "novo-segredo-hmac-com-32-caracteres" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));

    await waitFor(() =>
      expect(createBotProfile).toHaveBeenCalledWith({
        apiToken: "novo-token-de-acoes-com-32-caracteres",
        enabled: true,
        name: "Bot WhatsApp",
        webhookSecret: "novo-segredo-hmac-com-32-caracteres",
        webhookUrl: "https://bot.example.test/webhook",
      }),
    );
  });

  it("keeps profile secrets write-only after saving", async () => {
    const createBotProfile = vi.fn(async () => createProfile());
    renderPage(createApi({ createBotProfile }));
    fireEvent.change(await screen.findByLabelText("Nome"), {
      target: { value: "Bot HMAC" },
    });
    fireEvent.change(await screen.findByLabelText(/Novo segredo HMAC/i), {
      target: { value: "novo-segredo-hmac-com-32-caracteres" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
    await waitFor(() => expect(createBotProfile).toHaveBeenCalled());
    expect(
      screen.queryByDisplayValue("novo-segredo-hmac-com-32-caracteres"),
    ).not.toBeInTheDocument();
  });

  it("creates a disabled profile without enabling provider delivery", async () => {
    const createBotProfile = vi.fn(async () => createProfile());
    renderPage(createApi({ createBotProfile }));
    fireEvent.change(await screen.findByLabelText("Nome"), {
      target: { value: "Bot rascunho" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
    await waitFor(() =>
      expect(createBotProfile).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false, name: "Bot rascunho" }),
      ),
    );
  });

  it("separates reference content and keeps documentation closed", async () => {
    const user = userEvent.setup();
    renderPage(createApi());

    expect(
      await screen.findByRole("heading", {
        name: "Conexões de bots externos",
      }),
    ).toBeVisible();
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
    expect(api.listBotProfiles).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: "Eventos" }));
    expect(
      screen.getByText(/não tem permissão para visualizar eventos/i),
    ).toBeVisible();
  });
});

function renderPage(api: CrmConversationApi) {
  return render(<CrmExternalBotPage api={api} canManage canRead canRetry />);
}

function createApi(
  overrides: Partial<CrmConversationApi> = {},
): CrmConversationApi {
  return {
    listBotProfiles: vi.fn(async () => ({ profiles: [] })),
    createBotProfile: vi.fn(async () => createProfile()),
    listProviderEventIssues: vi.fn(async () => ({ events: [] })),
    ...overrides,
  } as CrmConversationApi;
}

function createProfile() {
  return {
    apiTokenConfigured: true,
    createdAt: "2026-09-12T12:00:00.000Z",
    enabled: false,
    id: "profile_1",
    isDefault: false,
    name: "Bot WhatsApp",
    secretConfigured: false,
    secretUpdatedAt: null,
    updatedAt: "2026-09-12T12:00:00.000Z",
    webhookUrl: "https://bot.example.test/webhook",
  };
}
