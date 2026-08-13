// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toast } from "./Toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Toast", () => {
  it("announces non-blocking feedback politely and atomically", () => {
    render(<Toast title="Conectando">Aguarde a confirmação.</Toast>);

    const toast = screen.getByRole("status");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(toast).toHaveAttribute("aria-atomic", "true");
    expect(toast).toHaveTextContent("Conectando");
    expect(toast).toHaveTextContent("Aguarde a confirmação.");
  });

  it("supports assertive errors and an accessible dismiss action", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <Toast
        onDismiss={onDismiss}
        priority="assertive"
        title="Falha"
        tone="danger"
      >
        Tente novamente.
      </Toast>,
    );

    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    await user.click(
      screen.getByRole("button", { name: "Fechar notificação" }),
    );
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("dismisses itself after the default three-second duration", async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast onDismiss={onDismiss} title="Salvo" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(2_999));
    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(1));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("supports persistent notices when duration is disabled", async () => {
    vi.useFakeTimers();
    render(<Toast durationMs={null} title="Conectando" />);

    await act(async () => vi.advanceTimersByTime(30_000));

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
