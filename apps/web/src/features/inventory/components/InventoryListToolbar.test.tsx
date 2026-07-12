// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InventoryListToolbar } from "./InventoryListToolbar";

afterEach(cleanup);

describe("InventoryListToolbar", () => {
  it("exposes loading and blocks duplicate search refreshes", () => {
    const onRefresh = vi.fn();
    render(
      <InventoryListToolbar
        loading
        onColumnToggle={vi.fn()}
        onCreate={vi.fn()}
        onRefresh={onRefresh}
        onSearchChange={vi.fn()}
        onSortChange={vi.fn()}
        onStatusChange={vi.fn()}
        onViewModeChange={vi.fn()}
        search=""
        sortBy="newest"
        status=""
        viewMode="list"
        visibleColumns={{}}
      />,
    );

    const search = screen.getByRole("textbox", { name: "Buscar veículos" });
    const form = search.closest("form");
    expect(form).toHaveAttribute("aria-busy", "true");
    expect(search).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Filtrar por status" }),
    ).toBeDisabled();

    fireEvent.submit(form as HTMLFormElement);
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
