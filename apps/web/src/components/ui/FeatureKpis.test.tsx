// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { HTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureKpiCard, FeatureKpiStrip } from "./FeatureKpis";

vi.mock("./AnimatedContent", () => ({
  default: ({
    children,
    ...props
  }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) => (
    <div {...props}>{children}</div>
  ),
}));

afterEach(cleanup);

describe("FeatureKpiStrip", () => {
  it("keeps four animated KPIs in a compact two-column mobile grid", () => {
    render(
      <FeatureKpiStrip ariaLabel="Indicadores">
        {(["blue", "green", "pink", "violet"] as const).map((tone, index) => (
          <FeatureKpiCard
            animationIndex={index}
            icon={KpiIcon}
            key={tone}
            label={`Indicador ${index + 1}`}
            tone={tone}
            value={`${index + 1}`}
          />
        ))}
      </FeatureKpiStrip>,
    );

    const strip = screen.getByRole("group", { name: "Indicadores" });
    expect(strip).toHaveClass("grid", "grid-cols-2", "sm:flex");

    for (const card of screen.getAllByRole("article")) {
      expect(card).toHaveClass("min-w-0", "sm:min-w-[12rem]");
      expect(card).not.toHaveClass("min-w-[min(100%,12rem)]");
      expect(card.parentElement).toHaveClass("min-w-0", "sm:min-w-[12rem]");
    }
  });
});

function KpiIcon() {
  return <svg aria-hidden="true" />;
}
