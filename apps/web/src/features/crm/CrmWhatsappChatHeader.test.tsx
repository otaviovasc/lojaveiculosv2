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
});
