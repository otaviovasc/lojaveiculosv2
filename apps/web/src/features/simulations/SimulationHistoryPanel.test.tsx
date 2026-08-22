// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulationHistoryPanel } from "./SimulationHistoryPanel";

describe("SimulationHistoryPanel", () => {
  afterEach(cleanup);

  it("shows a retry action when history loading fails", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <SimulationHistoryPanel
        error="Não foi possível carregar o histórico."
        history={null}
        onRetry={onRetry}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Histórico indisponível")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
