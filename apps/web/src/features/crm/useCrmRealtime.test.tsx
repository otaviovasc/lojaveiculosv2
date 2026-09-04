// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmConversationApi } from "./crmConversationApi";
import type {
  CrmRealtimeEvent,
  CrmRealtimeStatus,
  CrmConversationCycle,
} from "./crmConversationTypes";
import { useCrmRealtime } from "./useCrmRealtime";

describe("useCrmRealtime", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows typing only for the active contact and expires it after a short TTL", () => {
    vi.useFakeTimers();
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;

    render(
      <Harness
        activeCustomerPhone="+55 (11) 99999-9999"
        api={api}
        mergeCycles={vi.fn()}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );

    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        cycleId: "cycle-1",
        payload: { phone: "5511999999999", state: "composing" },
        type: "presence",
      });
    });
    expect(screen.getByTestId("contact-presence").textContent).toBe("typing");

    act(() => {
      vi.advanceTimersByTime(5_999);
    });
    expect(screen.getByTestId("contact-presence").textContent).toBe("typing");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTestId("contact-presence").textContent).toBe("none");
  });

  it("ignores ambiguous and other-contact presence, and clears explicit pauses", () => {
    vi.useFakeTimers();
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    render(
      <Harness
        activeCustomerPhone="5511999999999"
        api={api}
        mergeCycles={vi.fn()}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );

    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        cycleId: "cycle-1",
        payload: { received: true },
        type: "presence",
      });
      onEvent?.({
        connectionId: "connection-1",
        cycleId: "cycle-other",
        payload: { phone: "5511888888888", state: "composing" },
        type: "presence",
      });
    });
    expect(screen.getByTestId("contact-presence").textContent).toBe("none");

    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        cycleId: "cycle-1",
        payload: { phone: "5511999999999", state: "available" },
        type: "presence",
      });
    });
    expect(screen.getByTestId("contact-presence").textContent).toBe("online");
    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        cycleId: "cycle-1",
        payload: { phone: "5511999999999", state: "paused" },
        type: "presence",
      });
    });
    expect(screen.getByTestId("contact-presence").textContent).toBe("none");

    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        cycleId: "cycle-1",
        payload: { phone: "5511999999999", state: "available" },
        type: "presence",
      });
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId("contact-presence").textContent).toBe("none");
  });

  it("clears presence on reconnect and active-cycle changes", () => {
    vi.useFakeTimers();
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    let onRealtimeStatus: ((status: CrmRealtimeStatus) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          onRealtimeStatus = input.onStatus;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const rendered = render(
      <Harness
        activeCustomerPhone="5511999999999"
        api={api}
        mergeCycles={vi.fn()}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    const showTyping = () => {
      onEvent?.({
        connectionId: "connection-1",
        cycleId: "cycle-1",
        payload: { phone: "5511999999999", state: "composing" },
        type: "presence",
      });
    };

    act(showTyping);
    act(() => onRealtimeStatus?.("connecting"));
    expect(screen.getByTestId("contact-presence").textContent).toBe("none");

    act(showTyping);
    rendered.rerender(
      <Harness
        activeCycleId="cycle-2"
        activeCustomerPhone="5511888888888"
        api={api}
        mergeCycles={vi.fn()}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    expect(screen.getByTestId("contact-presence").textContent).toBe("none");
  });

  it("merges the full cycle and refreshes attendance counters immediately", async () => {
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const mergeCycles = vi.fn();
    const refreshSessionCounts = vi.fn(async () => undefined);

    render(
      <Harness
        api={api}
        mergeCycles={mergeCycles}
        refreshSessionCounts={refreshSessionCounts}
      />,
    );
    await waitFor(() => expect(onEvent).toBeDefined());
    const cycle = createSession();

    onEvent?.({ connectionId: "connection-1", cycle, type: "cycle" });

    expect(mergeCycles).toHaveBeenCalledWith([cycle], {
      preserveLocalOnly: true,
      snapshotKind: "realtime",
    });
    expect(refreshSessionCounts).toHaveBeenCalledTimes(1);
  });

  it("merges an inbound message and its list snapshot immediately", async () => {
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const mergeCycles = vi.fn();
    const mergeRealtimeMessage = vi.fn();
    const refreshSessionCounts = vi.fn(async () => undefined);
    const cycle = createSession();
    const message = {
      content: "Olá",
      createdAt: "2026-08-20T12:00:00.000Z",
      direction: "INBOUND" as const,
      id: "message-1",
      senderType: "CUSTOMER" as const,
      status: "DELIVERED" as const,
      type: "TEXT" as const,
    };

    render(
      <Harness
        api={api}
        mergeCycles={mergeCycles}
        mergeRealtimeMessage={mergeRealtimeMessage}
        refreshSessionCounts={refreshSessionCounts}
      />,
    );
    await waitFor(() => expect(onEvent).toBeDefined());

    onEvent?.({
      connectionId: "connection-1",
      cycle,
      message,
      type: "message",
    });

    expect(mergeCycles).toHaveBeenCalledWith([cycle], {
      preserveLocalOnly: true,
      snapshotKind: "realtime",
    });
    expect(mergeRealtimeMessage).toHaveBeenCalledWith(message);
    expect(refreshSessionCounts).toHaveBeenCalledTimes(1);
  });

  it("removes a cycle tombstone instead of merging it for a revoked user", async () => {
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const mergeCycles = vi.fn();
    const removeSession = vi.fn();
    render(
      <Harness
        api={api}
        canAccessSessionSnapshot={() => false}
        mergeCycles={mergeCycles}
        removeSession={removeSession}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    await waitFor(() => expect(onEvent).toBeDefined());
    const cycle = createSession({ assignedUserId: "user-other" });

    onEvent?.({ connectionId: "connection-1", cycle, type: "cycle" });

    expect(removeSession).toHaveBeenCalledWith(cycle.id);
    expect(mergeCycles).not.toHaveBeenCalled();
  });

  it("keeps the subscription alive across callback changes and uses the latest handlers", async () => {
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    const unsubscribe = vi.fn();
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return unsubscribe;
        },
      ),
    } as unknown as CrmConversationApi;
    const firstMergeSessions = vi.fn();
    const firstRefreshSessionCounts = vi.fn(async () => undefined);
    const secondMergeSessions = vi.fn();
    const secondRefreshSessionCounts = vi.fn(async () => undefined);
    const rendered = render(
      <Harness
        api={api}
        mergeCycles={firstMergeSessions}
        refreshSessionCounts={firstRefreshSessionCounts}
      />,
    );
    await waitFor(() => expect(onEvent).toBeDefined());

    rendered.rerender(
      <Harness
        api={api}
        mergeCycles={secondMergeSessions}
        refreshSessionCounts={secondRefreshSessionCounts}
      />,
    );

    expect(api.subscribeEvents).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();

    const cycle = createSession();
    onEvent?.({ connectionId: "connection-1", cycle, type: "cycle" });

    expect(firstMergeSessions).not.toHaveBeenCalled();
    expect(firstRefreshSessionCounts).not.toHaveBeenCalled();
    expect(secondMergeSessions).toHaveBeenCalledWith([cycle], {
      preserveLocalOnly: true,
      snapshotKind: "realtime",
    });
    expect(secondRefreshSessionCounts).toHaveBeenCalledTimes(1);

    rendered.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    onEvent?.({ connectionId: "connection-1", cycle, type: "cycle" });
    expect(secondMergeSessions).toHaveBeenCalledTimes(1);
    expect(secondRefreshSessionCounts).toHaveBeenCalledTimes(1);
  });

  it("does not add lifecycle churn on Strict Mode rerenders", async () => {
    const unsubscribe = vi.fn();
    const api = {
      subscribeEvents: vi.fn(() => unsubscribe),
    } as unknown as CrmConversationApi;
    const rendered = render(
      <StrictMode>
        <Harness
          api={api}
          mergeCycles={vi.fn()}
          refreshSessionCounts={vi.fn(async () => undefined)}
        />
      </StrictMode>,
    );
    await waitFor(() => expect(api.subscribeEvents).toHaveBeenCalledTimes(2));
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    rendered.rerender(
      <StrictMode>
        <Harness
          api={api}
          mergeCycles={vi.fn()}
          refreshSessionCounts={vi.fn(async () => undefined)}
        />
      </StrictMode>,
    );

    expect(api.subscribeEvents).toHaveBeenCalledTimes(2);
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    rendered.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("reacts only when the connections error crosses the availability boundary", async () => {
    const unsubscribe = vi.fn();
    const api = {
      subscribeEvents: vi.fn(() => unsubscribe),
    } as unknown as CrmConversationApi;
    const onStatus = vi.fn();
    const rendered = render(
      <Harness
        api={api}
        connectionsError={new Error("first")}
        mergeCycles={vi.fn()}
        onStatus={onStatus}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith("offline"));

    rendered.rerender(
      <Harness
        api={api}
        connectionsError={new Error("second")}
        mergeCycles={vi.fn()}
        onStatus={onStatus}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );

    expect(onStatus).toHaveBeenCalledTimes(1);
    expect(api.subscribeEvents).not.toHaveBeenCalled();

    rendered.rerender(
      <Harness
        api={api}
        connectionsError={null}
        mergeCycles={vi.fn()}
        onStatus={onStatus}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    expect(api.subscribeEvents).toHaveBeenCalledTimes(1);

    rendered.rerender(
      <Harness
        api={api}
        connectionsError={new Error("third")}
        mergeCycles={vi.fn()}
        onStatus={onStatus}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenLastCalledWith("offline");
  });

  it("restarts the subscription when its connection or API boundary changes", async () => {
    const firstUnsubscribe = vi.fn();
    const secondUnsubscribe = vi.fn();
    const firstApi = {
      subscribeEvents: vi.fn(() => firstUnsubscribe),
    } as unknown as CrmConversationApi;
    const secondApi = {
      subscribeEvents: vi.fn(() => secondUnsubscribe),
    } as unknown as CrmConversationApi;
    const rendered = render(
      <Harness
        api={firstApi}
        connectionId="connection-1"
        mergeCycles={vi.fn()}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    await waitFor(() =>
      expect(firstApi.subscribeEvents).toHaveBeenCalledTimes(1),
    );

    rendered.rerender(
      <Harness
        api={firstApi}
        connectionId="connection-2"
        mergeCycles={vi.fn()}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    expect(firstApi.subscribeEvents).toHaveBeenCalledTimes(2);

    rendered.rerender(
      <Harness
        api={secondApi}
        connectionId="connection-2"
        mergeCycles={vi.fn()}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    expect(firstUnsubscribe).toHaveBeenCalledTimes(2);
    expect(secondApi.subscribeEvents).toHaveBeenCalledTimes(1);

    rendered.unmount();
    expect(secondUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("reports connected without reloading the CRM when the stream opens", async () => {
    let onStreamStatus: ((status: CrmRealtimeStatus) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onStreamStatus = input.onStatus;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const onStatus = vi.fn();
    const refreshConnections = vi.fn(async () => undefined);
    const refreshSessionCounts = vi.fn(async () => undefined);
    render(
      <Harness
        api={api}
        mergeCycles={vi.fn()}
        onStatus={onStatus}
        refreshConnections={refreshConnections}
        refreshSessionCounts={refreshSessionCounts}
      />,
    );
    expect(onStreamStatus).toBeDefined();

    act(() => onStreamStatus?.("connected"));

    expect(onStatus).toHaveBeenLastCalledWith("connected");
    expect(refreshConnections).not.toHaveBeenCalled();
    expect(refreshSessionCounts).not.toHaveBeenCalled();
    expect(api.subscribeEvents).toHaveBeenCalledTimes(1);
  });

  it("reports reconnecting during the grace period and recovers without becoming unavailable", async () => {
    vi.useFakeTimers();
    let onStreamError: ((error: Error) => void) | undefined;
    let onStreamStatus: ((status: CrmRealtimeStatus) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onStreamError = input.onError;
          onStreamStatus = input.onStatus;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const onStatus = vi.fn();
    const reconcileSessions = vi.fn(async () => undefined);
    render(
      <Harness
        api={api}
        mergeCycles={vi.fn()}
        onStatus={onStatus}
        reconcileSessions={reconcileSessions}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    expect(onStreamStatus).toBeDefined();

    act(() => onStreamStatus?.("connected"));
    act(() => {
      onStreamStatus?.("degraded");
      onStreamError?.(new Error("stream failed"));
      onStreamStatus?.("connecting");
    });

    expect(onStatus).toHaveBeenLastCalledWith("connecting");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_999);
    });
    expect(onStatus).toHaveBeenLastCalledWith("connecting");

    act(() => onStreamStatus?.("connected"));
    expect(onStatus).toHaveBeenLastCalledWith("connected");
    expect(reconcileSessions).toHaveBeenCalledOnce();
  });

  it.each(["status", "error"] as const)(
    "publishes reconnecting but not unavailable immediately after transport %s",
    (failureSignal) => {
      let onStreamError: ((error: Error) => void) | undefined;
      let onStreamStatus: ((status: CrmRealtimeStatus) => void) | undefined;
      const api = {
        subscribeEvents: vi.fn(
          (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
            onStreamError = input.onError;
            onStreamStatus = input.onStatus;
            return vi.fn();
          },
        ),
      } as unknown as CrmConversationApi;
      const onStatus = vi.fn();
      render(
        <Harness
          api={api}
          mergeCycles={vi.fn()}
          onStatus={onStatus}
          refreshSessionCounts={vi.fn(async () => undefined)}
        />,
      );
      expect(onStreamStatus).toBeDefined();

      act(() => onStreamStatus?.("connected"));
      act(() => {
        if (failureSignal === "status") {
          onStreamStatus?.("degraded");
          return;
        }
        onStreamError?.(new Error("stream failed"));
      });
      expect(onStatus).toHaveBeenLastCalledWith("connecting");
      expect(onStatus).not.toHaveBeenCalledWith("degraded");
    },
  );

  it("publishes unavailable only after the established reconnect grace period", async () => {
    vi.useFakeTimers();
    let onStreamStatus: ((status: CrmRealtimeStatus) => void) | undefined;
    const onStatus = vi.fn();
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onStreamStatus = input.onStatus;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    render(
      <Harness
        api={api}
        mergeCycles={vi.fn()}
        onStatus={onStatus}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );

    act(() => onStreamStatus?.("connected"));
    act(() => onStreamStatus?.("degraded"));
    expect(onStatus).toHaveBeenLastCalledWith("connecting");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(onStatus).toHaveBeenLastCalledWith("degraded");
  });

  it("applies the same grace period while the initial stream is connecting", async () => {
    vi.useFakeTimers();
    let onStreamError: ((error: Error) => void) | undefined;
    const onStatus = vi.fn();
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onStreamError = input.onError;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    render(
      <Harness
        api={api}
        mergeCycles={vi.fn()}
        onStatus={onStatus}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );

    act(() => onStreamError?.(new Error("ticket failed")));
    expect(onStatus).toHaveBeenLastCalledWith("connecting");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(onStatus).toHaveBeenLastCalledWith("degraded");
  });

  it("drops events from other connections while subscribed per-connection", async () => {
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const mergeCycles = vi.fn();
    render(
      <Harness
        api={api}
        connectionId="connection-1"
        mergeCycles={mergeCycles}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    await waitFor(() => expect(onEvent).toBeDefined());

    act(() => {
      onEvent?.({
        connectionId: "connection-2",
        cycle: createSession(),
        type: "cycle",
      });
    });
    expect(mergeCycles).not.toHaveBeenCalled();

    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        cycle: createSession(),
        type: "cycle",
      });
    });
    expect(mergeCycles).toHaveBeenCalledTimes(1);
    expect(api.subscribeEvents).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: "connection-1" }),
    );
  });

  it("subscribes store-wide without demuxing when no connection is selected", async () => {
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const mergeCycles = vi.fn();
    const refreshConnections = vi.fn(async () => undefined);
    render(
      <Harness
        api={api}
        mergeCycles={mergeCycles}
        refreshConnections={refreshConnections}
        refreshSessionCounts={vi.fn(async () => undefined)}
        storeWide
      />,
    );
    await waitFor(() => expect(onEvent).toBeDefined());
    expect(api.subscribeEvents).toHaveBeenCalledTimes(1);
    expect(
      (api.subscribeEvents as ReturnType<typeof vi.fn>).mock.calls[0]?.[0],
    ).not.toHaveProperty("connectionId");

    act(() => {
      onEvent?.({
        connectionId: "connection-2",
        cycle: createSession(),
        type: "cycle",
      });
      onEvent?.({
        connectionId: "connection-9",
        phone: null,
        status: "connected",
        type: "connection_status",
      });
    });

    expect(mergeCycles).toHaveBeenCalledTimes(1);
    expect(refreshConnections).toHaveBeenCalledTimes(1);
  });

  it("resubscribes when switching between store-wide and a specific connection", async () => {
    const unsubscribe = vi.fn();
    const api = {
      subscribeEvents: vi.fn(() => unsubscribe),
    } as unknown as CrmConversationApi;
    const rendered = render(
      <Harness
        api={api}
        mergeCycles={vi.fn()}
        refreshSessionCounts={vi.fn(async () => undefined)}
        storeWide
      />,
    );
    await waitFor(() => expect(api.subscribeEvents).toHaveBeenCalledTimes(1));

    rendered.rerender(
      <Harness
        api={api}
        connectionId="connection-1"
        mergeCycles={vi.fn()}
        refreshSessionCounts={vi.fn(async () => undefined)}
      />,
    );
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(api.subscribeEvents).toHaveBeenCalledTimes(2);
    expect(api.subscribeEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ connectionId: "connection-1" }),
    );
  });
});

function Harness({
  activeConversationConnectionId = "connection-1",
  activeCycleId = "cycle-1",
  activeCustomerPhone,
  api,
  canAccessSessionSnapshot,
  connectionId = "connection-1",
  connectionsError = null,
  mergeCycles,
  mergeRealtimeMessage = vi.fn(),
  onStatus,
  reconcileSessions,
  refreshConnections = vi.fn(async () => undefined),
  refreshSessionCounts,
  removeSession = vi.fn(),
  storeWide = false,
}: {
  activeConversationConnectionId?: string | null;
  activeCycleId?: string;
  activeCustomerPhone?: string | null;
  api: CrmConversationApi;
  canAccessSessionSnapshot?: (cycle: CrmConversationCycle) => boolean;
  connectionId?: string | null;
  connectionsError?: Error | null;
  mergeCycles: (conversationCycles: CrmConversationCycle[]) => void;
  mergeRealtimeMessage?: Parameters<
    typeof useCrmRealtime
  >[0]["mergeRealtimeMessage"];
  onStatus?: (status: CrmRealtimeStatus) => void;
  reconcileSessions?: () => Promise<unknown>;
  refreshConnections?: () => Promise<void>;
  refreshSessionCounts: () => Promise<void>;
  removeSession?: (cycleId: CrmConversationCycle["id"]) => void;
  storeWide?: boolean;
}) {
  const { contactPresence } = useCrmRealtime({
    activeConversationConnectionId,
    activeCycleId,
    ...(activeCustomerPhone !== undefined ? { activeCustomerPhone } : {}),
    api,
    ...(canAccessSessionSnapshot ? { canAccessSessionSnapshot } : {}),
    connectionId: storeWide ? undefined : connectionId,
    connectionsError,
    mergeRealtimeMessage,
    mergeCycles,
    removeSession,
    ...(onStatus ? { onStatus } : {}),
    ...(reconcileSessions ? { reconcileSessions } : {}),
    refreshConnections,
    refreshSessionCounts,
    updateRealtimeMessageStatus: vi.fn(),
  });
  return (
    <output data-testid="contact-presence">{contactPresence ?? "none"}</output>
  );
}

function createSession(
  input: Partial<CrmConversationCycle> = {},
): CrmConversationCycle {
  return {
    channel: "whatsapp",
    humanAttendanceChangedAt: "2026-08-10T12:00:00.000Z",
    humanAttendanceState: "WAITING_HUMAN",
    humanAttendanceStateVersion: 1,
    humanHandlingStartedAt: null,
    id: "cycle-1",
    interventionId: "intervention-1",
    status: "HUMAN_TAKEOVER",
    ...input,
  };
}
