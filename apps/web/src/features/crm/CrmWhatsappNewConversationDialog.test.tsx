// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappNewConversationDialog } from "./CrmWhatsappNewConversationDialog";

describe("CrmWhatsappNewConversationDialog", () => {
  afterEach(cleanup);

  it("collects a phone, name, and first message before starting", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onStart = vi.fn(async () => true);
    render(
      <CrmWhatsappNewConversationDialog onClose={onClose} onStart={onStart} />,
    );

    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("WhatsApp"), "(11) 99999-9999");
    await user.type(screen.getByLabelText("Mensagem"), "Ola, tudo bem?");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onStart).toHaveBeenCalledWith({
      buyerName: "Ana",
      phone: "(11) 99999-9999",
      text: "Ola, tudo bem?",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
