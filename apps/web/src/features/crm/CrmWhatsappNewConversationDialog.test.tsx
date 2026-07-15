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
    await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));

    expect(onStart).toHaveBeenCalledWith({
      buyerName: "Ana",
      phone: "(11) 99999-9999",
      text: "Ola, tudo bem?",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows localized field validation after invalid fields are visited", async () => {
    const user = userEvent.setup();
    render(
      <CrmWhatsappNewConversationDialog
        onClose={vi.fn()}
        onStart={vi.fn(async () => true)}
      />,
    );

    await user.click(screen.getByLabelText("WhatsApp"));
    await user.tab();
    await user.click(screen.getByLabelText("Mensagem"));
    await user.tab();

    expect(
      screen.getByText("Informe um WhatsApp válido com DDD."),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByText("Digite a primeira mensagem.")).toHaveAttribute(
      "role",
      "alert",
    );
  });

  it("keeps the dialog open and explains a rejected conversation", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CrmWhatsappNewConversationDialog
        onClose={onClose}
        onStart={vi.fn(async () => false)}
      />,
    );

    await user.type(screen.getByLabelText("WhatsApp"), "(11) 99999-9999");
    await user.type(screen.getByLabelText("Mensagem"), "Olá, tudo bem?");
    await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));

    const submitError = await screen.findByText(
      "Não foi possível iniciar a conversa. Tente novamente.",
    );
    expect(submitError.closest('[role="alert"]')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
