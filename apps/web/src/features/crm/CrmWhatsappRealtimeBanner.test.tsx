// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappRealtimeBanner } from "./CrmWhatsappRealtimeBanner";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CrmWhatsappRealtimeBanner", () => {
  it("shows a connecting notice as a fixed toast outside the page layout", () => {
    render(
      <CrmWhatsappRealtimeBanner hasCachedInbox={false} status="connecting" />,
    );

    const notice = screen.getByRole("status");
    expect(notice).toHaveAttribute("data-ui", "toast");
    expect(notice).toHaveClass("crm-whatsapp-realtime-toast", "fixed");
    expect(notice).not.toHaveClass("crm-whatsapp-realtime-banner");
    expect(
      screen.queryByRole("button", { name: "Fechar notificação" }),
    ).not.toBeInTheDocument();
  });

  it("stays hidden while the realtime channel is connected", () => {
    render(
      <CrmWhatsappRealtimeBanner hasCachedInbox={true} status="connected" />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("lets the user dismiss a persistent failure without showing it again", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CrmWhatsappRealtimeBanner hasCachedInbox={true} status="offline" />,
    );

    expect(screen.getByText("Sem conexão em tempo real.")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Fechar notificação" }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    rerender(
      <CrmWhatsappRealtimeBanner hasCachedInbox={true} status="offline" />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a new toast when the realtime status changes after dismissal", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CrmWhatsappRealtimeBanner hasCachedInbox={false} status="degraded" />,
    );

    await user.click(
      screen.getByRole("button", { name: "Fechar notificação" }),
    );
    rerender(
      <CrmWhatsappRealtimeBanner hasCachedInbox={false} status="offline" />,
    );

    expect(screen.getByText("Sem conexão em tempo real.")).toBeVisible();
  });

  it("keeps connection state visible beyond transient toast duration", async () => {
    vi.useFakeTimers();
    render(
      <CrmWhatsappRealtimeBanner hasCachedInbox={false} status="connecting" />,
    );

    await act(async () => vi.advanceTimersByTime(30_000));

    expect(screen.getByRole("status")).toBeVisible();
  });
});
