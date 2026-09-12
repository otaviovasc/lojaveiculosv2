// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fallbackDashboardStats } from "../features/analytics/dashboardModel";
import { DashboardHomeKpis } from "./DashboardHomeKpis";

vi.mock("./DashboardHomeEntry", () => ({
  DashboardHomeEntry: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./ui/CountUp", () => ({
  AnimatedCounter: ({ value }: { value: string }) => value,
}));

describe("DashboardHomeKpis", () => {
  afterEach(cleanup);

  it("renders keyboard-accessible report actions when analytics is available", () => {
    const onNavigate = vi.fn();
    render(
      <DashboardHomeKpis
        canViewAnalytics
        onNavigate={onNavigate}
        stats={fallbackDashboardStats}
      />,
    );

    const faturamento = screen.getByRole("button", {
      name: /Faturamento: —.*Abrir relatórios/,
    });
    faturamento.focus();
    expect(faturamento).toHaveFocus();
    fireEvent.keyDown(faturamento, { key: "Enter" });
    fireEvent.click(faturamento);
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith("reports");
  });

  it("renders truthful static placeholders without a pointer action", () => {
    render(
      <DashboardHomeKpis
        canViewAnalytics={false}
        onNavigate={vi.fn()}
        stats={fallbackDashboardStats}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Faturamento")).toBeVisible();
  });
});
