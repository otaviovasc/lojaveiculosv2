// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmScopedNav } from "./CrmScopedNav";

describe("CrmScopedNav", () => {
  afterEach(cleanup);

  it("announces provider and realtime states separately in one polite live region", () => {
    const props = {
      activeScope: "conversations" as const,
      onChange: vi.fn(),
      providerStatus: { label: "Z-API: online", tone: "online" as const },
      tagCount: 0,
      unreadCount: 0,
    };
    const rendered = render(
      <CrmScopedNav
        {...props}
        realtimeStatus={{
          label: "Tempo real: reconectando",
          tone: "loading",
        }}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveAccessibleName(
      "Z-API: online. Tempo real: reconectando",
    );
    expect(status).toHaveTextContent("Z-API: online");
    expect(status).toHaveTextContent("Tempo real: reconectando");
    expect(status.querySelectorAll(":scope > span")).toHaveLength(2);
    expect(screen.getByText("CRM")).toBeVisible();

    rendered.rerender(
      <CrmScopedNav
        {...props}
        realtimeStatus={{
          label: "Tempo real: sincronizado",
          tone: "online",
        }}
      />,
    );

    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveAccessibleName(
      "Z-API: online. Tempo real: sincronizado",
    );
  });

  it("does not hide a disconnected provider behind healthy realtime", () => {
    render(
      <CrmScopedNav
        activeScope="conversations"
        onChange={vi.fn()}
        providerStatus={{
          label: "Z-API: desconectado",
          tone: "offline",
        }}
        realtimeStatus={{
          label: "Tempo real: sincronizado",
          tone: "online",
        }}
        tagCount={0}
        unreadCount={0}
      />,
    );

    expect(screen.getByRole("status")).toHaveAccessibleName(
      "Z-API: desconectado. Tempo real: sincronizado",
    );
  });

  it("moves through WhatsApp areas with tab keyboard navigation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CrmScopedNav
        activeScope="conversations"
        onChange={onChange}
        providerStatus={{ label: "Z-API: online", tone: "online" }}
        realtimeStatus={{
          label: "Tempo real: sincronizado",
          tone: "online",
        }}
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
      <CrmScopedNav
        activeScope="campaigns"
        onChange={onChange}
        providerStatus={{ label: "Z-API: online", tone: "online" }}
        realtimeStatus={{
          label: "Tempo real: sincronizado",
          tone: "online",
        }}
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
