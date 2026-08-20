// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmNotice } from "./CrmNotice";

describe("CrmNotice", () => {
  afterEach(cleanup);

  it("offers recovery while keeping the request ID in technical details", async () => {
    const onAction = vi.fn();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <CrmNotice
        actionLabel="Atualizar conversas"
        message="A conversa mudou."
        onAction={onAction}
        requestId="req_123"
      />,
    );

    expect(screen.getByText("A conversa mudou.")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveAttribute("data-ui", "toast");
    expect(document.querySelector(".crm-note")).not.toBeInTheDocument();
    const details = screen.getByText("Detalhes técnicos").closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar conversas" }),
    );
    expect(onAction).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Detalhes técnicos"));
    fireEvent.click(screen.getByRole("button", { name: "Copiar ID do erro" }));
    expect(writeText).toHaveBeenCalledWith("req_123");
  });

  it("does not render an inert action", () => {
    render(<CrmNotice actionLabel="Tentar novamente" message="Falhou" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
