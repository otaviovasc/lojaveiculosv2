// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappScopedNav } from "./CrmWhatsappScopedNav";

describe("CrmWhatsappScopedNav", () => {
  afterEach(cleanup);

  it("moves through WhatsApp areas with tab keyboard navigation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CrmWhatsappScopedNav
        activeScope="conversations"
        connectionLabel="Conectado"
        connectionTone="online"
        onChange={onChange}
        tagCount={2}
        unreadCount={3}
      />,
    );

    const conversations = screen.getByRole("tab", { name: /Conversas 3/ });
    conversations.focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith("schedules");
    expect(screen.getByRole("tab", { name: "Agendar mensagem" })).toHaveFocus();
  });

  it("selects primary mobile destinations and exposes the remaining areas", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CrmWhatsappScopedNav
        activeScope="campaigns"
        connectionLabel="Conectado"
        connectionTone="online"
        onChange={onChange}
        tagCount={2}
        unreadCount={3}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Agendar mensagem" }));
    expect(onChange).toHaveBeenCalledWith("schedules");

    const more = screen.getByRole("button", { name: "Mais" });
    expect(more).toHaveAttribute("aria-current", "page");
    await user.click(more);

    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Campanhas" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menuitem", { name: "Campanhas" })).toBeNull();
    expect(more).toHaveAttribute("aria-expanded", "false");
  });
});
