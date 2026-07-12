// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ClerkAuthProvider } from "../features/account/ClerkAuthProvider";
import { App } from "./App";

vi.mock("./AdminApp", () => ({
  AdminApp: () => <div data-testid="admin-app" />,
}));

describe("App routes", () => {
  it("serves the root path as a public landing page", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ClerkAuthProvider>
          <App />
        </ClerkAuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Loja Veículos" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("landing-hero-shader")).toHaveAttribute(
      "data-shader-state",
      "fallback",
    );
    expect(
      screen.queryByText("Configuração de autenticação ausente"),
    ).not.toBeInTheDocument();
  });
});
