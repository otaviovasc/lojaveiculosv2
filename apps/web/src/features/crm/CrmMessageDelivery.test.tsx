// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessageBubble } from "./CrmMessageBubble";
import type { CrmMessage } from "./crmConversationTypes";

describe("CRM message delivery presentation", () => {
  afterEach(() => cleanup());

  it.each([
    ["PENDING", "Envio pendente", "pending"],
    ["FAILED", "Falha no envio", "failed"],
    ["INDETERMINATE", "Envio não confirmado", "indeterminate"],
    ["PROVIDER_UNKNOWN", "Envio não confirmado", "indeterminate"],
  ] as const)(
    "exposes %s as an honest visible state",
    (status, label, uiStatus) => {
      const { container } = render(
        <MessageBubble actionsDisabled={false} message={message(status)} />,
      );

      expect(screen.getByRole("status")).toHaveTextContent(label);
      expect(container.querySelector("article")).toHaveAttribute(
        "data-message-status",
        uiStatus,
      );
    },
  );

  it("keeps confirmed outbound delivery compact and accessible", () => {
    render(<MessageBubble actionsDisabled={false} message={message("SENT")} />);

    expect(screen.getByLabelText("Mensagem enviada")).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("offers an explicit retry only for a definitely failed message", async () => {
    const user = userEvent.setup();
    const failed = message("FAILED");
    const onRetryMessage = vi.fn(() => true);
    const onReconcileMessage = vi.fn(() => true);
    render(
      <MessageBubble
        actionsDisabled={false}
        message={failed}
        onReconcileMessage={onReconcileMessage}
        onRetryMessage={onRetryMessage}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(onRetryMessage).toHaveBeenCalledWith(failed);
    expect(onReconcileMessage).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Verificar envio" }),
    ).not.toBeInTheDocument();
  });

  it("reconciles an indeterminate message without offering a blind resend", async () => {
    const user = userEvent.setup();
    const uncertain = message("INDETERMINATE");
    const onRetryMessage = vi.fn(() => true);
    const onReconcileMessage = vi.fn(() => true);
    render(
      <MessageBubble
        actionsDisabled={false}
        message={uncertain}
        onReconcileMessage={onReconcileMessage}
        onRetryMessage={onRetryMessage}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Verificar envio" }));

    expect(onReconcileMessage).toHaveBeenCalledWith(uncertain);
    expect(onRetryMessage).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Tentar novamente" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["preparing", "Preparando mídia…"],
    ["uploading", "Enviando mídia…"],
  ] as const)("announces the honest local media %s phase", (phase, label) => {
    render(
      <MessageBubble
        actionsDisabled={false}
        message={{
          ...message("PENDING"),
          mediaUrl: "blob:local-preview",
          metadata: { localUpload: { phase } },
          type: "IMAGE",
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(label);
  });

  it("disables recovery while conversation actions are unavailable", () => {
    render(
      <MessageBubble
        actionsDisabled
        message={message("FAILED")}
        onRetryMessage={() => true}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeDisabled();
  });
});

function message(status: CrmMessage["status"]): CrmMessage {
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
