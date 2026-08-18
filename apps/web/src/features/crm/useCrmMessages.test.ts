// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmConversationApi } from "./crmConversationApi";
import {
  mergeRealtimeMessageIntoHistory,
  useCrmMessages,
} from "./useCrmMessages";
import type { CrmMessage, CrmConversationCycle } from "./crmConversationTypes";

describe("useCrmMessages", () => {
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

  it("does not reload messages when the active cycle preview changes", async () => {
    const api = createApi();
    const cycle = createSession();
    const props = {
      activeSession: cycle,
      api,
      mergeCycles: vi.fn(),
      setError: vi.fn(),
    };
    const { rerender } = render(createElement(Harness, props));

    await waitFor(() => expect(api.listMessages).toHaveBeenCalledTimes(1));
    rerender(
      createElement(Harness, {
        ...props,
        activeSession: {
          ...cycle,
          lastMessageAt: "2026-07-03T12:01:00.000Z",
          lastMessageContent: "Preview atualizado",
        },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(api.listMessages).toHaveBeenCalledTimes(1);
  });

  it("evicts only the revoked cycle cache before reselection", async () => {
    const revokedSession = createSession({
      id: "cycle-revoked",
    });
    const retainedSession = createSession({
      id: "cycle-retained",
    });
    const revokedMessage = createMessage({
      content: "Mensagem revogada",
      id: "message-revoked",
    });
    const retainedMessage = createMessage({
      content: "Mensagem mantida",
      id: "message-retained",
    });
    let revokedLoads = 0;
    const api = createApi();
    vi.mocked(api.listMessages).mockImplementation(async (cycleId) => {
      if (cycleId === revokedSession.id) {
        revokedLoads += 1;
        if (revokedLoads === 1) return [revokedMessage];
        return new Promise<CrmMessage[]>(() => undefined);
      }
      return [retainedMessage];
    });
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    const props = {
      api,
      mergeCycles: vi.fn(),
      onState: (state: ReturnType<typeof useCrmMessages>) => {
        latest = state;
      },
      setError: vi.fn(),
    };
    const rendered = render(
      createElement(Harness, {
        ...props,
        activeSession: revokedSession,
      }),
    );
    await waitFor(() => expect(latest?.messages).toEqual([revokedMessage]));

    rendered.rerender(
      createElement(Harness, {
        ...props,
        activeSession: retainedSession,
      }),
    );
    await waitFor(() => expect(latest?.messages).toEqual([retainedMessage]));

    act(() => latest?.evictSessionMessages(revokedSession.id));
    rendered.rerender(
      createElement(Harness, {
        ...props,
        activeSession: revokedSession,
      }),
    );
    await waitFor(() => expect(revokedLoads).toBe(2));
    expect(
      (latest as ReturnType<typeof useCrmMessages> | null)?.messages,
    ).toEqual([]);

    rendered.rerender(
      createElement(Harness, {
        ...props,
        activeSession: retainedSession,
      }),
    );
    await waitFor(() => expect(latest?.messages).toEqual([retainedMessage]));
  });

  it("blocks send-class actions when the user can only read messages", async () => {
    const api = createApi();
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        canSendMessages: false,
        mergeCycles: vi.fn(),
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

  it("does not change human attendance when a reaction succeeds", async () => {
    const api = createApi();
    const message = createMessage();
    vi.mocked(api.sendReaction).mockResolvedValue({
      ...message,
      metadata: { reaction: "👍" },
    });
    const mergeCycles = vi.fn();
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: {
          ...createSession(),
          humanAttendanceState: "WAITING_HUMAN",
        },
        api,
        mergeCycles,
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    await expect(latest!.sendReaction(message, "👍")).resolves.toBe(true);

    expect(api.sendReaction).toHaveBeenCalledWith(message.id, {
      reaction: "👍",
    });
    expect(mergeCycles).not.toHaveBeenCalled();
  });
});

function Harness({
  activeSession,
  api,
  canSendMessages = true,
  mergeCycles,
  onState,
  setError,
}: {
  activeSession: CrmConversationCycle;
  api: CrmConversationApi;
  canSendMessages?: boolean;
  mergeCycles: (nextSessions: CrmConversationCycle[]) => void;
  onState?: (state: ReturnType<typeof useCrmMessages>) => void;
  setError: (error: Error) => void;
}) {
  const state = useCrmMessages({
    activeSession,
    activeCycleId: activeSession.id,
    api,
    canLoadMessages: true,
    canSendMessages,
    mergeCycles,
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

function createApi(): CrmConversationApi {
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
  } as unknown as CrmConversationApi;
}

function createSession(
  input: Partial<CrmConversationCycle> = {},
): CrmConversationCycle {
  return {
    customerDisplayName: "Joao",
    customerPhone: "5511999999999",
    channel: "whatsapp",
    id: "session_1",
    lastMessageAt: "2026-07-03T12:00:00.000Z",
    lastMessageContent: "Ola",
    status: "ACTIVE",
    unreadCount: 1,
    ...input,
  };
}

function createMessage(input: Partial<CrmMessage> = {}): CrmMessage {
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
