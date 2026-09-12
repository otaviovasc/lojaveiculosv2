// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AgencyStatsGrid } from "./AgencyDashboardControls";

describe("AgencyStatsGrid", () => {
  afterEach(cleanup);

  it("does not present zero KPIs while the agency overview is loading", () => {
    render(<AgencyStatsGrid loading stores={[]} />);

    expect(screen.getByLabelText("Total de lojas: carregando")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
