// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FinanceCashFlowInsights } from "./FinanceCashFlowInsights";

describe("FinanceCashFlowInsights", () => {
  afterEach(() => cleanup());

  it("uses branded empty states for spending analysis and origins", () => {
    const { container } = render(
      <FinanceCashFlowInsights
        commissionRules={[]}
        entries={[]}
        recurringEntries={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Nenhum gasto encontrado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Nenhuma origem encontrada" }),
    ).toBeInTheDocument();
    const emptyStates = container.querySelectorAll(".feature-empty-state");
    expect(emptyStates).toHaveLength(2);
    emptyStates.forEach((emptyState) => {
      expect(emptyState).toHaveClass("h-full", "w-full");
    });
  });
});
