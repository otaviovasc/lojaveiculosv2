// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
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
        isPeriodDirty={false}
        isRefreshing={false}
        onApplyPeriod={vi.fn()}
        onCopyLink={vi.fn()}
        onEndDateChange={vi.fn()}
        onStartDateChange={vi.fn()}
        startDate={new Date(2026, 7, 1)}
      />,
    );

    expect(screen.getByRole("button", { name: "De:—" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Até:—" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
  });

  it("renders the public URL as a native accessible link", () => {
    renderToolbar({ publicSlug: "via-motors" });

    const publicLink = screen.getByRole("link", {
      name: "via-motors.lojaveiculos.com.br",
    });
    expect(publicLink).toHaveAttribute(
      "href",
      "https://via-motors.lojaveiculos.com.br",
    );
    expect(publicLink).toHaveAttribute("target", "_blank");
    expect(publicLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("link", { name: "Visitar loja pública em nova aba" }),
    ).toHaveAttribute("href", "https://via-motors.lojaveiculos.com.br");
  });

  it("applies the selected period explicitly and removes synthetic status", () => {
    const onApplyPeriod = vi.fn();
    renderToolbar({ isPeriodDirty: true, onApplyPeriod });

    fireEvent.click(screen.getByRole("button", { name: "Aplicar período" }));
    expect(onApplyPeriod).toHaveBeenCalledOnce();
    expect(screen.queryByText("Loja Ativa")).not.toBeInTheDocument();
  });
});

function renderToolbar(
  overrides: Partial<ComponentProps<typeof DashboardHomeToolbar>> = {},
) {
  const props: ComponentProps<typeof DashboardHomeToolbar> = {
    canViewAnalytics: true,
    copyState: "idle",
    endDate: new Date(2026, 7, 31),
    isPeriodDirty: false,
    isRefreshing: false,
    onApplyPeriod: vi.fn(),
    onCopyLink: vi.fn(),
    onEndDateChange: vi.fn(),
    onStartDateChange: vi.fn(),
    startDate: new Date(2026, 7, 1),
    ...overrides,
  };
  return render(<DashboardHomeToolbar {...props} />);
}
