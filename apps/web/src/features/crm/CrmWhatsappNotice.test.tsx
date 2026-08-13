// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WhatsappNotice } from "./CrmWhatsappNotice";

describe("WhatsappNotice", () => {
  afterEach(cleanup);

  it("offers the supplied recovery action without hiding the error", () => {
    const onAction = vi.fn();

    render(
      <WhatsappNotice
        actionLabel="Atualizar conversas"
        message="A conversa mudou. ID do erro: req_123"
        onAction={onAction}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "A conversa mudou. ID do erro: req_123",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar conversas" }),
    );
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("does not render an inert action", () => {
    render(<WhatsappNotice actionLabel="Tentar novamente" message="Falhou" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
