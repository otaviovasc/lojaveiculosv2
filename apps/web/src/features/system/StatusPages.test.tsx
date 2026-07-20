// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorPage } from "./ErrorPage";
import { NotFoundPage } from "./NotFoundPage";

afterEach(cleanup);

describe("NotFoundPage", () => {
  it("shows the 404 code, friendly copy, and navigation actions", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "accent");
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Página não encontrada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Voltar para o início/ }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: /Ir para o painel/ }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("keeps the page fully visible when reduced motion is requested", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      matches: true,
      media: query,
      removeEventListener: vi.fn(),
    }));

    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("404")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Página não encontrada" }),
    ).toBeVisible();
  });
});

describe("ErrorPage", () => {
  it("announces crashes with assertive alert semantics and a reference code", () => {
    render(<ErrorPage onRetry={() => {}} />);

    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Algo deu errado" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Código de referência:/)).toBeInTheDocument();
  });

  it("fires the retry action from the primary button", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorPage onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /Tentar novamente/ }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
