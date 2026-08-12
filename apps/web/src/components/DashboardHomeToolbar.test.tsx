// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardHomeToolbar } from "./DashboardHomeToolbar";

vi.mock("./DashboardHomeEntry", () => ({
  DashboardHomeEntry: ({ children }: { children: ReactNode }) => children,
}));

describe("DashboardHomeToolbar", () => {
  afterEach(cleanup);

  it("keeps the period controls with placeholder values when analytics is unavailable", () => {
    render(
      <DashboardHomeToolbar
        canViewAnalytics={false}
        copyState="idle"
        endDate={new Date(2026, 7, 31)}
        onCopyLink={vi.fn()}
        onEndDateChange={vi.fn()}
        onStartDateChange={vi.fn()}
        onVisitStore={vi.fn()}
        startDate={new Date(2026, 7, 1)}
      />,
    );

    expect(screen.getByRole("button", { name: "De:—" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Até:—" })).toBeDisabled();
  });
});
