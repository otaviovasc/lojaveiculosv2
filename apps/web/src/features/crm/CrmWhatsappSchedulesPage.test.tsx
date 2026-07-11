// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappSchedulesPage } from "./CrmWhatsappSchedulesPage";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

describe("CrmWhatsappSchedulesPage", () => {
  afterEach(() => cleanup());

  it("lists store-wide schedules and applies status/session filters", async () => {
    const user = userEvent.setup();
    const callbacks = renderPage({ activeSession: null });

    expect(await screen.findByText("Ola futuro")).toBeInTheDocument();
    expect(callbacks.onList).toHaveBeenLastCalledWith({
      connectionId: "24000000-0000-4000-8000-000000000101",
      limit: 100,
    });

    await user.click(screen.getByRole("tab", { name: /Falhas/i }));
    expect(screen.getByText("Falha futura")).toBeInTheDocument();
    expect(screen.queryByText("Ola futuro")).not.toBeInTheDocument();

    await user.click(
      screen.getByLabelText("Filtrar agendamentos por conversa"),
    );
    await user.click(screen.getByRole("option", { name: /Bruno/ }));
    await waitFor(() =>
      expect(callbacks.onList).toHaveBeenLastCalledWith({
        connectionId: "24000000-0000-4000-8000-000000000101",
        limit: 100,
        sessionId: "34000000-0000-4000-8000-000000000001",
      }),
    );
  });

  it("prefills the active session for one-off schedule creation", async () => {
    const user = userEvent.setup();
    const activeSession = createSession({
      buyerName: "Ana",
      id: "34000000-0000-4000-8000-000000000001",
    });
    const callbacks = renderPage({ activeSession, sessions: [activeSession] });

    await screen.findByText("Ola futuro");
    await user.type(screen.getByLabelText("Quando enviar"), "2099-01-01T10:00");
    await user.type(screen.getByLabelText("Mensagem"), "Retorno combinado");
    await user.click(screen.getByRole("button", { name: "Agendar mensagem" }));

    expect(callbacks.onSchedule).toHaveBeenCalledWith({
      scheduledAt: "2099-01-01T13:00:00.000Z",
      sessionId: "34000000-0000-4000-8000-000000000001",
      text: "Retorno combinado",
    });
  });

  it("confirms pending cancellation and exposes process due action", async () => {
    const user = userEvent.setup();
    const callbacks = renderPage();

    await screen.findByText("Ola futuro");
    await user.click(screen.getByRole("button", { name: /Cancelar/ }));
    expect(callbacks.onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(callbacks.onCancel).toHaveBeenCalledWith("schedule_1");

    await user.click(
      screen.getByRole("button", { name: "Processar vencidas" }),
    );
    expect(callbacks.onProcessDue).toHaveBeenCalledTimes(1);
  });

  it("renders permission states without hiding store-wide context", async () => {
    renderPage({ canCreate: false, canRead: false });

    expect(
      screen.getByText("Sem permissao para criar agendamentos."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sem permissao para listar agendamentos."),
    ).toBeInTheDocument();
  });
});

function renderPage(
  overrides: Partial<Parameters<typeof CrmWhatsappSchedulesPage>[0]> = {},
) {
  const sessions = overrides.sessions ?? [createSession()];
  const callbacks = {
    onCancel: vi.fn(async () => true),
    onList: vi.fn(async () => [
      createScheduledMessage(),
      createScheduledMessage({
        errorMessage: "Provider timeout",
        id: "schedule_2",
        status: "failed",
        text: "Falha futura",
      }),
    ]),
    onProcessDue: vi.fn(async () => true),
    onSchedule: vi.fn(async () => true),
  };
  render(
    <CrmWhatsappSchedulesPage
      activeSession={sessions[0] ?? null}
      canCancel={true}
      canCreate={true}
      canProcess={true}
      canRead={true}
      connectionId="24000000-0000-4000-8000-000000000101"
      error={null}
      sessions={sessions}
      {...callbacks}
      {...overrides}
    />,
  );
  return callbacks;
}

function createSession(
  input: Partial<CrmWhatsappSession> = {},
): CrmWhatsappSession {
  return {
    buyerName: input.buyerName ?? "Bruno",
    buyerPhone: input.buyerPhone ?? "5511999990000",
    channel: "WHATSAPP",
    id: input.id ?? "34000000-0000-4000-8000-000000000001",
    leadId: input.leadId ?? "lead_1",
    status: "ACTIVE",
    uuid: String(input.id ?? "34000000-0000-4000-8000-000000000001"),
  };
}

function createScheduledMessage(
  input: Partial<CrmWhatsappScheduledMessage> = {},
): CrmWhatsappScheduledMessage {
  return {
    cancelledAt: null,
    connectionId: "24000000-0000-4000-8000-000000000101",
    createdAt: "2026-07-06T10:00:00.000Z",
    createdByUserId: "user_1",
    errorMessage: input.errorMessage ?? null,
    id: input.id ?? "schedule_1",
    metadata: {},
    phone: "5511999990000",
    scheduledAt: input.scheduledAt ?? "2026-07-07T10:00:00.000Z",
    sentAt: null,
    sentMessageId: null,
    sessionId: input.sessionId ?? "34000000-0000-4000-8000-000000000001",
    status: input.status ?? "pending",
    text: input.text ?? "Ola futuro",
    updatedAt: "2026-07-06T10:00:00.000Z",
  };
}
