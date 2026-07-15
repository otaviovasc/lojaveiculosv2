// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Circle } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardSidebar } from "./dashboard-sidebar";

describe("DashboardSidebar theme", () => {
  afterEach(cleanup);

  it.each([
    ["light", "/icons/lv-logo-black-red.svg"],
    ["dark", "/icons/lv-logo-white-red.svg"],
  ] as const)("uses the matching %s logo treatment", (theme, expectedLogo) => {
    render(
      <DashboardSidebar
        activeId="dashboard"
        items={[{ icon: Circle, id: "dashboard", title: "Início" }]}
        onSelect={vi.fn()}
        onThemeToggle={vi.fn()}
        theme={theme}
        workspaceName="Loja Teste"
      />,
    );

    expect(
      screen.getAllByRole("img", { name: "Loja Teste" })[0],
    ).toHaveAttribute("src", expectedLogo);
    expect(
      document.querySelector(".workspace-sidebar__texture"),
    ).toBeInTheDocument();
  });
});
