// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CrmWhatsappReadOnlyComposer } from "./CrmWhatsappReadOnlyComposer";

describe("CrmWhatsappReadOnlyComposer", () => {
  afterEach(() => {
    cleanup();
  });

  it("explains that the current CRM user can only monitor the chat", () => {
    render(<CrmWhatsappReadOnlyComposer />);

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Somente leitura");
    expect(note).toHaveTextContent(
      "Seu perfil pode acompanhar esta conversa sem enviar mensagens.",
    );
  });
});
