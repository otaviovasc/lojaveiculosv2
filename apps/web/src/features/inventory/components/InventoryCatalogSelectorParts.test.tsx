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

  it("supports keyboard navigation and selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CatalogSelect
        combobox
        label="Versão FIPE"
        onChange={onChange}
        options={[
          { code: "1", name: "Versão A" },
          { code: "2", name: "Versão B" },
        ]}
        value=""
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Versão FIPE" });
    await user.click(combobox);
    expect(combobox).toHaveAttribute("aria-controls");

    await user.keyboard("{ArrowDown}");

    const activeOption = screen.getByRole("option", { name: "Versão B" });
    expect(activeOption).toHaveAttribute("data-active", "true");
    expect(activeOption).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("2");
    expect(
      screen.queryByRole("listbox", { name: "Versão FIPE: opções" }),
    ).not.toBeInTheDocument();
  });
});
