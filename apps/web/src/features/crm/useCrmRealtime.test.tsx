// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
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
  afterEach(cleanup);

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

  it("reports connected only after the stream reconciliation succeeds", async () => {
    let onStreamStatus: ((status: CrmRealtimeStatus) => void) | undefined;
    let finishReconciliation: (() => void) | undefined;
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
    const refreshSessions = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishReconciliation = resolve;
        }),
    );
    render(
      <Harness
        api={api}
        mergeCycles={vi.fn()}
        onStatus={onStatus}
        refreshConnections={refreshConnections}
        refreshSessionCounts={refreshSessionCounts}
        refreshSessions={refreshSessions}
      />,
    );
    await waitFor(() => expect(onStreamStatus).toBeDefined());

    act(() => onStreamStatus?.("connected"));

    expect(onStatus).not.toHaveBeenCalledWith("connected");
    expect(refreshConnections).toHaveBeenCalledTimes(1);
    expect(refreshSessions).toHaveBeenCalledWith({
      preserveLocalOnly: true,
      snapshotKind: "reconciled",
    });
    expect(refreshSessionCounts).toHaveBeenCalledTimes(1);

    finishReconciliation?.();
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith("connected"));
    expect(api.subscribeEvents).toHaveBeenCalledTimes(1);
  });

  it.each(["status", "error"] as const)(
    "does not publish stale connected after a later transport %s",
    async (failureSignal) => {
      let onStreamError: ((error: Error) => void) | undefined;
      let onStreamStatus: ((status: CrmRealtimeStatus) => void) | undefined;
      let finishReconciliation: (() => void) | undefined;
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
      const refreshSessions = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishReconciliation = resolve;
          }),
      );
      render(
        <Harness
          api={api}
          mergeCycles={vi.fn()}
          onStatus={onStatus}
          refreshSessionCounts={vi.fn(async () => undefined)}
          refreshSessions={refreshSessions}
        />,
      );
      await waitFor(() => expect(onStreamStatus).toBeDefined());

      act(() => onStreamStatus?.("connected"));
      expect(refreshSessions).toHaveBeenCalledTimes(1);

      act(() => {
        if (failureSignal === "status") {
          onStreamStatus?.("degraded");
          return;
        }
        onStreamError?.(new Error("stream failed"));
      });
      expect(onStatus).toHaveBeenLastCalledWith("degraded");

      await act(async () => {
        finishReconciliation?.();
        await Promise.resolve();
      });

      expect(onStatus).not.toHaveBeenCalledWith("connected");
      expect(onStatus).toHaveBeenLastCalledWith("degraded");
    },
  );
});

function Harness({
  api,
  canAccessSessionSnapshot,
  connectionId = "connection-1",
  connectionsError = null,
  mergeCycles,
  onStatus,
  refreshConnections = vi.fn(async () => undefined),
  refreshSessionCounts,
  refreshSessions = vi.fn(async () => undefined),
  removeSession = vi.fn(),
}: {
  api: CrmConversationApi;
  canAccessSessionSnapshot?: (cycle: CrmConversationCycle) => boolean;
  connectionId?: string | null;
  connectionsError?: Error | null;
  mergeCycles: (conversationCycles: CrmConversationCycle[]) => void;
  onStatus?: (status: CrmRealtimeStatus) => void;
  refreshConnections?: () => Promise<void>;
  refreshSessionCounts: () => Promise<void>;
  refreshSessions?: () => Promise<void>;
  removeSession?: (cycleId: CrmConversationCycle["id"]) => void;
}) {
  useCrmRealtime({
    activeCycleId: "cycle-1",
    api,
    ...(canAccessSessionSnapshot ? { canAccessSessionSnapshot } : {}),
    connectionId,
    connectionsError,
    mergeRealtimeMessage: vi.fn(),
    mergeCycles,
    removeSession,
    ...(onStatus ? { onStatus } : {}),
    refreshConnections,
    refreshSessionCounts,
    refreshSessions,
    updateRealtimeMessageStatus: vi.fn(),
  });
  return null;
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
