// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CrmReadOnlyComposer } from "./CrmReadOnlyComposer";

describe("CrmReadOnlyComposer", () => {
  afterEach(() => {
    cleanup();
  });

  it("explains that the current CRM user can only monitor the chat", () => {
    render(<CrmReadOnlyComposer />);

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Somente leitura");
    expect(note).toHaveTextContent(
      "Seu perfil pode acompanhar esta conversa sem enviar mensagens.",
    );
  });

  it("offers a direct connection setup action for a read-only demo", async () => {
    const user = userEvent.setup();
    let configured = false;

    render(
      <CrmReadOnlyComposer
        actionLabel="Configurar canal"
        onAction={() => {
          configured = true;
        }}
        reason="As mensagens desta demonstração são fictícias."
        title="Demonstração · somente leitura"
      />,
    );

    expect(screen.getByRole("note")).toHaveTextContent(
      "Demonstração · somente leitura",
    );
    await user.click(screen.getByRole("button", { name: "Configurar canal" }));
    expect(configured).toBe(true);
  });
});
