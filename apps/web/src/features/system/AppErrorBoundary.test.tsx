// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

afterEach(cleanup);

describe("AppErrorBoundary", () => {
  it("renders children while the tree is healthy", () => {
    render(
      <AppErrorBoundary>
        <p>módulo saudável</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText("módulo saudável")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("catches render crashes and recovers when retry resets the boundary", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    let shouldThrow = true;

    function MaybeBomb() {
      if (shouldThrow) throw new Error("boom");
      return <p>recuperado</p>;
    }

    const user = userEvent.setup();
    render(
      <AppErrorBoundary>
        <MaybeBomb />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Algo deu errado" }),
    ).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /Tentar novamente/ }));

    expect(screen.getByText("recuperado")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});
