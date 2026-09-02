// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWorkspaceOverlays } from "./CrmConversationWorkspaceParts";
import type { useCrmInbox } from "./useCrmInbox";

describe("CrmWorkspaceOverlays delete confirmation", () => {
  afterEach(() => {
    cleanup();
  });

  it("states the honest delete behavior and confirms through the callback", async () => {
    const user = userEvent.setup();
    const onConfirmDelete = vi.fn();
    render(
      <CrmWorkspaceOverlays
        activeSession={null}
        conclusionOpen={false}
        deleteCycleId="cycle-1"
        inbox={createInbox()}
        newConversationDraft={null}
        newConversationOpen={false}
        onCloseConclusion={vi.fn()}
        onCloseDelete={vi.fn()}
        onCloseNewConversation={vi.fn()}
        onCloseScheduleMessage={vi.fn()}
        onCloseScheduleVisit={vi.fn()}
        onConfirmDelete={onConfirmDelete}
        onStartedConversation={vi.fn()}
        scheduleMessageOpen={false}
        scheduleVisitOpen={false}
      />,
    );

    expect(
      screen.getByText(
        /só voltará a aparecer se o contato enviar uma nova mensagem/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/preservado no servidor/),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Excluir conversa" }));
    expect(onConfirmDelete).toHaveBeenCalledTimes(1);
  });
});

function createInbox() {
  return {
    actions: {
      concludeCycle: vi.fn(async () => true),
    },
    assignableMembers: [],
    canStartConversation: false,
    isConcludingSession: false,
    isMutatingSession: false,
    isStartingConversation: false,
    permissions: { canClose: true },
    startConversationProvider: "zapi",
  } as unknown as ReturnType<typeof useCrmInbox>;
}
