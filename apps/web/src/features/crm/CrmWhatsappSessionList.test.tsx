// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionList } from "./CrmWhatsappSessionList";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

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
        activeSessionId={null}
        onSelect={onSelect}
        onToggleSelected={onToggleSelected}
        selectedSessionIds={[]}
        selectionMode={false}
        sessions={[createSession()]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Selecionar conversa" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("5511999999999")).toBeInTheDocument();
    expect(screen.getByText("Civic Touring")).toBeInTheDocument();
    expect(screen.getByText("Anuncio")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Ana Premium/ }));
    expect(onSelect).toHaveBeenCalledWith("session_1");
    expect(onToggleSelected).not.toHaveBeenCalled();
  });

  it("toggles rows instead of opening them in selection mode", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onToggleSelected = vi.fn();

    render(
      <SessionList
        activeSessionId={null}
        onSelect={onSelect}
        onToggleSelected={onToggleSelected}
        selectedSessionIds={["session_1"]}
        selectionMode
        sessions={[createSession()]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remover conversa da selecao" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Ana Premium/ }));
    expect(onToggleSelected).toHaveBeenCalledWith("session_1");
    expect(onSelect).not.toHaveBeenCalled();
  });
});

function createSession(): CrmWhatsappSession {
  return {
    assignedMember: {
      email: "ana@example.com",
      id: 10,
      name: "Carla",
      role: "OWNER",
    },
    buyerName: "Ana Premium",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    connection: {
      id: "connection_1",
      name: "ZAPI Matriz",
      phone: "5511888887777",
      provider: "zapi",
      status: "active",
    },
    id: "session_1",
    lastMessageAt: "2026-07-07T12:00:00.000Z",
    lastMessageContent: "Tenho interesse no Civic.",
    metadata: { adTitle: "Civic em destaque", isAdInitiated: true },
    sessionTags: [{ color: "var(--color-accent)", id: "tag_1", name: "Lead" }],
    status: "ACTIVE",
    unreadCount: 2,
    uuid: "session_1",
    vehicle: { id: 12, title: "Civic Touring" },
  };
}
