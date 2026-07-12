// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("uses the compact text variant without call-site style overrides", () => {
    render(<Button size="xs">Salvar</Button>);

    expect(screen.getByRole("button", { name: "Salvar" })).toHaveClass(
      "h-9",
      "px-2.5",
      "rounded-xl",
      "text-xs",
    );
  });

  it("uses the canonical compact icon geometry", () => {
    render(<Button aria-label="Editar" size="icon-sm" />);

    expect(screen.getByRole("button", { name: "Editar" })).toHaveClass(
      "h-8",
      "w-8",
      "p-0",
      "rounded-lg",
    );
  });

  it("preserves anchor semantics when rendered as a child", () => {
    render(
      <Button asChild size="xs" variant="outline">
        <a href="/preview">Visualizar</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Visualizar" });
    expect(link).toHaveAttribute("href", "/preview");
    expect(link).toHaveClass("h-9", "border-2");
  });
});
