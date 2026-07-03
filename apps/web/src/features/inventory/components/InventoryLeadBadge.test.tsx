// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InventoryLeadBadge } from "./InventoryLeadBadge";

afterEach(cleanup);

describe("InventoryLeadBadge", () => {
  it("maps lead heat thresholds to token color classes", () => {
    const { rerender } = render(<InventoryLeadBadge leads={1} />);
    expect(screen.getByText("1 lead").parentElement).toHaveClass(
      "bg-success/10",
      "text-success",
      "border-success/20",
    );

    rerender(<InventoryLeadBadge leads={3} />);
    expect(screen.getByText("3 leads").parentElement).toHaveClass(
      "bg-warning/10",
      "text-warning",
      "border-warning/20",
    );

    rerender(<InventoryLeadBadge leads={6} />);
    expect(screen.getByText("6 leads").parentElement).toHaveClass(
      "bg-danger/10",
      "text-danger",
      "border-danger/20",
    );
  });

  it("does not render for listings without leads", () => {
    const { container } = render(<InventoryLeadBadge leads={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
