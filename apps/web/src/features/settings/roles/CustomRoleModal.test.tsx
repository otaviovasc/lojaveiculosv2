// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomRoleModal } from "./CustomRoleModal";

afterEach(cleanup);

describe("CustomRoleModal", () => {
  it("creates the trimmed role name from the shared dialog form", () => {
    const onCreate = vi.fn();
    render(
      <CustomRoleModal
        baseRoleLabel="Vendedor"
        exceptionsCount={3}
        isOpen
        onClose={vi.fn()}
        onCreate={onCreate}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Salvar como Cargo Customizado" }),
    ).toHaveTextContent("Vendedor");
    fireEvent.change(screen.getByLabelText("Nome do Cargo Customizado"), {
      target: { value: "  Vendedor Sênior  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar Cargo" }));

    expect(onCreate).toHaveBeenCalledWith("Vendedor Sênior");
  });
});
