// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatHeader } from "./CrmConversationHeader";

describe("CrmConversationHeader", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("provides explicit mobile navigation back to the conversation list", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <ChatHeader
        assignableMembers={[]}
        canAssignSession={false}
        canCloseSession={false}
        canMarkRead={false}
        canScheduleMessages={false}
        canTagSessions={false}
        canToggleIntervention={false}
        onAddTag={vi.fn(async () => false)}
        onAssign={vi.fn()}
        onBack={onBack}
        onClose={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onOpenDetails={vi.fn()}
        onRemoveTag={vi.fn(async () => false)}
        onScheduleMessage={vi.fn()}
        onToggleIntervention={vi.fn()}
        cycle={{
          customerDisplayName: "Ana Premium",
          customerPhone: "5511999999999",
          channel: "whatsapp",
          id: "cycle-1",
          status: "ACTIVE",
        }}
      />,
    );

    expect(screen.getByText("Ana Premium")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Voltar para conversas" }),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("opens the header tag selector and assigns an available tag", async () => {
    const user = userEvent.setup();
    const onAddTag = vi.fn(async () => true);
    render(
      <ChatHeader
        assignableMembers={[]}
        availableTags={[
          {
            color: "var(--color-blue-start)",
            id: "tag-replied",
            name: "Respondeu",
          },
        ]}
        canAssignSession={false}
        canCloseSession={false}
        canMarkRead={false}
        canScheduleMessages={false}
        canTagSessions
        canToggleIntervention={false}
        onAddTag={onAddTag}
        onAssign={vi.fn()}
        onClose={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onOpenDetails={vi.fn()}
        onRemoveTag={vi.fn(async () => false)}
        onScheduleMessage={vi.fn()}
        onToggleIntervention={vi.fn()}
        cycle={{
          customerDisplayName: "Ana Premium",
          customerPhone: "5511999999999",
          channel: "whatsapp",
          id: "cycle-1",
          tags: [],
          status: "ACTIVE",
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Adicionar etiqueta" }),
    );
    expect(await screen.findByPlaceholderText("Buscar etiqueta")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Respondeu" }));

    expect(onAddTag).toHaveBeenCalledWith({
      color: "var(--color-blue-start)",
      name: "Respondeu",
    });
  });

  it("shows the current human attendance state in the chat header", () => {
    render(
      <ChatHeader
        assignableMembers={[]}
        canAssignSession={false}
        canCloseSession={false}
        canMarkRead={false}
        canScheduleMessages={false}
        canTagSessions={false}
        canToggleIntervention={false}
        onAddTag={vi.fn(async () => false)}
        onAssign={vi.fn()}
        onClose={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onOpenDetails={vi.fn()}
        onRemoveTag={vi.fn(async () => false)}
        onScheduleMessage={vi.fn()}
        onToggleIntervention={vi.fn()}
        cycle={{
          customerDisplayName: "Ana Premium",
          channel: "whatsapp",
          humanAttendanceState: "IN_HUMAN_SERVICE",
          id: "cycle-1",
          status: "HUMAN_TAKEOVER",
        }}
      />,
    );

    expect(screen.getByText("Em atendimento Humano")).toHaveClass(
      "crm-human-attendance-in-service",
    );
  });

  it("groups conversation, workflow, and attendance actions by purpose", () => {
    render(
      <ChatHeader
        assignableMembers={[]}
        canAssignSession
        canCloseSession
        canMarkRead
        canScheduleMessages
        canTagSessions
        canToggleIntervention
        currentUserId="user-1"
        onAddTag={vi.fn(async () => false)}
        onAssign={vi.fn()}
        onClose={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onOpenDetails={vi.fn()}
        onRemoveTag={vi.fn(async () => false)}
        onScheduleMessage={vi.fn()}
        onToggleIntervention={vi.fn()}
        cycle={{
          customerDisplayName: "Ana Premium",
          channel: "whatsapp",
          id: "cycle-1",
          leadId: "lead-1",
          status: "ACTIVE",
        }}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Ações da conversa" }),
    ).toContainElement(
      screen.getByRole("button", { name: "Marcar conversa como nao lida" }),
    );
    expect(
      screen.getByRole("group", { name: "Ferramentas do atendimento" }),
    ).toContainElement(
      screen.getByRole("link", { name: "Abrir lead vinculado" }),
    );
    expect(
      screen.getByRole("group", {
        name: "Responsabilidade pelo atendimento",
      }),
    ).toContainElement(screen.getByRole("button", { name: "Concluir" }));
  });

  it("keeps secondary actions available in an accessible more-actions menu", async () => {
    const user = userEvent.setup();
    const onMarkUnread = vi.fn();
    const onScheduleMessage = vi.fn();
    render(
      <ChatHeader
        assignableMembers={[]}
        canAssignSession={false}
        canCloseSession={false}
        canMarkRead
        canScheduleMessages
        canTagSessions
        canToggleIntervention={false}
        onAddTag={vi.fn(async () => false)}
        onAssign={vi.fn()}
        onClose={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={onMarkUnread}
        onOpenDetails={vi.fn()}
        onRemoveTag={vi.fn(async () => false)}
        onScheduleMessage={onScheduleMessage}
        onToggleIntervention={vi.fn()}
        cycle={{
          customerDisplayName: "Ana Premium",
          channel: "whatsapp",
          id: "cycle-1",
          leadId: "lead-1",
          status: "ACTIVE",
        }}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Mais ações" });
    await user.click(trigger);
    const menu = screen.getByRole("menu", {
      name: "Mais ações da conversa",
    });
    expect(menu).toContainElement(
      screen.getByRole("menuitem", { name: "Marcar como não lida" }),
    );
    expect(menu).toContainElement(
      screen.getByRole("menuitem", { name: "Abrir agendamentos" }),
    );
    expect(menu).toContainElement(
      screen.getByRole("menuitem", { name: "Abrir lead vinculado" }),
    );
    expect(menu).toContainElement(
      screen.getByRole("menuitem", { name: "Adicionar etiqueta" }),
    );

    await user.click(
      screen.getByRole("menuitem", { name: "Abrir agendamentos" }),
    );
    expect(onScheduleMessage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("dismisses more actions with Escape and returns focus to its trigger", async () => {
    const user = userEvent.setup();
    render(
      <ChatHeader
        assignableMembers={[]}
        canAssignSession={false}
        canCloseSession={false}
        canMarkRead
        canScheduleMessages={false}
        canTagSessions={false}
        canToggleIntervention={false}
        onAddTag={vi.fn(async () => false)}
        onAssign={vi.fn()}
        onClose={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onOpenDetails={vi.fn()}
        onRemoveTag={vi.fn(async () => false)}
        onScheduleMessage={vi.fn()}
        onToggleIntervention={vi.fn()}
        cycle={{
          customerDisplayName: "Ana Premium",
          channel: "whatsapp",
          id: "cycle-1",
          status: "ACTIVE",
        }}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Mais ações" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("closes a portalled mobile menu when its responsive anchor changes", async () => {
    const user = userEvent.setup();
    let breakpointListener: (() => void) | undefined;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: (_event: string, listener: () => void) => {
          breakpointListener = listener;
        },
        matches: true,
        media: "(max-width: 860px)",
        onchange: null,
        removeEventListener: vi.fn(),
      })),
    );
    render(
      <ChatHeader
        assignableMembers={[]}
        canAssignSession={false}
        canCloseSession={false}
        canMarkRead
        canScheduleMessages={false}
        canTagSessions={false}
        canToggleIntervention={false}
        onAddTag={vi.fn(async () => false)}
        onAssign={vi.fn()}
        onClose={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onOpenDetails={vi.fn()}
        onRemoveTag={vi.fn(async () => false)}
        onScheduleMessage={vi.fn()}
        onToggleIntervention={vi.fn()}
        cycle={{
          customerDisplayName: "Ana Premium",
          channel: "whatsapp",
          id: "cycle-1",
          status: "ACTIVE",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Mais ações" }));
    expect(screen.getByRole("menu")).toBeVisible();
    act(() => breakpointListener?.());

    expect(screen.queryByRole("menu")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Abrir detalhes da conversa" }),
    ).toHaveFocus();
  });
});
