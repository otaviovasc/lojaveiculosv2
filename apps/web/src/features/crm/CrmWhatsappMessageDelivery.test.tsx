// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MessageBubble } from "./CrmWhatsappMessageBubble";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";

describe("CRM message delivery presentation", () => {
  afterEach(() => cleanup());

  it.each([
    ["PENDING", "Envio pendente"],
    ["FAILED", "Falha no envio"],
    ["INDETERMINATE", "Envio não confirmado"],
  ])("exposes %s as an honest visible state", (status, label) => {
    const { container } = render(
      <MessageBubble actionsDisabled={false} message={message(status)} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(label);
    expect(container.querySelector("article")).toHaveAttribute(
      "data-message-status",
      status.toLowerCase(),
    );
  });

  it("keeps confirmed outbound delivery compact and accessible", () => {
    render(<MessageBubble actionsDisabled={false} message={message("SENT")} />);

    expect(screen.getByLabelText("Mensagem enviada")).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

function message(status: string): CrmWhatsappMessage {
  return {
    content: "Olá, posso ajudar?",
    createdAt: "2026-08-12T12:00:00.000Z",
    direction: "OUTBOUND",
    id: `message-${status}`,
    senderOrigin: "human_crm",
    senderType: "HUMAN",
    status,
    type: "TEXT",
  };
}
