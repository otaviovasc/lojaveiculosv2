// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogSelect } from "./InventoryCatalogSelectorParts";

afterEach(cleanup);

describe("CatalogSelect combobox", () => {
  it("renders its listbox inside the shared scroll-owning options container", async () => {
    const user = userEvent.setup();
    render(
      <CatalogSelect
        combobox
        label="Marca FIPE"
        onChange={vi.fn()}
        options={Array.from({ length: 50 }, (_, index) => ({
          code: String(index),
          name: `Marca ${index}`,
        }))}
        value=""
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Marca FIPE" }));

    const listbox = screen.getByRole("listbox", {
      name: "Marca FIPE: opções",
    });
    expect(listbox).toHaveClass("custom-select-options");
    expect(listbox.parentElement).toHaveClass("custom-select-menu");
    expect(listbox.parentElement?.parentElement).toBe(document.body);
  });

  it("falls back to brand initials when a mapped image fails to load", async () => {
    const user = userEvent.setup();
    render(
      <CatalogSelect
        combobox
        kind="brand"
        label="Marca FIPE"
        onChange={vi.fn()}
        options={[
          {
            code: "21",
            imageUrl: "https://logos.example/unavailable.svg",
            name: "Fiat",
          },
        ]}
        value=""
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Marca FIPE" }));
    fireEvent.error(screen.getByRole("presentation"));

    expect(screen.getByText("F")).toBeVisible();
  });
});
