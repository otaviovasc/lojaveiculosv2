// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import {
  mergeRealtimeMessageIntoHistory,
  useCrmWhatsappMessages,
} from "./useCrmWhatsappMessages";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

describe("useCrmWhatsappMessages", () => {
  afterEach(() => {
    cleanup();
  });

  it("appends realtime messages without dropping loaded history", () => {
    const first = createMessage({
      content: "Ola",
      createdAt: "2026-07-03T12:00:00.000Z",
      id: "message-1",
    });
    const second = createMessage({
      content: "Tudo bem?",
      createdAt: "2026-07-03T12:01:00.000Z",
      id: "message-2",
    });

    expect(mergeRealtimeMessageIntoHistory([first], second)).toEqual([
      first,
      second,
    ]);
  });

  it("replaces matching local echoes when the realtime server message arrives", () => {
    const localEcho = {
      ...createMessage({
        content: "Resposta",
        direction: "OUTBOUND",
        id: "local-message",
        status: "PENDING",
      }),
      clientId: "local-message",
    };
    const serverMessage = createMessage({
      content: "Resposta",
      direction: "OUTBOUND",
      id: "server-message",
      status: "SENT",
    });

    expect(mergeRealtimeMessageIntoHistory([localEcho], serverMessage)).toEqual(
      [serverMessage],
    );
  });

  it("does not reload messages when the active session preview changes", async () => {
    const api = createApi();
    const session = createSession();
    const props = {
      activeSession: session,
      api,
      mergeSessions: vi.fn(),
      setError: vi.fn(),
    };
    const { rerender } = render(createElement(Harness, props));

    await waitFor(() => expect(api.listMessages).toHaveBeenCalledTimes(1));
    rerender(
      createElement(Harness, {
        ...props,
        activeSession: {
          ...session,
          lastMessageAt: "2026-07-03T12:01:00.000Z",
          lastMessageContent: "Preview atualizado",
        },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(api.listMessages).toHaveBeenCalledTimes(1);
  });

  it("blocks send-class actions when the user can only read messages", async () => {
    const api = createApi();
    let latest: ReturnType<typeof useCrmWhatsappMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        canSendMessages: false,
        mergeSessions: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());
    const message = createMessage();
    const file = new File(["image"], "car.jpg", { type: "image/jpeg" });

    await expect(latest!.sendText("Ola")).resolves.toBe(false);
    await expect(latest!.sendMedia({ file, mediaType: "image" })).resolves.toBe(
      false,
    );
    await expect(latest!.sendReaction(message, "ok")).resolves.toBe(false);
    await expect(latest!.removeReaction(message)).resolves.toBe(false);
    await expect(latest!.deleteMessage(message)).resolves.toBe(false);
    await expect(
      latest!.sendLocation({ latitude: -23.5, longitude: -46.6 }),
    ).resolves.toBe(false);
    await expect(latest!.sendCatalog({ title: "Catalogo" })).resolves.toBe(
      false,
    );
    await expect(
      latest!.sendCatalogProduct({ productId: "product_1" }),
    ).resolves.toBe(false);
    await expect(
      latest!.sendQuickMessage({
        content: "Ola",
        id: "quick_1",
        kind: "TEXT",
        shortcut: "/ola",
        title: "Ola",
      }),
    ).resolves.toBe(false);

    expect(api.sendText).not.toHaveBeenCalled();
    expect(api.sendMedia).not.toHaveBeenCalled();
    expect(api.sendReaction).not.toHaveBeenCalled();
    expect(api.removeReaction).not.toHaveBeenCalled();
    expect(api.deleteMessage).not.toHaveBeenCalled();
    expect(api.sendLocation).not.toHaveBeenCalled();
    expect(api.sendCatalog).not.toHaveBeenCalled();
    expect(api.sendCatalogProduct).not.toHaveBeenCalled();
    expect(api.sendQuickMessage).not.toHaveBeenCalled();
  });
});

function Harness({
  activeSession,
  api,
  canSendMessages = true,
  mergeSessions,
  onState,
  setError,
}: {
  activeSession: CrmWhatsappSession;
  api: CrmWhatsappApi;
  canSendMessages?: boolean;
  mergeSessions: (nextSessions: CrmWhatsappSession[]) => void;
  onState?: (state: ReturnType<typeof useCrmWhatsappMessages>) => void;
  setError: (error: Error) => void;
}) {
  const state = useCrmWhatsappMessages({
    activeSession,
    activeSessionId: activeSession.id,
    api,
    canLoadMessages: true,
    canSendMessages,
    mergeSessions,
    setError,
  });
  if (onState) {
    onState(state);
  }

  return createElement(
    "output",
    { "aria-label": "loaded messages" },
    state.messages.length,
  );
}

function createApi(): CrmWhatsappApi {
  return {
    deleteMessage: vi.fn(),
    listMessages: vi.fn().mockResolvedValue([
      createMessage({
        content: "Mensagem carregada",
        id: "message-loaded",
      }),
    ]),
    removeReaction: vi.fn(),
    sendCatalog: vi.fn(),
    sendCatalogProduct: vi.fn(),
    sendLocation: vi.fn(),
    sendMedia: vi.fn(),
    sendQuickMessage: vi.fn(),
    sendReaction: vi.fn(),
    sendText: vi.fn(),
  } as unknown as CrmWhatsappApi;
}

function createSession(): CrmWhatsappSession {
  return {
    buyerName: "Joao",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    id: "session_1",
    lastMessageAt: "2026-07-03T12:00:00.000Z",
    lastMessageContent: "Ola",
    status: "ACTIVE",
    unreadCount: 1,
    uuid: "550e8400-e29b-41d4-a716-446655440000",
  };
}

function createMessage(
  input: Partial<CrmWhatsappMessage> = {},
): CrmWhatsappMessage {
  return {
    content: "Ola",
    createdAt: "2026-07-03T12:00:00.000Z",
    direction: "INBOUND",
    id: "message-1",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    type: "TEXT",
    ...input,
  };
}
