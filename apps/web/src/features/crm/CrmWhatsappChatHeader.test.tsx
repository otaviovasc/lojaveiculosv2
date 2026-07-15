// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatHeader } from "./CrmWhatsappChatHeader";

describe("CrmWhatsappChatHeader", () => {
  afterEach(cleanup);

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
        session={{
          buyerName: "Ana Premium",
          buyerPhone: "5511999999999",
          channel: "WHATSAPP",
          id: "session-1",
          status: "ACTIVE",
          uuid: "session-1",
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
        session={{
          buyerName: "Ana Premium",
          buyerPhone: "5511999999999",
          channel: "WHATSAPP",
          id: "session-1",
          sessionTags: [],
          status: "ACTIVE",
          uuid: "session-1",
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
      id: "tag-replied",
      name: "Respondeu",
    });
  });
});
