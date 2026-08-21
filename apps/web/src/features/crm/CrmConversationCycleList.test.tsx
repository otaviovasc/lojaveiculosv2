// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionList } from "./CrmConversationCycleList";
import type { CrmConversationCycle } from "./crmConversationTypes";

describe("SessionList", () => {
  afterEach(() => {
    cleanup();
  });

  it("selects the active conversation in normal mode and hides checkboxes", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onToggleSelected = vi.fn();

    render(
      <SessionList
        activeCycleId={null}
        onSelect={onSelect}
        onToggleSelected={onToggleSelected}
        selectedCycleIds={[]}
        selectionMode={false}
        conversationCycles={[createSession()]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Selecionar conversa" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/5511999999999/)).toBeInTheDocument();
    expect(screen.getByText("Civic Touring")).toBeInTheDocument();
    expect(screen.getByText(/Anúncio|Anuncio/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Ana Premium/ }));
    expect(onSelect).toHaveBeenCalledWith("session_1");
    expect(onToggleSelected).not.toHaveBeenCalled();
  });

  it("exposes the active conversation to assistive technology", () => {
    render(
      <SessionList
        activeCycleId="session_1"
        onSelect={vi.fn()}
        onToggleSelected={vi.fn()}
        selectedCycleIds={[]}
        selectionMode={false}
        conversationCycles={[createSession()]}
      />,
    );

    expect(screen.getByRole("button", { name: /Ana Premium/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("toggles rows instead of opening them in selection mode", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onToggleSelected = vi.fn();

    render(
      <SessionList
        activeCycleId={null}
        onSelect={onSelect}
        onToggleSelected={onToggleSelected}
        selectedCycleIds={["session_1"]}
        selectionMode
        conversationCycles={[createSession()]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remover conversa da seleção" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Ana Premium/ }));
    expect(onToggleSelected).toHaveBeenCalledWith("session_1");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("replaces the generic intervention label with the precise attendance badge", () => {
    render(
      <SessionList
        activeCycleId={null}
        onSelect={vi.fn()}
        onToggleSelected={vi.fn()}
        selectedCycleIds={[]}
        selectionMode={false}
        conversationCycles={[
          {
            ...createSession(),
            humanAttendanceState: "WAITING_HUMAN",
            status: "HUMAN_TAKEOVER",
          },
        ]}
      />,
    );

    expect(screen.getByText("Aguardando Humano")).toHaveClass(
      "crm-human-attendance-waiting",
    );
    expect(screen.queryByText("Intervenção humana")).not.toBeInTheDocument();
  });
});

function createSession(): CrmConversationCycle {
  return {
    assignedMember: {
      email: "ana@example.com",
      id: 10,
      name: "Carla",
      role: "OWNER",
    },
    customerDisplayName: "Ana Premium",
    customerPhone: "5511999999999",
    channel: "whatsapp",
    connection: {
      id: "connection_1",
      displayName: "ZAPI Matriz",
      phone: "5511888887777",
      provider: "zapi",
      status: "active",
    },
    id: "session_1",
    lastMessageAt: "2026-07-07T12:00:00.000Z",
    lastMessageContent: "Tenho interesse no Civic.",
    metadata: { adTitle: "Civic em destaque", isAdInitiated: true },
    tags: [{ color: "var(--color-accent)", id: "tag_1", name: "Lead" }],
    status: "ACTIVE",
    unreadCount: 2,
    vehicle: { id: 12, title: "Civic Touring" },
  };
}
