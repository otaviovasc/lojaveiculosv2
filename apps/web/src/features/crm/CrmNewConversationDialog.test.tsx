// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmNewConversationDialog } from "./CrmNewConversationDialog";
import type { CrmProviderConnection } from "./crmConversationTypes";

function createStartConnection(
  overrides: Partial<CrmProviderConnection> & { id: string },
): CrmProviderConnection {
  return {
    capabilities: ["conversation_start", "media", "outbound", "text"],
    channel: "whatsapp",
    displayName: overrides.id,
    provider: "zapi",
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    state: "active",
    ...overrides,
  };
}

const officialConnection = createStartConnection({
  capabilities: [
    "conversation_start",
    "media",
    "outbound",
    "templates",
    "text",
  ],
  displayName: "WhatsApp oficial",
  id: "24000000-0000-4000-8000-000000000202",
  provider: "meta_cloud",
});
const zapiConnection = createStartConnection({
  displayName: "ZAPI loja",
  id: "24000000-0000-4000-8000-000000000101",
  isDefault: true,
});

describe("CrmNewConversationDialog", () => {
  afterEach(cleanup);

  it("collects a phone, name, and first message before starting", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onStart = vi.fn(async () => true);
    render(<CrmNewConversationDialog onClose={onClose} onStart={onStart} />);

    await user.type(screen.getByLabelText("Nome"), "Ana");
    const phone = screen.getByLabelText("WhatsApp");
    await user.type(phone, "11999999999");
    expect(phone).toHaveValue("(11) 99999-9999");
    await user.type(screen.getByLabelText("Mensagem"), "Ola, tudo bem?");
    await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));

    expect(onStart).toHaveBeenCalledWith({
      buyerName: "Ana",
      phone: "(11) 99999-9999",
      text: "Ola, tudo bem?",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("starts an official WhatsApp conversation with an approved template", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onStart = vi.fn(async () => true);
    render(
      <CrmNewConversationDialog
        onClose={onClose}
        onStart={onStart}
        provider="meta_cloud"
      />,
    );

    expect(
      screen.getByText(/exige um template previamente aprovado/i),
    ).toBeVisible();
    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("WhatsApp"), "11999999999");
    await user.type(
      screen.getByLabelText("Template aprovado"),
      "primeiro_contato",
    );
    await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));

    expect(onStart).toHaveBeenCalledWith({
      buyerName: "Ana",
      phone: "(11) 99999-9999",
      template: {
        languageCode: "pt_BR",
        name: "primeiro_contato",
      },
    });
    expect(screen.queryByLabelText("Mensagem")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sends ordered body parameters for a parameterized template", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn(async () => true);
    render(
      <CrmNewConversationDialog
        onClose={vi.fn()}
        onStart={onStart}
        provider="meta_cloud"
      />,
    );

    await user.type(screen.getByLabelText("WhatsApp"), "11999999999");
    await user.type(
      screen.getByLabelText("Template aprovado"),
      "primeiro_contato",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Adicionar parâmetro do template",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Adicionar parâmetro do template",
      }),
    );
    await user.type(screen.getByLabelText("Parâmetro 1"), "Ana");
    await user.type(screen.getByLabelText("Parâmetro 2"), "SUV");
    await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));

    expect(onStart).toHaveBeenCalledWith({
      phone: "(11) 99999-9999",
      template: {
        components: [
          {
            parameters: [
              { text: "Ana", type: "text" },
              { text: "SUV", type: "text" },
            ],
            type: "body",
          },
        ],
        languageCode: "pt_BR",
        name: "primeiro_contato",
      },
    });
  });

  it("shows localized field validation after invalid fields are visited", async () => {
    const user = userEvent.setup();
    render(
      <CrmNewConversationDialog
        onClose={vi.fn()}
        onStart={vi.fn(async () => true)}
      />,
    );

    await user.click(screen.getByLabelText("WhatsApp"));
    await user.tab();
    await user.click(screen.getByLabelText("Mensagem"));
    await user.tab();

    expect(
      screen.getByText("Informe um WhatsApp válido com DDD."),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByText("Digite a primeira mensagem.")).toHaveAttribute(
      "role",
      "alert",
    );
  });

  it("keeps the dialog open and explains a rejected conversation", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CrmNewConversationDialog
        onClose={onClose}
        onStart={vi.fn(async () => false)}
      />,
    );

    await user.type(screen.getByLabelText("WhatsApp"), "(11) 99999-9999");
    await user.type(screen.getByLabelText("Mensagem"), "Olá, tudo bem?");
    await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));

    const submitError = await screen.findByText(
      "Não foi possível iniciar a conversa. Tente novamente.",
    );
    expect(submitError.closest('[role="alert"]')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("hides the picker and auto-uses a single eligible connection", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn(async () => true);
    render(
      <CrmNewConversationDialog
        connections={[
          zapiConnection,
          { ...officialConnection, state: "paused" },
        ]}
        onClose={vi.fn()}
        onStart={onStart}
      />,
    );

    expect(screen.queryByLabelText("Conexão de envio")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("WhatsApp"), "11999999999");
    await user.type(screen.getByLabelText("Mensagem"), "Ola");
    await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));

    expect(onStart).toHaveBeenCalledWith({
      connectionId: zapiConnection.id,
      phone: "(11) 99999-9999",
      text: "Ola",
    });
  });

  it("lets the user pick the sending connection when several are eligible", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn(async () => true);
    render(
      <CrmNewConversationDialog
        connections={[zapiConnection, officialConnection]}
        defaultConnectionId={officialConnection.id}
        onClose={vi.fn()}
        onStart={onStart}
      />,
    );

    // Pre-selects the current view connection, which drives template mode.
    expect(screen.getByLabelText("Template aprovado")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Conexão de envio"));
    await user.click(await screen.findByRole("option", { name: /ZAPI loja/ }));
    expect(screen.getByLabelText("Mensagem")).toBeInTheDocument();

    await user.type(screen.getByLabelText("WhatsApp"), "11999999999");
    await user.type(screen.getByLabelText("Mensagem"), "Ola");
    await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));

    expect(onStart).toHaveBeenCalledWith({
      connectionId: zapiConnection.id,
      phone: "(11) 99999-9999",
      text: "Ola",
    });
  });
});
