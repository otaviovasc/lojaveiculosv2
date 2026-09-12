// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessageActions } from "./CrmMessageActions";
import type { CrmMessage } from "./crmConversationTypes";

const message: CrmMessage = {
  content: "Olá",
  createdAt: "2026-08-23T12:00:00.000Z",
  direction: "INBOUND",
  id: "message-1",
  senderType: "CUSTOMER",
  status: "DELIVERED",
  type: "TEXT",
};

describe("CrmMessageActions", () => {
  afterEach(cleanup);

  it("exposes reactions as menu items and restores focus after Escape", async () => {
    const user = userEvent.setup();
    render(
      <MessageActions
        currentReaction="👍"
        message={message}
        onReact={vi.fn(async () => true)}
        onRemoveReaction={vi.fn(async () => true)}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Reagir a mensagem" });
    await user.click(trigger);

    const selected = screen.getByRole("menuitemradio", {
      name: "Reagir com 👍",
    });
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("menu", { name: "Reações da mensagem" }),
    ).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("menu", { name: "Reações da mensagem" }),
    ).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("dismisses the delete confirmation on outside click and returns focus", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <MessageActions message={message} onDelete={vi.fn(async () => true)} />
        <button type="button">Fora</button>
      </div>,
    );

    const trigger = screen.getByRole("button", { name: "Apagar mensagem" });
    await user.click(trigger);
    expect(
      screen.getByRole("dialog", {
        name: "Confirmar exclusão da mensagem",
      }),
    ).toBeVisible();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("closes the reaction palette after a reaction is removed", async () => {
    const user = userEvent.setup();
    const onRemoveReaction = vi.fn(async () => true);
    render(
      <MessageActions
        currentReaction="👍"
        message={message}
        onReact={vi.fn(async () => true)}
        onRemoveReaction={onRemoveReaction}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Reagir a mensagem" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Remover reacao" }));

    expect(onRemoveReaction).toHaveBeenCalledWith(message);
    expect(
      screen.queryByRole("menu", { name: "Reações da mensagem" }),
    ).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
