// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutoEntriesLoadingSkeleton } from "./AutoEntriesLoadingSkeleton";

afterEach(cleanup);

describe("AutoEntriesLoadingSkeleton", () => {
  it("keeps the workspace shape while rules are loading", () => {
    render(<AutoEntriesLoadingSkeleton />);

    const loadingState = screen.getByRole("status", {
      name: "Carregando lançamentos automáticos",
    });

    expect(loadingState).toHaveAttribute("aria-busy", "true");
    expect(
      loadingState.querySelectorAll(".ae-loading-skeleton__tab"),
    ).toHaveLength(6);
    expect(
      loadingState.querySelectorAll(".ae-loading-skeleton__panel"),
    ).toHaveLength(3);
    expect(
      loadingState.querySelector(".ae-loading-skeleton__panel--wide"),
    ).toBeInTheDocument();
  });
});
