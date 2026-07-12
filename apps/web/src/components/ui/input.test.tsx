// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("uses the default field dimensions", () => {
    render(<Input aria-label="Nome" />);

    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveClass(
      "h-12",
      "px-4",
      "text-base",
    );
  });

  it("renders a compact field with an accessible decorative start icon", () => {
    render(
      <Input
        aria-label="Buscar"
        inputSize="sm"
        startIcon={<span data-testid="search-icon" />}
      />,
    );

    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Buscar" })).toHaveClass(
      "h-9",
      "px-3",
      "pl-9",
      "text-sm",
    );
  });

  it("forwards native input behavior", () => {
    const onChange = vi.fn();
    render(<Input aria-label="Email" onChange={onChange} type="email" />);

    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "loja@example.com" },
    });

    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue(
      "loja@example.com",
    );
  });
});
