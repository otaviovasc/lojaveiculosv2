// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessageList } from "./CrmWhatsappMessageParts";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";

describe("CrmWhatsappMessageParts", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders image media with its caption", () => {
    render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            content: "Foto do carro",
            mediaUrl: "https://zapi.test/car.jpg",
            type: "IMAGE",
          }),
        ]}
      />,
    );

    expect(screen.getByAltText("Foto do carro")).toHaveAttribute(
      "src",
      "https://zapi.test/car.jpg",
    );
    expect(screen.getByText("Foto do carro")).toBeInTheDocument();
  });

  it("renders document media as an attachment link", () => {
    render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            content: "proposta.pdf",
            mediaUrl: "https://zapi.test/proposta.pdf",
            metadata: {
              media: {
                fileName: "proposta.pdf",
                mimeType: "application/pdf",
              },
            },
            type: "DOCUMENT",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /proposta.pdf/ })).toHaveAttribute(
      "href",
      "https://zapi.test/proposta.pdf",
    );
    expect(screen.getByText("application/pdf")).toBeInTheDocument();
  });

  it("renders location messages as map links when coordinates are present", () => {
    render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            content: "Loja",
            metadata: {
              location: {
                address: "Av. Paulista",
                latitude: -23.5614,
                longitude: -46.6559,
              },
            },
            type: "LOCATION",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /Loja/ })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=-23.5614,-46.6559",
    );
    expect(screen.getByText("Av. Paulista")).toBeInTheDocument();
  });

  it("renders full catalog messages as catalog cards", () => {
    render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            content: "Catalogo da loja",
            metadata: {
              catalog: {
                catalogPhone: "5511940231407",
                catalogUrl: "https://loja.local/test-store",
                message: "Confira nosso catalogo",
                title: "Catalogo da loja",
              },
            },
            type: "CATALOG",
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Catalogo da loja/ }),
    ).toHaveAttribute("href", "https://loja.local/test-store");
    expect(screen.getByText("Confira nosso catalogo")).toBeInTheDocument();
  });

  it("renders vehicle catalog messages with thumbnail and vehicle details", () => {
    const { container } = render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            content: "Audi A4 Prestige Plus 2022",
            metadata: {
              vehicle: {
                description: "Sedan preto",
                mileageLabel: "32.000 km",
                priceLabel: "R$ 189.900",
                thumbnailUrl: "https://cdn.local/audi.jpg",
                title: "Audi A4 Prestige Plus 2022",
                year: "2021/2022",
              },
            },
            type: "CATALOG",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Audi A4 Prestige Plus 2022")).toBeInTheDocument();
    expect(screen.getByText("Sedan preto")).toBeInTheDocument();
    expect(
      screen.getByText("R$ 189.900 · 2021/2022 · 32.000 km"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".crm-whatsapp-rich-card-media img"),
    ).toHaveAttribute("src", "https://cdn.local/audi.jpg");
  });

  it("renders quoted reply metadata and reaction pills", () => {
    render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            content: "Sim, esta disponivel.",
            direction: "OUTBOUND",
            metadata: {
              reaction: { value: "👍" },
              replyTo: {
                content: "Ainda esta disponivel?",
                direction: "INBOUND",
              },
            },
          }),
        ]}
      />,
    );

    expect(screen.getByText("Ainda esta disponivel?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reacao 👍" }),
    ).toBeInTheDocument();
  });

  it("keeps message actions available on grouped media", async () => {
    const user = userEvent.setup();
    const messages = [
      createMessage({
        direction: "OUTBOUND",
        id: "message-1",
        mediaUrl: "https://zapi.test/one.jpg",
        senderType: "HUMAN",
        type: "IMAGE",
      }),
      createMessage({
        direction: "OUTBOUND",
        id: "message-2",
        mediaUrl: "https://zapi.test/two.jpg",
        senderType: "HUMAN",
        type: "IMAGE",
      }),
    ];
    const onDelete = vi.fn(async () => true);
    const onReact = vi.fn(async () => true);
    const onReply = vi.fn();
    render(
      <MessageList
        isLoading={false}
        messages={messages}
        onDelete={onDelete}
        onReact={onReact}
        onReply={onReply}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Responder mensagem" }),
    );
    expect(onReply).toHaveBeenCalledWith(messages[1]);

    await user.click(screen.getByRole("button", { name: "Reagir a mensagem" }));
    await user.click(screen.getByRole("button", { name: "Reagir com 👍" }));
    expect(onReact).toHaveBeenCalledWith(messages[1], "👍");

    await user.click(screen.getByRole("button", { name: "Apagar mensagem" }));
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(onDelete).toHaveBeenCalledWith(messages[1]);
  });

  it("invokes message action callbacks from the bubble controls", async () => {
    const user = userEvent.setup();
    const message = createMessage();
    const onDelete = vi.fn(async () => true);
    const onReact = vi.fn(async () => true);
    const onReply = vi.fn();
    render(
      <MessageList
        isLoading={false}
        messages={[message]}
        onDelete={onDelete}
        onReact={onReact}
        onReply={onReply}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Responder mensagem" }),
    );
    expect(onReply).toHaveBeenCalledWith(message);

    await user.click(screen.getByRole("button", { name: "Reagir a mensagem" }));
    await user.click(screen.getByRole("button", { name: "Reagir com 👍" }));
    expect(onReact).toHaveBeenCalledWith(message, "👍");

    await user.click(screen.getByRole("button", { name: "Apagar mensagem" }));
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(onDelete).toHaveBeenCalledWith(message);
  });
});

function createMessage(
  overrides: Partial<CrmWhatsappMessage> = {},
): CrmWhatsappMessage {
  return {
    content: "Ola",
    createdAt: "2026-07-02T19:00:00.000Z",
    direction: "INBOUND",
    id: "message-1",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    type: "TEXT",
    ...overrides,
  };
}
