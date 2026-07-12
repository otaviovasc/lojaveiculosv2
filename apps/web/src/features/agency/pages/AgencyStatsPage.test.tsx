// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AgencyStatsPage } from "./AgencyStatsPage";

afterEach(cleanup);

describe("AgencyStatsPage", () => {
  it("shows an honest unavailable state without invented metrics", () => {
    render(<AgencyStatsPage />);

    expect(
      screen.getByRole("heading", { name: "Painel avançado em preparação" }),
    ).toBeVisible();
    expect(screen.getByText("Sem dados estimados")).toBeVisible();
    expect(screen.getByText("Qualidade dos dados")).toBeVisible();
    expect(screen.queryByText("124.502")).not.toBeInTheDocument();
    expect(screen.queryByText("3.840")).not.toBeInTheDocument();
    expect(screen.queryByText("3.1%")).not.toBeInTheDocument();
    expect(screen.queryByText(/este mês/i)).not.toBeInTheDocument();
  });
});
