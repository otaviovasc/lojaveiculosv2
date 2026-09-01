// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import type { CrmConversationApi } from "./crmConversationApi";
import {
  mergeRealtimeMessageIntoHistory,
  useCrmMessages,
} from "./useCrmMessages";
import type { CrmMessage, CrmConversationCycle } from "./crmConversationTypes";

describe("useCrmMessages", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
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

  it("preserves loaded history while channel availability changes", async () => {
    const api = createApi();
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    const props = {
      activeSession: createSession(),
      api,
      mergeCycles: vi.fn(),
      onState: (state: ReturnType<typeof useCrmMessages>) => {
        latest = state;
      },
      setError: vi.fn(),
    };
    const rendered = render(createElement(Harness, props));

    await waitFor(() =>
      expect(latest?.messages).toEqual([
        expect.objectContaining({ id: "message-loaded" }),
      ]),
    );

    rendered.rerender(
      createElement(Harness, { ...props, canLoadMessages: false }),
    );

    expect(
      (latest as ReturnType<typeof useCrmMessages> | null)?.messages,
    ).toEqual([expect.objectContaining({ id: "message-loaded" })]);
    expect(
      (latest as ReturnType<typeof useCrmMessages> | null)
        ?.hasLoadedActiveMessages,
    ).toBe(true);
  });

  it("ends the initial skeleton when message history times out", async () => {
    vi.useFakeTimers();
    const api = createApi();
    vi.mocked(api.listMessages).mockImplementation(
      () => new Promise<CrmMessage[]>(() => undefined),
    );
    const setError = vi.fn<(error: Error) => void>();
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError,
      }),
    );

    await act(async () => Promise.resolve());
    expect(
      (latest as ReturnType<typeof useCrmMessages> | null)?.isLoadingMessages,
    ).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_001);
    });

    expect(
      (latest as ReturnType<typeof useCrmMessages> | null)?.isLoadingMessages,
    ).toBe(false);
    expect(setError.mock.calls[0]?.[0].message).toMatch(/hist.rico.*demorou/i);
  });

  it("does not reconcile legacy realtime echoes by message content alone", () => {
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
      [localEcho, serverMessage],
    );
  });

  it("buffers an early status and never regresses when SSE wins the HTTP race", async () => {
    const api = createApi();
    let resolveHttp: ((message: CrmMessage) => void) | undefined;
    vi.mocked(api.sendText).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveHttp = resolve;
        }),
    );
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    await act(async () => {
      await latest!.sendText("Corrida", { idempotencyKey: "request-1" });
      latest!.updateRealtimeMessageStatus({
        messageId: "server-1",
        status: "DELIVERED",
      });
      latest!.mergeRealtimeMessage(
        createMessage({
          clientRequestId: "request-1",
          content: "Corrida",
          direction: "OUTBOUND",
          id: "server-1",
          status: "SENT",
        }),
      );
    });

    expect(
      latest!.messages.filter((message) => message.content === "Corrida"),
    ).toEqual([
      expect.objectContaining({ id: "server-1", status: "DELIVERED" }),
    ]);

    await act(async () => {
      resolveHttp?.(
        createMessage({
          clientRequestId: "request-1",
          content: "Corrida",
          direction: "OUTBOUND",
          id: "server-1",
          status: "SENT",
        }),
      );
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(
        latest!.messages.find((message) => message.id === "server-1")?.status,
      ).toBe("DELIVERED"),
    );
  });

  it("retries a known text failure once with a fresh request identity", async () => {
    const api = createApi();
    vi.mocked(api.sendText)
      .mockRejectedValueOnce(
        Object.assign(new Error("known failure"), { status: 422 }),
      )
      .mockImplementationOnce(async (input) => {
        if (!input.idempotencyKey) throw new Error("missing idempotency key");
        return createMessage({
          clientRequestId: input.idempotencyKey,
          content: "Tentar novamente",
          direction: "OUTBOUND",
          id: "server-retry",
          status: "SENT",
        });
      });
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    await act(async () => {
      await latest!.sendText("Tentar novamente", {
        idempotencyKey: "failed-request",
      });
    });
    await waitFor(() => expect(latest!.messages.at(-1)?.status).toBe("FAILED"));
    act(() => {
      latest!.mergeRealtimeMessage(
        createMessage({
          clientRequestId: "failed-request",
          content: "Tentar novamente",
          direction: "OUTBOUND",
          id: "server-failed-attempt",
          status: "FAILED",
        }),
      );
    });
    const failed = latest!.messages.at(-1)!;

    await act(async () => {
      await expect(latest!.retryMessage(failed)).resolves.toBe(true);
    });

    expect(api.sendText).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.sendText).mock.calls[1]?.[0].idempotencyKey).not.toBe(
      "failed-request",
    );
    expect(
      latest!.messages.filter(
        (message) => message.content === "Tentar novamente",
      ),
    ).toEqual([
      expect.objectContaining({ id: "server-retry", status: "SENT" }),
    ]);
  });

  it("keeps a failed media file for retry and releases its object URL on success", async () => {
    const createObjectURL = vi.fn(() => "blob:retry-media");
    const revokeObjectURL = vi.fn();
    class TestUrl extends URL {
      static override createObjectURL = createObjectURL;
      static override revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal("URL", TestUrl);
    const readAsDataURL = vi.spyOn(FileReader.prototype, "readAsDataURL");
    const api = createApi();
    vi.mocked(api.sendMedia)
      .mockRejectedValueOnce(
        Object.assign(new Error("known upload failure"), { status: 422 }),
      )
      .mockImplementationOnce(async (input) => {
        if (!input.idempotencyKey) throw new Error("missing idempotency key");
        return createMessage({
          clientRequestId: input.idempotencyKey,
          content: "Imagem",
          direction: "OUTBOUND",
          id: "server-media",
          mediaUrl: "https://media.example/image.jpg",
          status: "SENT",
          type: "IMAGE",
        });
      });
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    const rendered = render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());
    const file = new File(["image"], "car.jpg", { type: "image/jpeg" });

    await act(async () => {
      await expect(
        latest!.sendMedia({ file, mediaType: "image" }),
      ).resolves.toBe(false);
    });
    await waitFor(() => expect(latest!.messages.at(-1)?.status).toBe("FAILED"));
    const failed = latest!.messages.at(-1)!;
    expect(failed.metadata).not.toHaveProperty("localUpload");
    expect(revokeObjectURL).not.toHaveBeenCalled();

    await act(async () => {
      await expect(latest!.retryMessage(failed)).resolves.toBe(true);
    });

    expect(api.sendMedia).toHaveBeenCalledTimes(2);
    expect(readAsDataURL).toHaveBeenCalledTimes(1);
    expect(latest!.messages.at(-1)).toMatchObject({
      id: "server-media",
      status: "SENT",
    });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:retry-media");
    rendered.unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("reconciles an indeterminate send without resending it", async () => {
    const api = createApi();
    vi.mocked(api.sendText).mockRejectedValueOnce(
      new AppApiError({
        code: "PROVIDER_RESULT_INDETERMINATE",
        message: "unknown result",
        status: 502,
      }),
    );
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    await act(async () => {
      await latest!.sendText("Incerta", { idempotencyKey: "request-unknown" });
    });
    await waitFor(() =>
      expect(latest!.messages.at(-1)?.status).toBe("INDETERMINATE"),
    );
    const uncertain = latest!.messages.at(-1)!;
    vi.mocked(api.listMessages).mockResolvedValueOnce([
      createMessage({
        clientRequestId: "request-unknown",
        content: "Incerta",
        direction: "OUTBOUND",
        id: "server-confirmed",
        status: "SENT",
      }),
    ]);

    await act(async () => {
      await expect(
        latest!.reconcileMessage({
          ...uncertain,
          status: "PROVIDER_UNKNOWN",
        }),
      ).resolves.toBe(true);
    });

    expect(api.sendText).toHaveBeenCalledTimes(1);
    expect(latest!.messages.at(-1)).toMatchObject({
      id: "server-confirmed",
      status: "SENT",
    });
  });

  it("resumes an indeterminate media send with the same idempotency key after reconciliation", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:uncertain-media"),
      revokeObjectURL: vi.fn(),
    });
    const api = createApi();
    vi.mocked(api.sendMedia)
      .mockRejectedValueOnce(
        new AppApiError({
          code: "CRM_MESSAGING_PROVIDER_ERROR",
          message: "unknown provider result",
          status: 502,
        }),
      )
      .mockImplementationOnce(async (input) => {
        if (!input.idempotencyKey) throw new Error("missing idempotency key");
        return createMessage({
          clientRequestId: input.idempotencyKey,
          content: "Audio",
          direction: "OUTBOUND",
          id: "server-resumed-media",
          mediaUrl: "https://media.example/audio.ogg",
          status: "SENT",
          type: "AUDIO",
        });
      });
    vi.mocked(api.listMessages).mockResolvedValueOnce([]);
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    await act(async () => {
      await latest!.sendMedia({
        file: new File(["audio"], "recording.webm", { type: "audio/webm" }),
        mediaType: "audio",
      });
    });
    await waitFor(() =>
      expect(latest!.messages.at(-1)?.status).toBe("INDETERMINATE"),
    );
    const uncertain = latest!.messages.at(-1)!;
    const firstKey = vi.mocked(api.sendMedia).mock.calls[0]?.[0].idempotencyKey;

    await act(async () => {
      await expect(latest!.reconcileMessage(uncertain)).resolves.toBe(true);
    });

    expect(api.sendMedia).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.sendMedia).mock.calls[1]?.[0].idempotencyKey).toBe(
      firstKey,
    );
    expect(latest!.messages.at(-1)).toMatchObject({
      id: "server-resumed-media",
      status: "SENT",
    });
  });

  it("accepts text immediately and drains requests in FIFO order", async () => {
    const api = createApi();
    let resolveFirst: ((message: CrmMessage) => void) | undefined;
    vi.mocked(api.sendText)
      .mockImplementationOnce(
        () =>
          new Promise<CrmMessage>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(
        createMessage({
          content: "Segunda",
          direction: "OUTBOUND",
          id: "server-second",
          status: "SENT",
        }),
      );
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    await act(async () => {
      await expect(latest!.sendText("Primeira")).resolves.toBe(true);
      await expect(latest!.sendText("Segunda")).resolves.toBe(true);
    });

    expect(api.sendText).toHaveBeenCalledTimes(1);
    expect(latest!.isSending).toBe(false);
    expect(latest!.hasPendingTextMessages).toBe(true);
    expect(latest!.isBlockingMutation).toBe(true);
    expect(
      latest!.messages.filter(
        (message) => message.content !== "Mensagem carregada",
      ),
    ).toHaveLength(2);

    await act(async () => {
      resolveFirst?.(
        createMessage({
          content: "Primeira",
          direction: "OUTBOUND",
          id: "server-first",
          status: "SENT",
        }),
      );
      await Promise.resolve();
    });

    await waitFor(() => expect(api.sendText).toHaveBeenCalledTimes(2));
    expect(
      vi.mocked(api.sendText).mock.calls.map(([input]) => input.text),
    ).toEqual(["Primeira", "Segunda"]);
    await waitFor(() => expect(latest!.hasPendingTextMessages).toBe(false));
  });

  it("keeps identical queued messages distinct by client identity", async () => {
    const api = createApi();
    let resolveFirst: ((message: CrmMessage) => void) | undefined;
    vi.mocked(api.sendText)
      .mockImplementationOnce(
        () =>
          new Promise<CrmMessage>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(
        createMessage({
          content: "Mesmo texto",
          direction: "OUTBOUND",
          id: "server-second",
          status: "SENT",
        }),
      );
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    await act(async () => {
      await latest!.sendText("Mesmo texto", { idempotencyKey: "key-one" });
      await latest!.sendText("Mesmo texto", { idempotencyKey: "key-two" });
    });

    const optimistic = latest!.messages.filter(
      (message) => message.content === "Mesmo texto",
    );
    expect(optimistic).toHaveLength(2);
    expect(new Set(optimistic.map((message) => message.clientId)).size).toBe(2);
    expect(
      optimistic.map((message) => message.metadata?.idempotencyKey),
    ).toEqual(["key-one", "key-two"]);

    await act(async () => {
      resolveFirst?.(
        createMessage({
          content: "Mesmo texto",
          direction: "OUTBOUND",
          id: "server-first",
          status: "SENT",
        }),
      );
      await Promise.resolve();
    });
    await waitFor(() => expect(api.sendText).toHaveBeenCalledTimes(2));
    expect(
      vi.mocked(api.sendText).mock.calls.map(([input]) => input.idempotencyKey),
    ).toEqual(["key-one", "key-two"]);
  });

  it("attributes optimistic messages to the authenticated user instead of the assignee", async () => {
    const api = createApi();
    vi.mocked(api.sendText).mockImplementation(
      () => new Promise<CrmMessage>(() => undefined),
    );
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession({
          assignedMember: {
            email: "assignee@example.com",
            id: 99,
            name: "Pessoa atribuída",
            role: "MEMBER",
          },
        }),
        api,
        currentUser: { id: "user-current", name: "  Usuário atual  " },
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    await act(async () => {
      await latest!.sendText("Mensagem do usuário");
    });

    expect(latest!.messages.at(-1)).toMatchObject({
      senderUser: { id: "user-current", name: "Usuário atual" },
    });
  });

  it("attributes structured optimistic messages to the authenticated user", async () => {
    const api = createApi();
    vi.mocked(api.sendLocation).mockImplementation(
      () => new Promise<CrmMessage>(() => undefined),
    );
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        currentUser: { id: "user-current", name: "Usuário atual" },
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    act(() => {
      void latest!.sendLocation({ latitude: -23.5, longitude: -46.6 });
    });

    await waitFor(() =>
      expect(latest!.messages.at(-1)).toMatchObject({
        senderUser: { id: "user-current", name: "Usuário atual" },
        type: "LOCATION",
      }),
    );
  });

  it("applies an early status when a structured HTTP response arrives", async () => {
    const api = createApi();
    let resolveLocation: ((message: CrmMessage) => void) | undefined;
    let requestId: string | undefined;
    vi.mocked(api.sendLocation).mockImplementation(
      (input) =>
        new Promise<CrmMessage>((resolve) => {
          requestId = input.idempotencyKey;
          resolveLocation = resolve;
        }),
    );
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    let sendPromise: Promise<boolean> | undefined;
    act(() => {
      sendPromise = latest!.sendLocation({
        latitude: -23.5,
        longitude: -46.6,
      });
    });
    await waitFor(() => expect(requestId).toBeTypeOf("string"));
    if (!requestId) throw new Error("missing structured request id");
    const clientRequestId = requestId;
    act(() => {
      latest!.updateRealtimeMessageStatus({
        messageId: "server-location",
        status: "DELIVERED",
      });
    });

    await act(async () => {
      resolveLocation?.(
        createMessage({
          clientRequestId,
          content: "Localização",
          direction: "OUTBOUND",
          id: "server-location",
          status: "SENT",
          type: "LOCATION",
        }),
      );
      await sendPromise;
    });

    expect(latest!.messages.at(-1)).toMatchObject({
      id: "server-location",
      status: "DELIVERED",
    });
  });

  it("drops queued text for an evicted conversation", async () => {
    const api = createApi();
    vi.mocked(api.sendText).mockImplementation(
      () => new Promise(() => undefined),
    );
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest).not.toBeNull());

    await act(async () => {
      await latest!.sendText("Em voo");
      await latest!.sendText("Na fila");
    });
    act(() => latest!.evictSessionMessages("session_1"));

    expect(latest!.messages).toEqual([]);
    expect(latest!.hasPendingTextMessages).toBe(false);
    expect(api.sendText).toHaveBeenCalledTimes(1);
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

  it("does not overlap polling requests for the active cycle", async () => {
    vi.useFakeTimers();
    const api = createApi();
    let resolveFirstLoad: ((messages: CrmMessage[]) => void) | undefined;
    vi.mocked(api.listMessages).mockImplementationOnce(
      () =>
        new Promise<CrmMessage[]>((resolve) => {
          resolveFirstLoad = resolve;
        }),
    );
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        setError: vi.fn(),
      }),
    );

    expect(api.listMessages).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(api.listMessages).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstLoad?.([]);
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(api.listMessages).toHaveBeenCalledTimes(2);
    const [sessionId, pagination, options] =
      vi.mocked(api.listMessages).mock.calls.at(-1) ?? [];
    expect(sessionId).toBe("session_1");
    expect(pagination).toEqual({ limit: 50, offset: 0 });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it("loads more than 50 messages and retries an older-page failure", async () => {
    const api = createApi();
    const allMessages = Array.from({ length: 60 }, (_, index) =>
      createMessage({
        content: `Mensagem ${index + 1}`,
        createdAt: new Date(
          Date.parse("2026-07-03T12:00:00.000Z") + index * 60_000,
        ).toISOString(),
        id: `message-${index + 1}`,
      }),
    ).reverse();
    let olderAttempts = 0;
    vi.mocked(api.listMessages).mockImplementation(async (_cycleId, query) => {
      const offset = query?.offset ?? 0;
      if (offset === 50 && olderAttempts++ === 0) {
        throw new Error("temporary history failure");
      }
      return allMessages.slice(offset, offset + (query?.limit ?? 50));
    });
    let latest: ReturnType<typeof useCrmMessages> | null = null;
    render(
      createElement(Harness, {
        activeSession: createSession(),
        api,
        mergeCycles: vi.fn(),
        onState: (state) => {
          latest = state;
        },
        setError: vi.fn(),
      }),
    );
    await waitFor(() => expect(latest?.messages).toHaveLength(50));
    expect(
      (latest as ReturnType<typeof useCrmMessages> | null)?.hasOlderMessages,
    ).toBe(true);

    await expect(latest!.loadOlderMessages()).resolves.toBe(false);
    await waitFor(() => expect(latest?.olderMessagesError).toBe(true));
    expect(
      (latest as ReturnType<typeof useCrmMessages> | null)?.hasOlderMessages,
    ).toBe(true);

    await expect(latest!.loadOlderMessages()).resolves.toBe(true);
    await waitFor(() => expect(latest?.messages).toHaveLength(60));
    const loadedMessages = (latest as ReturnType<typeof useCrmMessages> | null)
      ?.messages;
    expect(loadedMessages?.[0]?.id).toBe("message-1");
    expect(loadedMessages?.at(-1)?.id).toBe("message-60");
    expect(
      (latest as ReturnType<typeof useCrmMessages> | null)?.hasOlderMessages,
    ).toBe(false);
    expect(
      (latest as ReturnType<typeof useCrmMessages> | null)?.olderMessagesError,
    ).toBe(false);
    expect(api.listMessages).toHaveBeenLastCalledWith("session_1", {
      limit: 50,
      offset: 50,
    });
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
  canLoadMessages = true,
  canSendMessages = true,
  currentUser,
  mergeCycles,
  onState,
  setError,
}: {
  activeSession: CrmConversationCycle;
  api: CrmConversationApi;
  canLoadMessages?: boolean;
  canSendMessages?: boolean;
  currentUser?: { id: string; name: string };
  mergeCycles: (nextSessions: CrmConversationCycle[]) => void;
  onState?: (state: ReturnType<typeof useCrmMessages>) => void;
  setError: (error: Error) => void;
}) {
  const state = useCrmMessages({
    activeSession,
    activeCycleId: activeSession.id,
    api,
    canLoadMessages,
    canSendMessages,
    currentUser,
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

function createMessage(
  input: Partial<CrmMessage> & { clientRequestId?: string } = {},
): CrmMessage {
  return {
    content: "Ola",
    createdAt: "2026-07-03T12:00:00.000Z",
    direction: "INBOUND",
    id: "message-1",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    type: "TEXT",
    ...input,
  } as CrmMessage;
}
