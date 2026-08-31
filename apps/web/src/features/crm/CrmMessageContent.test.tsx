// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QuotedMessage } from "./CrmMessageContent";

describe("QuotedMessage", () => {
  afterEach(cleanup);

  it("shows the canonical sender for quoted outbound messages", () => {
    render(
      <QuotedMessage
        metadata={{
          replyTo: {
            content: "Mensagem original",
            direction: "OUTBOUND",
            senderOrigin: "human_crm",
            senderName: "Nome legado",
            senderUser: { id: "user-1", name: "Otavio Vasconcelos" },
            senderType: "HUMAN",
          },
        }}
      />,
    );

    expect(screen.getByText("Otavio Vasconcelos")).toBeVisible();
    expect(screen.queryByText("Nome legado")).not.toBeInTheDocument();
  });

  it("uses the deterministic removed-user fallback for historical human replies", () => {
    render(
      <QuotedMessage
        metadata={{
          replyTo: {
            content: "Mensagem original",
            direction: "OUTBOUND",
            senderOrigin: "human_crm",
            senderType: "HUMAN",
          },
        }}
      />,
    );

    expect(screen.getByText("Atendente removido")).toBeVisible();
    expect(screen.queryByText("Atendente")).not.toBeInTheDocument();
  });
});
