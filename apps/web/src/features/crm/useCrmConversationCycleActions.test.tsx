// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmConversationCycle } from "./crmConversationTypes";
import { useCrmConversationCycleActions } from "./useCrmConversationCycleActions";

describe("useCrmConversationCycleActions", () => {
  it("passes a command id instead of exposing cycle revisions", async () => {
    const cycle = createSession(7);
    const api = createApi();
    const { result } = renderActions(api, cycle);

    await act(async () => {
      await result.current.actions.assignCycle(cycle.id, "user-1");
      await result.current.actions.closeCycle(cycle.id);
      await result.current.actions.toggleIntervention(cycle.id, true);
      await result.current.actions.markCycleRead(cycle.id);
      await result.current.actions.markCycleUnread(cycle.id);
    });

    const assignCall = vi.mocked(api.assignCycle).mock.calls[0];
    const closeCall = vi.mocked(api.closeCycle).mock.calls[0];
    const interveneCall = vi.mocked(api.updateCycleAttendance).mock.calls[0];
    const readCall = vi.mocked(api.markCycleRead).mock.calls[0];
    const unreadCall = vi.mocked(api.markCycleUnread).mock.calls[0];
    expect(assignCall?.[0]).toBe(cycle.id);
    expect(assignCall?.[1].assignedUserId).toBe("user-1");
    expect(assignCall?.[1].commandId).toEqual(expect.any(String));
    expect(closeCall?.[0]).toBe(cycle.id);
    expect(closeCall?.[1].commandId).toEqual(expect.any(String));
    expect(interveneCall?.[0]).toBe(cycle.id);
    expect(interveneCall?.[1].enabled).toBe(true);
    expect(interveneCall?.[1].commandId).toEqual(expect.any(String));
    expect(readCall?.[0]).toBe(cycle.id);
    expect(readCall?.[1].commandId).toEqual(expect.any(String));
    expect(unreadCall?.[0]).toBe(cycle.id);
    expect(unreadCall?.[1].commandId).toEqual(expect.any(String));
  });

  it("uses independent semantic commands for combined bulk mutations", async () => {
    const cycle = createSession(4);
    const api = createApi();
    const { result } = renderActions(api, cycle);

    await act(async () => {
      await result.current.actions.bulkApplySessions([cycle.id], {
        assignedUserId: "user-1",
        close: true,
        readState: "read",
      });
    });

    const assignCall = vi.mocked(api.assignCycle).mock.calls[0];
    const readCall = vi.mocked(api.markCycleRead).mock.calls[0];
    const conclusionCall = vi.mocked(api.concludeCycle).mock.calls[0];
    expect(assignCall?.[0]).toBe(cycle.id);
    expect(assignCall?.[1].assignedUserId).toBe("user-1");
    expect(assignCall?.[1].commandId).toEqual(expect.any(String));
    expect(readCall?.[0]).toBe(cycle.id);
    expect(readCall?.[1].commandId).toEqual(expect.any(String));
    expect(conclusionCall?.[0]).toBe(cycle.id);
    expect(conclusionCall?.[1].commandId).toEqual(expect.any(String));
    expect(conclusionCall?.[1].outcome).toBe("follow_up");
  });

  it("offers a real retry only for a transient failed cycle action", async () => {
    const cycle = createSession(3);
    const api = createApi();
    vi.mocked(api.closeCycle)
      .mockRejectedValueOnce(
        new AppApiError({
          code: "INTERNAL_SERVER_ERROR",
          message: "temporary failure",
          status: 503,
        }),
      )
      .mockResolvedValueOnce({ result: "applied", cycle: createSession(4) });
    const { result } = renderActions(api, cycle);

    await act(async () => {
      await result.current.actions.closeCycle(cycle.id);
    });
    expect(result.current.hasRetryableSessionAction).toBe(true);

    await act(async () => {
      await result.current.retryLastSessionAction();
    });

    expect(api.closeCycle).toHaveBeenCalledTimes(2);
    expect(result.current.hasRetryableSessionAction).toBe(false);
  });

  it("returns the same promise for a duplicate cycle action in flight", async () => {
    const cycle = createSession(3);
    const api = createApi();
    let resolveCommand!: (value: {
      result: "applied";
      cycle: CrmConversationCycle;
    }) => void;
    vi.mocked(api.markCycleRead).mockReturnValue(
      new Promise((resolve) => {
        resolveCommand = resolve;
      }),
    );
    const { result } = renderActions(api, cycle);

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.actions.markCycleRead(cycle.id);
      second = result.current.actions.markCycleRead(cycle.id);
    });

    expect(second).toBe(first);
    expect(api.markCycleRead).toHaveBeenCalledTimes(1);
    expect(result.current.pendingSessionActions).toContain(`${cycle.id}:read`);
    expect(result.current.isSessionActionPending(cycle.id, "read")).toBe(true);
    expect(result.current.isSessionActionPending(cycle.id, "assign")).toBe(
      false,
    );
    expect(result.current.isMutatingSession).toBe(false);

    await act(async () => {
      resolveCommand({ result: "applied", cycle: createSession(4) });
      await first;
    });
  });

  it("concludes through the semantic conclusion command", async () => {
    const cycle = createSession(3);
    const api = createApi();
    const { result } = renderActions(api, cycle);
    const input = {
      commandId: "11111111-1111-4111-8111-111111111111",
      outcome: "follow_up" as const,
      reminder: { dueAt: "2026-08-20T15:00:00.000Z" },
    };

    await act(async () => {
      await result.current.actions.concludeCycle(cycle.id, input);
    });

    expect(api.concludeCycle).toHaveBeenCalledWith(cycle.id, input);
  });

  it("runs archive, pin and delete as command-id based cycle actions", async () => {
    const cycle = createSession(3);
    const api = createApi();
    const { result } = renderActions(api, cycle);

    await act(async () => {
      await result.current.actions.archiveCycle(cycle.id);
      await result.current.actions.pinCycle(cycle.id);
      await result.current.actions.deleteCycle(cycle.id);
    });

    const assertCommandCall = (
      mock: CrmConversationApi["archiveCycle"],
    ): void => {
      const [calledCycleId, input] = vi.mocked(mock).mock.calls[0] ?? [];
      expect(calledCycleId).toBe(cycle.id);
      expect(typeof input?.commandId).toBe("string");
    };
    assertCommandCall(api.archiveCycle);
    assertCommandCall(api.pinCycle);
    assertCommandCall(api.deleteCycle);
  });

  it("blocks a second lifecycle action for the same cycle while one is in flight", async () => {
    const cycle = createSession(3);
    const api = createApi();
    let resolveArchive!: (value: {
      result: "applied";
      cycle: CrmConversationCycle;
    }) => void;
    vi.mocked(api.archiveCycle).mockReturnValue(
      new Promise((resolve) => {
        resolveArchive = resolve;
      }),
    );
    const { result } = renderActions(api, cycle);

    let blockedPin!: Promise<boolean>;
    let blockedDelete!: Promise<boolean>;
    act(() => {
      void result.current.actions.archiveCycle(cycle.id);
      blockedPin = result.current.actions.pinCycle(cycle.id);
      blockedDelete = result.current.actions.deleteCycle(cycle.id);
    });

    expect(api.archiveCycle).toHaveBeenCalledTimes(1);
    expect(api.pinCycle).not.toHaveBeenCalled();
    expect(api.deleteCycle).not.toHaveBeenCalled();
    await expect(blockedPin).resolves.toBe(false);
    await expect(blockedDelete).resolves.toBe(false);

    await act(async () => {
      resolveArchive({ result: "applied", cycle: createSession(4) });
    });

    await act(async () => {
      await result.current.actions.pinCycle(cycle.id);
    });
    expect(api.pinCycle).toHaveBeenCalledTimes(1);
  });
});

function renderActions(api: CrmConversationApi, cycle: CrmConversationCycle) {
  return renderHook(() =>
    useCrmConversationCycleActions({
      api,
      patchSession: vi.fn(),
      removeSession: vi.fn(),
      refreshSessions: vi.fn(async () => undefined),
      conversationCycles: [cycle],
      setError: vi.fn(),
    }),
  );
}

function createApi() {
  const result = {
    result: "applied" as const,
    cycle: createSession(4),
  };
  return {
    archiveCycle: vi.fn(async () => result),
    pinCycle: vi.fn(async () => result),
    deleteCycle: vi.fn(async () => result),
    assignCycle: vi.fn(async () => result),
    closeCycle: vi.fn(async () => result),
    concludeCycle: vi.fn(async () => result),
    updateCycleAttendance: vi.fn(async () => result),
    markCycleRead: vi.fn(async () => result),
    markCycleUnread: vi.fn(async () => result),
  } as unknown as CrmConversationApi;
}

function createSession(revision: number): CrmConversationCycle {
  return {
    customerDisplayName: "Cliente",
    channel: "whatsapp",
    id: "cycle-1",
    revision,
    status: "HUMAN_TAKEOVER",
  };
}
