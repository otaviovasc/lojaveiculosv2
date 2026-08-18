// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappScopedNav } from "./CrmWhatsappScopedNav";
import { readSynchronizedChannelStatus } from "./CrmWhatsappInbox";

describe("CrmWhatsappScopedNav", () => {
  afterEach(cleanup);

  it("maps channel synchronization to the compact indicator", () => {
    const provider = { label: "Conectado", tone: "online" as const };
    expect(readSynchronizedChannelStatus(provider, "connected")).toEqual({
      label: "Sincronizado",
      tone: "online",
    });
    expect(readSynchronizedChannelStatus(provider, "connecting")).toEqual({
      label: "Reconciliando",
      tone: "loading",
    });
    expect(readSynchronizedChannelStatus(provider, "degraded")).toEqual({
      label: "Sincronização indisponível",
      tone: "error",
    });
  });

  it("announces reconciliation and synchronization in one polite live region", () => {
    const props = {
      activeScope: "conversations" as const,
      onChange: vi.fn(),
      tagCount: 0,
      unreadCount: 0,
    };
    const rendered = render(
      <CrmWhatsappScopedNav
        {...props}
        connectionLabel="Reconciliando"
        connectionTone="loading"
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent("Reconciliando");

    rendered.rerender(
      <CrmWhatsappScopedNav
        {...props}
        connectionLabel="Sincronizado"
        connectionTone="online"
      />,
    );

    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Sincronizado");
  });

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
    const otherAreas = screen.getByRole("group", {
      name: "Outras áreas do CRM",
    });
    expect(
      within(otherAreas).getByRole("button", { name: "Campanhas" }),
    ).toHaveAttribute("aria-current", "page");

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("group", { name: "Outras áreas do CRM" }),
    ).toBeNull();
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(more).toHaveFocus();
  });
});
