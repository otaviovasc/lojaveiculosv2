// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessageList } from "./CrmMessageParts";
import type { CrmMessage } from "./crmConversationTypes";

const originalScrollIntoView = Element.prototype.scrollIntoView;

describe("CrmMessageParts", () => {
  afterEach(() => {
    cleanup();
    if (originalScrollIntoView) {
      Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    } else {
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    }
  });

  it("keeps rendered history visible during a silent refresh", () => {
    render(
      <MessageList
        isLoading
        messages={[
          createMessage({ content: "Histórico preservado", id: "history-1" }),
        ]}
      />,
    );

    expect(screen.getByText("Histórico preservado")).toBeVisible();
    expect(
      screen.queryByRole("status", { name: "Carregando mensagens" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the reader's position unless they are near the end or send a message", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    const first = createMessage({ id: "message-1" });
    const { container, rerender } = render(
      <MessageList isLoading={false} messages={[first]} />,
    );
    const list = container.querySelector<HTMLDivElement>(".crm-messages")!;
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1_000 },
      scrollTop: { configurable: true, value: 100, writable: true },
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    fireEvent.scroll(list);
    rerender(
      <MessageList
        isLoading={false}
        messages={[
          first,
          createMessage({
            createdAt: "2026-07-02T19:01:00.000Z",
            id: "message-2",
          }),
        ]}
      />,
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    list.scrollTop = 720;
    fireEvent.scroll(list);
    const firstThree = [
      first,
      createMessage({
        createdAt: "2026-07-02T19:01:00.000Z",
        id: "message-2",
      }),
      createMessage({
        createdAt: "2026-07-02T19:02:00.000Z",
        id: "message-3",
      }),
    ];
    rerender(<MessageList isLoading={false} messages={firstThree} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);

    list.scrollTop = 100;
    fireEvent.scroll(list);
    rerender(
      <MessageList
        isLoading={false}
        messages={[
          ...firstThree,
          {
            ...createMessage({
              createdAt: "2026-07-02T19:03:00.000Z",
              direction: "OUTBOUND",
              id: "local-message",
              senderType: "HUMAN",
              status: "PENDING",
            }),
            clientId: "local-message",
          },
        ]}
      />,
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it("starts a replaced conversation at the latest message without moving on prepended history", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    const current = createMessage({ id: "cycle-a-message-2" });
    const { container, rerender } = render(
      <MessageList isLoading={false} messages={[current]} />,
    );
    const list = container.querySelector<HTMLDivElement>(".crm-messages")!;
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1_000 },
      scrollTop: { configurable: true, value: 100, writable: true },
    });
    fireEvent.scroll(list);

    rerender(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            createdAt: "2026-07-02T18:59:00.000Z",
            id: "cycle-a-message-1",
          }),
          current,
        ]}
      />,
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList
        isLoading={false}
        messages={[createMessage({ id: "cycle-b-message-1" })]}
      />,
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("shows older-history loading, retry, and exhausted states", async () => {
    const user = userEvent.setup();
    const onLoadOlder = vi.fn(async () => true);
    const message = createMessage();
    const { rerender } = render(
      <MessageList
        hasOlderMessages
        isLoading={false}
        messages={[message]}
        onLoadOlder={onLoadOlder}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Carregar mensagens anteriores" }),
    ).toBeEnabled();

    rerender(
      <MessageList
        hasOlderMessages
        isLoading={false}
        isLoadingOlderMessages
        messages={[message]}
        onLoadOlder={onLoadOlder}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Carregando mensagens..." }),
    ).toBeDisabled();

    rerender(
      <MessageList
        hasOlderMessages
        isLoading={false}
        messages={[message]}
        olderMessagesError
        onLoadOlder={onLoadOlder}
      />,
    );
    expect(
      screen.getByText("Não foi possível carregar as mensagens anteriores."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onLoadOlder).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList
        isLoading={false}
        messages={[message]}
        onLoadOlder={onLoadOlder}
      />,
    );
    expect(
      screen.queryByRole("button", {
        name: "Carregar mensagens anteriores",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Início da conversa")).toBeInTheDocument();
  });

  it("keeps the visible message anchored when older history is prepended", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    const { container } = render(<HistoryPaginationHarness />);
    const list = container.querySelector<HTMLDivElement>(".crm-messages")!;
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 80 },
      scrollHeight: {
        configurable: true,
        get: () => list.querySelectorAll(".crm-bubble").length * 300,
      },
      scrollTop: { configurable: true, value: 10, writable: true },
    });
    fireEvent.scroll(list);

    await user.click(
      screen.getByRole("button", { name: "Carregar mensagens anteriores" }),
    );
    expect(await screen.findByText("Mensagem anterior")).toBeInTheDocument();
    expect(list.scrollTop).toBe(310);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("forwards dropped files from the conversation history", () => {
    const onFilesDropped = vi.fn();
    const { container } = render(
      <MessageList
        isLoading={false}
        messages={[]}
        onFilesDropped={onFilesDropped}
      />,
    );
    const file = new File(["image"], "civic.jpg", { type: "image/jpeg" });

    fireEvent.drop(container.querySelector(".crm-messages")!, {
      dataTransfer: { files: [file], types: ["Files"] },
    });

    expect(onFilesDropped).toHaveBeenCalledWith([file]);
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
    expect(container.querySelector(".crm-rich-card-media img")).toHaveAttribute(
      "src",
      "https://cdn.local/audi.jpg",
    );
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
    await user.click(
      screen.getByRole("menuitemradio", { name: "Reagir com 👍" }),
    );
    expect(onReact).toHaveBeenCalledWith(messages[1], "👍");

    await user.click(screen.getByRole("button", { name: "Apagar mensagem" }));
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(onDelete).toHaveBeenCalledWith(messages[1]);
  });

  it("recovers every failed item in a grouped media send", async () => {
    const user = userEvent.setup();
    const messages = [
      createMessage({
        direction: "OUTBOUND",
        id: "failed-media-1",
        mediaUrl: "https://zapi.test/failed-one.jpg",
        senderType: "HUMAN",
        status: "FAILED",
        type: "IMAGE",
      }),
      createMessage({
        direction: "OUTBOUND",
        id: "failed-media-2",
        mediaUrl: "https://zapi.test/failed-two.jpg",
        senderType: "HUMAN",
        status: "FAILED",
        type: "IMAGE",
      }),
    ];
    const onRetryMessage = vi.fn(() => true);
    render(
      <MessageList
        isLoading={false}
        messages={messages}
        onRetryMessage={onRetryMessage}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Tentar novamente (2)" }),
    );

    expect(onRetryMessage).toHaveBeenNthCalledWith(1, messages[0]);
    expect(onRetryMessage).toHaveBeenNthCalledWith(2, messages[1]);
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
    await user.click(
      screen.getByRole("menuitemradio", { name: "Reagir com 👍" }),
    );
    expect(onReact).toHaveBeenCalledWith(message, "👍");

    await user.click(screen.getByRole("button", { name: "Apagar mensagem" }));
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(onDelete).toHaveBeenCalledWith(message);
  });
});

function createMessage(overrides: Partial<CrmMessage> = {}): CrmMessage {
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

function HistoryPaginationHarness() {
  const current = createMessage({
    content: "Mensagem atual",
    id: "current-message",
  });
  const [messages, setMessages] = useState([current]);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  return (
    <MessageList
      hasOlderMessages={hasOlderMessages}
      isLoading={false}
      messages={messages}
      onLoadOlder={async () => {
        setMessages([
          createMessage({
            content: "Mensagem anterior",
            createdAt: "2026-07-02T18:00:00.000Z",
            id: "older-message",
          }),
          current,
        ]);
        setHasOlderMessages(false);
        return true;
      }}
    />
  );
}
