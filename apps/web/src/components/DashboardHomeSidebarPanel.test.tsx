// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardHomeSidebarPanel } from "./DashboardHomeSidebarPanel";

vi.mock("motion/react", () => ({
  motion: { div: ({ children }: { children: ReactNode }) => children },
}));

vi.mock("./DashboardHomeEntry", () => ({
  DashboardHomeEntry: ({ children }: { children: ReactNode }) => children,
}));

describe("DashboardHomeSidebarPanel", () => {
  afterEach(cleanup);

  it("keeps the reports shortcut and performance layout without analytics access", () => {
    const onNavigate = vi.fn();
    renderSidebar(false, onNavigate);

    expect(screen.getByRole("button", { name: "Relatórios" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ver Estoque" })).toBeVisible();
    expect(screen.getByText("Performance do Mês")).toBeVisible();
    expect(screen.getAllByText("—")).not.toHaveLength(0);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("shows the reports shortcut with analytics access", () => {
    renderSidebar(true);

    expect(screen.getByRole("button", { name: "Relatórios" })).toBeVisible();
  });
});

function renderSidebar(canViewAnalytics: boolean, onNavigate = vi.fn()) {
  render(
    <DashboardHomeSidebarPanel
      canViewAnalytics={canViewAnalytics}
      dashboard={null}
      onNavigate={onNavigate}
      pushEnabled
      setPushEnabled={vi.fn()}
    />,
  );
}
