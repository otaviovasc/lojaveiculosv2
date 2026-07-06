import { useCallback, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappAddSessionTagInput,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

type UseCrmWhatsappSessionActionsOptions = {
  api: CrmWhatsappApi;
  patchSession: (nextSession: CrmWhatsappSession) => void;
  refreshSessions: (options?: { preserveLocalOnly?: boolean }) => Promise<void>;
  sessions: CrmWhatsappSession[];
  setError: (error: Error | null) => void;
};

export function useCrmWhatsappSessionActions({
  api,
  patchSession,
  refreshSessions,
  sessions,
  setError,
}: UseCrmWhatsappSessionActionsOptions) {
  const [isMutatingSession, setIsMutatingSession] = useState(false);

  const runSessionAction = useCallback(
    async (
      action: () => Promise<CrmWhatsappSession | null>,
      fallback: CrmWhatsappSession,
    ) => {
      setError(null);
      setIsMutatingSession(true);
      try {
        const updatedSession = await action();
        patchSession(updatedSession ?? fallback);
        await refreshSessions({ preserveLocalOnly: true });
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      } finally {
        setIsMutatingSession(false);
      }
    },
    [patchSession, refreshSessions, setError],
  );

  const runBulkSessionAction = useCallback(
    async (action: () => Promise<unknown>) => {
      setError(null);
      setIsMutatingSession(true);
      try {
        await action();
        await refreshSessions({ preserveLocalOnly: true });
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      } finally {
        setIsMutatingSession(false);
      }
    },
    [refreshSessions, setError],
  );

  const assignSession = useCallback(
    async (sessionId: CrmWhatsappSessionId, assignedUserId: string | null) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(
        () => api.assignSession(sessionId, { assignedUserId }),
        {
          ...session,
          assignedMember: assignedUserId
            ? (session.assignedMember ?? null)
            : null,
          assignedUserId: assignedUserId,
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const closeSession = useCallback(
    async (sessionId: CrmWhatsappSessionId) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(() => api.closeSession(sessionId), {
        ...session,
        status: "COMPLETED",
      });
    },
    [api, runSessionAction, sessions],
  );

  const toggleIntervention = useCallback(
    async (sessionId: CrmWhatsappSessionId, enabled: boolean) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(
        () => api.interveneSession(sessionId, { enabled }),
        {
          ...session,
          humanTakeoverAt: enabled
            ? (session.humanTakeoverAt ?? new Date().toISOString())
            : null,
          status: enabled ? "HUMAN_TAKEOVER" : "MINIBOT_ACTIVE",
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const markSessionRead = useCallback(
    async (sessionId: CrmWhatsappSessionId) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(() => api.markSessionRead(sessionId), {
        ...session,
        lastReadAt: new Date().toISOString(),
        unreadCount: 0,
      });
    },
    [api, runSessionAction, sessions],
  );

  const markSessionUnread = useCallback(
    async (sessionId: CrmWhatsappSessionId) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(() => api.markSessionUnread(sessionId), {
        ...session,
        lastReadAt: null,
        unreadCount: Math.max(1, session.unreadCount ?? 0),
      });
    },
    [api, runSessionAction, sessions],
  );

  const addSessionTag = useCallback(
    async (
      sessionId: CrmWhatsappSessionId,
      input: CrmWhatsappAddSessionTagInput,
    ) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      const name = input.name.trim();
      if (!name) return false;
      return runSessionAction(() => api.addSessionTag(sessionId, input), {
        ...session,
        sessionTags: [
          ...(session.sessionTags ?? []),
          {
            color: input.color ?? "var(--color-muted)",
            emoji: input.emoji ?? null,
            id: `local-${name.toLocaleLowerCase("pt-BR")}`,
            name,
          },
        ],
      });
    },
    [api, runSessionAction, sessions],
  );

  const removeSessionTag = useCallback(
    async (sessionId: CrmWhatsappSessionId, tagId: string) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(() => api.removeSessionTag(sessionId, tagId), {
        ...session,
        sessionTags: (session.sessionTags ?? []).filter(
          (tag) => tag.id !== tagId,
        ),
      });
    },
    [api, runSessionAction, sessions],
  );

  const bulkAssignSessions = useCallback(
    (sessionIds: CrmWhatsappSessionId[], assignedUserId: string | null) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessionIds.map((sessionId) =>
            api.assignSession(sessionId, { assignedUserId }),
          ),
        ),
      ),
    [api, runBulkSessionAction],
  );

  const bulkCloseSessions = useCallback(
    (sessionIds: CrmWhatsappSessionId[]) =>
      runBulkSessionAction(() =>
        Promise.all(sessionIds.map((sessionId) => api.closeSession(sessionId))),
      ),
    [api, runBulkSessionAction],
  );

  const bulkMarkSessionsRead = useCallback(
    (sessionIds: CrmWhatsappSessionId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessionIds.map((sessionId) => api.markSessionRead(sessionId)),
        ),
      ),
    [api, runBulkSessionAction],
  );

  const bulkMarkSessionsUnread = useCallback(
    (sessionIds: CrmWhatsappSessionId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessionIds.map((sessionId) => api.markSessionUnread(sessionId)),
        ),
      ),
    [api, runBulkSessionAction],
  );

  return {
    actions: {
      addSessionTag,
      assignSession,
      bulkAssignSessions,
      bulkCloseSessions,
      bulkMarkSessionsRead,
      bulkMarkSessionsUnread,
      closeSession,
      markSessionRead,
      markSessionUnread,
      removeSessionTag,
      toggleIntervention,
    },
    isMutatingSession,
  };
}
