// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";
import { useCrmWhatsappSessionActions } from "./useCrmWhatsappSessionActions";

describe("useCrmWhatsappSessionActions", () => {
  it("passes a command id instead of exposing session revisions", async () => {
    const session = createSession(7);
    const api = createApi();
    const { result } = renderActions(api, session);

    await act(async () => {
      await result.current.actions.assignSession(session.id, "user-1");
      await result.current.actions.closeSession(session.id);
      await result.current.actions.toggleIntervention(session.id, true);
      await result.current.actions.markSessionRead(session.id);
      await result.current.actions.markSessionUnread(session.id);
    });

    const assignCall = vi.mocked(api.assignSession).mock.calls[0];
    const closeCall = vi.mocked(api.closeSession).mock.calls[0];
    const interveneCall = vi.mocked(api.interveneSession).mock.calls[0];
    const readCall = vi.mocked(api.markSessionRead).mock.calls[0];
    const unreadCall = vi.mocked(api.markSessionUnread).mock.calls[0];
    expect(assignCall?.[0]).toBe(session.id);
    expect(assignCall?.[1].assignedUserId).toBe("user-1");
    expect(assignCall?.[1].commandId).toEqual(expect.any(String));
    expect(closeCall?.[0]).toBe(session.id);
    expect(closeCall?.[1].commandId).toEqual(expect.any(String));
    expect(interveneCall?.[0]).toBe(session.id);
    expect(interveneCall?.[1].enabled).toBe(true);
    expect(interveneCall?.[1].commandId).toEqual(expect.any(String));
    expect(readCall?.[0]).toBe(session.id);
    expect(readCall?.[1].commandId).toEqual(expect.any(String));
    expect(unreadCall?.[0]).toBe(session.id);
    expect(unreadCall?.[1].commandId).toEqual(expect.any(String));
  });

  it("uses independent semantic commands for combined bulk mutations", async () => {
    const session = createSession(4);
    const api = createApi();
    const { result } = renderActions(api, session);

    await act(async () => {
      await result.current.actions.bulkApplySessions([session.id], {
        assignedUserId: "user-1",
        close: true,
        readState: "read",
      });
    });

    const assignCall = vi.mocked(api.assignSession).mock.calls[0];
    const readCall = vi.mocked(api.markSessionRead).mock.calls[0];
    const conclusionCall = vi.mocked(api.concludeSession).mock.calls[0];
    expect(assignCall?.[0]).toBe(session.id);
    expect(assignCall?.[1].assignedUserId).toBe("user-1");
    expect(assignCall?.[1].commandId).toEqual(expect.any(String));
    expect(readCall?.[0]).toBe(session.id);
    expect(readCall?.[1].commandId).toEqual(expect.any(String));
    expect(conclusionCall?.[0]).toBe(session.id);
    expect(conclusionCall?.[1].commandId).toEqual(expect.any(String));
    expect(conclusionCall?.[1].outcome).toBe("follow_up");
  });

  it("offers a real retry only for a transient failed session action", async () => {
    const session = createSession(3);
    const api = createApi();
    vi.mocked(api.closeSession)
      .mockRejectedValueOnce(
        new AppApiError({
          code: "INTERNAL_SERVER_ERROR",
          message: "temporary failure",
          status: 503,
        }),
      )
      .mockResolvedValueOnce({ result: "applied", session: createSession(4) });
    const { result } = renderActions(api, session);

    await act(async () => {
      await result.current.actions.closeSession(session.id);
    });
    expect(result.current.hasRetryableSessionAction).toBe(true);

    await act(async () => {
      await result.current.retryLastSessionAction();
    });

    expect(api.closeSession).toHaveBeenCalledTimes(2);
    expect(result.current.hasRetryableSessionAction).toBe(false);
  });

  it("returns the same promise for a duplicate session action in flight", async () => {
    const session = createSession(3);
    const api = createApi();
    let resolveCommand!: (value: {
      result: "applied";
      session: CrmWhatsappSession;
    }) => void;
    vi.mocked(api.markSessionRead).mockReturnValue(
      new Promise((resolve) => {
        resolveCommand = resolve;
      }),
    );
    const { result } = renderActions(api, session);

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.actions.markSessionRead(session.id);
      second = result.current.actions.markSessionRead(session.id);
    });

    expect(second).toBe(first);
    expect(api.markSessionRead).toHaveBeenCalledTimes(1);
    expect(result.current.pendingSessionActions).toContain(
      `${session.id}:read`,
    );
    expect(result.current.isSessionActionPending(session.id, "read")).toBe(
      true,
    );
    expect(result.current.isSessionActionPending(session.id, "assign")).toBe(
      false,
    );
    expect(result.current.isMutatingSession).toBe(false);

    await act(async () => {
      resolveCommand({ result: "applied", session: createSession(4) });
      await first;
    });
  });

  it("concludes through the semantic conclusion command", async () => {
    const session = createSession(3);
    const api = createApi();
    const { result } = renderActions(api, session);
    const input = {
      commandId: "11111111-1111-4111-8111-111111111111",
      outcome: "follow_up" as const,
      reminder: { dueAt: "2026-08-20T15:00:00.000Z" },
    };

    await act(async () => {
      await result.current.actions.concludeSession(session.id, input);
    });

    expect(api.concludeSession).toHaveBeenCalledWith(session.id, input);
  });
});

function renderActions(api: CrmWhatsappApi, session: CrmWhatsappSession) {
  return renderHook(() =>
    useCrmWhatsappSessionActions({
      api,
      patchSession: vi.fn(),
      refreshSessions: vi.fn(async () => undefined),
      sessions: [session],
      setError: vi.fn(),
    }),
  );
}

function createApi() {
  const result = {
    result: "applied" as const,
    session: createSession(4),
  };
  return {
    assignSession: vi.fn(async () => result),
    closeSession: vi.fn(async () => result),
    concludeSession: vi.fn(async () => result),
    interveneSession: vi.fn(async () => result),
    markSessionRead: vi.fn(async () => result),
    markSessionUnread: vi.fn(async () => result),
  } as unknown as CrmWhatsappApi;
}

function createSession(revision: number): CrmWhatsappSession {
  return {
    buyerName: "Cliente",
    channel: "WHATSAPP",
    id: "session-1",
    revision,
    status: "HUMAN_TAKEOVER",
    uuid: "session-1",
  };
}
