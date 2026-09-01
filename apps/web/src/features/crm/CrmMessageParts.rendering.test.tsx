// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmMessage } from "./crmConversationTypes";
import { MessageContent } from "./CrmMessageContent";
import { MessageList } from "./CrmMessageParts";

const originalScrollIntoView = Element.prototype.scrollIntoView;

describe("CrmMessageParts rendering", () => {
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

  it("shows an explicit empty state before a conversation has messages", () => {
    render(<MessageList isLoading={false} messages={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Nenhuma mensagem ainda",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "As mensagens desta conversa aparecerão aqui.",
    );
  });

  it("opens image and video previews with keyboard activation", async () => {
    const user = userEvent.setup();
    render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            content: "Foto do carro",
            id: "image-1",
            mediaUrl: "https://zapi.test/car.jpg",
            type: "IMAGE",
          }),
          createMessage({
            content: "Video do carro",
            createdAt: "2026-07-02T19:02:00.000Z",
            id: "video-1",
            mediaUrl: "https://zapi.test/car.mp4",
            type: "VIDEO",
          }),
        ]}
      />,
    );

    const imageButton = screen.getByRole("button", {
      name: "Abrir Foto do carro",
    });
    imageButton.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    const videoButton = screen.getByRole("button", {
      name: "Reproduzir Video do carro",
    });
    videoButton.focus();
    await user.keyboard(" ");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("activates quoted-message navigation with the keyboard", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({ content: "Pergunta", id: "question-1" }),
          createMessage({
            content: "Resposta",
            createdAt: "2026-07-02T19:01:00.000Z",
            id: "answer-1",
            metadata: {
              replyTo: {
                content: "Pergunta",
                id: "question-1",
                senderName: "Cliente",
              },
            },
          }),
        ]}
      />,
    );

    const quote = screen.getByRole("button", {
      name: "Ir para mensagem de Cliente: Pergunta",
    });
    quote.focus();
    await user.keyboard(" ");

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("keeps ids for every message inside a media group", () => {
    const { container } = render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            id: "media-1",
            mediaUrl: "https://zapi.test/one.jpg",
            type: "IMAGE",
          }),
          createMessage({
            createdAt: "2026-07-02T19:00:20.000Z",
            id: "media-2",
            mediaUrl: "https://zapi.test/two.jpg",
            type: "IMAGE",
          }),
        ]}
      />,
    );

    expect(container.querySelector("#crm-msg-media-1")).toBeInTheDocument();
    expect(container.querySelector("#crm-msg-media-2")).toBeInTheDocument();
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "blob:untrusted-server-media",
  ])("renders an unsafe media URL as inert content: %s", (mediaUrl) => {
    const onMediaClick = vi.fn();
    const { container } = render(
      <MessageContent
        message={createMessage({ mediaUrl, type: "IMAGE" })}
        onMediaClick={onMediaClick}
      />,
    );

    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Abrir anexo")).toBeInTheDocument();
    expect(onMediaClick).not.toHaveBeenCalled();
  });

  it("renders a local optimistic audio object URL as playable media", () => {
    render(
      <MessageContent
        message={createMessage({
          direction: "OUTBOUND",
          id: "local-audio-1",
          mediaUrl: "blob:local-audio-preview",
          status: "PENDING",
          type: "AUDIO",
        })}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Reproduzir audio" }),
    ).toBeVisible();
    expect(document.querySelector("audio")).toHaveAttribute(
      "src",
      "blob:local-audio-preview",
    );
  });

  it("excludes unsafe sibling media from gallery navigation", async () => {
    const user = userEvent.setup();
    render(
      <MessageList
        isLoading={false}
        messages={[
          createMessage({
            content: "Foto segura",
            id: "safe-media",
            mediaUrl: "https://zapi.test/safe.jpg",
            type: "IMAGE",
          }),
          createMessage({
            content: "Foto insegura",
            createdAt: "2026-07-02T19:05:00.000Z",
            id: "unsafe-media",
            mediaUrl: "javascript:alert(1)",
            type: "IMAGE",
          }),
        ]}
      />,
    );

    await user.click(screen.getByRole("img", { name: "Foto segura" }));

    expect(screen.getByRole("link", { name: "Baixar midia" })).toHaveAttribute(
      "href",
      "https://zapi.test/safe.jpg",
    );
    expect(
      screen.queryByRole("button", { name: "Proxima midia" }),
    ).not.toBeInTheDocument();
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
