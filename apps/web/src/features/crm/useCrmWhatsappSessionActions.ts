import { useCallback, useRef, useState } from "react";
import { getApiErrorRecovery } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappAddSessionTagInput,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";
import type { CrmWhatsappBulkActionDraft } from "./crmWhatsappQueueState";

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
  const [hasRetryableSessionAction, setHasRetryableSessionAction] =
    useState(false);
  const [isMutatingSession, setIsMutatingSession] = useState(false);
  const retryActionRef = useRef<(() => Promise<boolean>) | null>(null);

  const clearRetryAction = useCallback(() => {
    retryActionRef.current = null;
    setHasRetryableSessionAction(false);
  }, []);

  const runSessionAction = useCallback(
    (
      action: () => Promise<CrmWhatsappSession | null>,
      fallback: CrmWhatsappSession,
    ) => {
      async function execute(): Promise<boolean> {
        setError(null);
        setIsMutatingSession(true);
        try {
          const updatedSession = await action();
          patchSession(updatedSession ?? fallback);
          await refreshSessions({ preserveLocalOnly: true });
          clearRetryAction();
          return true;
        } catch (caught) {
          const error = asError(caught);
          const canRetry = getApiErrorRecovery(error)?.kind === "retry";
          retryActionRef.current = canRetry ? execute : null;
          setHasRetryableSessionAction(canRetry);
          setError(error);
          return false;
        } finally {
          setIsMutatingSession(false);
        }
      }

      return execute();
    },
    [clearRetryAction, patchSession, refreshSessions, setError],
  );

  const runBulkSessionAction = useCallback(
    (action: () => Promise<unknown>) => {
      async function execute(): Promise<boolean> {
        setError(null);
        setIsMutatingSession(true);
        try {
          await action();
          await refreshSessions({ preserveLocalOnly: true });
          clearRetryAction();
          return true;
        } catch (caught) {
          const error = asError(caught);
          const canRetry = getApiErrorRecovery(error)?.kind === "retry";
          retryActionRef.current = canRetry ? execute : null;
          setHasRetryableSessionAction(canRetry);
          setError(error);
          return false;
        } finally {
          setIsMutatingSession(false);
        }
      }

      return execute();
    },
    [clearRetryAction, refreshSessions, setError],
  );

  const retryLastSessionAction = useCallback(
    () => retryActionRef.current?.() ?? Promise.resolve(false),
    [],
  );

  const assignSession = useCallback(
    async (sessionId: CrmWhatsappSessionId, assignedUserId: string | null) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(
        () =>
          api.assignSession(sessionId, {
            assignedUserId,
            expectedRevision: readExpectedRevision(session),
          }),
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
      return runSessionAction(
        () =>
          api.closeSession(sessionId, {
            expectedRevision: readExpectedRevision(session),
          }),
        {
          ...session,
          status: "COMPLETED",
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const toggleIntervention = useCallback(
    async (sessionId: CrmWhatsappSessionId, enabled: boolean) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(
        () =>
          api.interveneSession(sessionId, {
            enabled,
            expectedRevision: readExpectedRevision(session),
          }),
        {
          ...session,
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
      return runSessionAction(
        () =>
          api.markSessionRead(sessionId, {
            expectedRevision: readExpectedRevision(session),
          }),
        {
          ...session,
          lastReadAt: new Date().toISOString(),
          unreadCount: 0,
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const markSessionUnread = useCallback(
    async (sessionId: CrmWhatsappSessionId) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(
        () =>
          api.markSessionUnread(sessionId, {
            expectedRevision: readExpectedRevision(session),
          }),
        {
          ...session,
          lastReadAt: null,
          unreadCount: Math.max(1, session.unreadCount ?? 0),
        },
      );
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
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map((session) =>
              api.assignSession(session.id, {
                assignedUserId,
                expectedRevision: readExpectedRevision(session),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, sessions],
  );

  const bulkCloseSessions = useCallback(
    (sessionIds: CrmWhatsappSessionId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map((session) =>
              api.closeSession(session.id, {
                expectedRevision: readExpectedRevision(session),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, sessions],
  );

  const bulkMarkSessionsRead = useCallback(
    (sessionIds: CrmWhatsappSessionId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map((session) =>
              api.markSessionRead(session.id, {
                expectedRevision: readExpectedRevision(session),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, sessions],
  );

  const bulkMarkSessionsUnread = useCallback(
    (sessionIds: CrmWhatsappSessionId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map((session) =>
              api.markSessionUnread(session.id, {
                expectedRevision: readExpectedRevision(session),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, sessions],
  );

  const bulkApplySessions = useCallback(
    (sessionIds: CrmWhatsappSessionId[], draft: CrmWhatsappBulkActionDraft) =>
      runBulkSessionAction(async () => {
        await Promise.all(
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map(async (session) => {
              let current = session;
              if (draft.assignedUserId !== undefined) {
                current =
                  (await api.assignSession(session.id, {
                    assignedUserId: draft.assignedUserId,
                    expectedRevision: readExpectedRevision(current),
                  })) ?? current;
              }
              if (draft.tag) await api.addSessionTag(session.id, draft.tag);
              if (draft.readState === "read") {
                current =
                  (await api.markSessionRead(session.id, {
                    expectedRevision: readExpectedRevision(current),
                  })) ?? current;
              } else if (draft.readState === "unread") {
                current =
                  (await api.markSessionUnread(session.id, {
                    expectedRevision: readExpectedRevision(current),
                  })) ?? current;
              }
              if (draft.close) {
                await api.closeSession(session.id, {
                  expectedRevision: readExpectedRevision(current),
                });
              }
            }),
        );
      }),
    [api, runBulkSessionAction, sessions],
  );

  return {
    actions: {
      addSessionTag,
      assignSession,
      bulkAssignSessions,
      bulkApplySessions,
      bulkCloseSessions,
      bulkMarkSessionsRead,
      bulkMarkSessionsUnread,
      closeSession,
      markSessionRead,
      markSessionUnread,
      removeSessionTag,
      toggleIntervention,
    },
    hasRetryableSessionAction,
    isMutatingSession,
    retryLastSessionAction,
  };
}

function readExpectedRevision(session: CrmWhatsappSession) {
  return session.revision ?? 0;
}
