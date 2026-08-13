// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";
import { useCrmWhatsappSessionActions } from "./useCrmWhatsappSessionActions";

describe("useCrmWhatsappSessionActions", () => {
  it("passes the selected session revision to every guarded mutation", async () => {
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

    expect(api.assignSession).toHaveBeenCalledWith(session.id, {
      assignedUserId: "user-1",
      expectedRevision: 7,
    });
    expect(api.closeSession).toHaveBeenCalledWith(session.id, {
      expectedRevision: 7,
    });
    expect(api.interveneSession).toHaveBeenCalledWith(session.id, {
      enabled: true,
      expectedRevision: 7,
    });
    expect(api.markSessionRead).toHaveBeenCalledWith(session.id, {
      expectedRevision: 7,
    });
    expect(api.markSessionUnread).toHaveBeenCalledWith(session.id, {
      expectedRevision: 7,
    });
  });

  it("chains returned revisions for combined bulk mutations", async () => {
    const session = createSession(4);
    const api = createApi();
    vi.mocked(api.assignSession).mockResolvedValue(createSession(5));
    vi.mocked(api.markSessionRead).mockResolvedValue(createSession(6));
    const { result } = renderActions(api, session);

    await act(async () => {
      await result.current.actions.bulkApplySessions([session.id], {
        assignedUserId: "user-1",
        close: true,
        readState: "read",
      });
    });

    expect(api.assignSession).toHaveBeenCalledWith(session.id, {
      assignedUserId: "user-1",
      expectedRevision: 4,
    });
    expect(api.markSessionRead).toHaveBeenCalledWith(session.id, {
      expectedRevision: 5,
    });
    expect(api.closeSession).toHaveBeenCalledWith(session.id, {
      expectedRevision: 6,
    });
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
      .mockResolvedValueOnce(createSession(4));
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
  return {
    assignSession: vi.fn(async () => null),
    closeSession: vi.fn(async () => null),
    interveneSession: vi.fn(async () => null),
    markSessionRead: vi.fn(async () => null),
    markSessionUnread: vi.fn(async () => null),
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
