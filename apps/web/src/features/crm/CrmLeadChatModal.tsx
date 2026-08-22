import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import type { CrmConversationApi } from "./crmConversationApi";
import { createRuntimeCrmConversationApi } from "./runtimeApi";
import { findDefaultFreeTextStartConnection } from "./crmConnectionSelection";
import { readCrmCapabilities } from "./crmPermissions";
import { MessageList } from "./CrmMessageParts";
import { formatLeadName } from "./crmPipelineModels";
import type {
  CrmProviderConnection,
  CrmConversationCycle,
} from "./crmConversationTypes";
import type { ProductCrmLead } from "./productCrmTypes";
import { useCrmMessages } from "./useCrmMessages";

type Props = {
  lead: ProductCrmLead;
  onClose: () => void;
  onConversationStarted?: (lead: ProductCrmLead) => void;
};

export function CrmLeadChatModal({
  lead,
  onClose,
  onConversationStarted,
}: Props) {
  const conversationApi = useMemo<CrmConversationApi>(
    () => createRuntimeCrmConversationApi(),
    [],
  );
  const accountSession = useOptionalAccountSession();
  const permissions = useMemo(
    () => readCrmCapabilities(accountSession),
    [accountSession],
  );
  const [connections, setConnections] = useState<CrmProviderConnection[]>([]);
  const [cycle, setSession] = useState<CrmConversationCycle | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const startConnection = useMemo(
    () => findDefaultFreeTextStartConnection(connections),
    [connections],
  );
  const mergeActiveCycle = useCallback((nextCycles: CrmConversationCycle[]) => {
    setSession(
      (current) =>
        nextCycles.find((nextCycle) => nextCycle.id === current?.id) ?? current,
    );
  }, []);
  const setMessagesError = useCallback((caught: Error) => {
    setError(
      formatApiErrorDisplay(
        caught,
        "Não foi possível concluir a ação no chat.",
      ),
    );
  }, []);
  const messageState = useCrmMessages({
    activeSession: cycle,
    activeCycleId: cycle?.id ?? null,
    api: conversationApi,
    canLoadMessages: permissions.canList,
    canSendMessages: permissions.canSend,
    mergeCycles: mergeActiveCycle,
    setError: setMessagesError,
  });

  useEffect(() => {
    if (!permissions.canList) {
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    setError(null);
    void Promise.all([
      conversationApi.listConversationCycles({ leadId: lead.id, limit: 5 }),
      conversationApi.listConnections(),
    ])
      .then(([conversationCycles, nextConnections]) => {
        if (!active) return;
        setSession(conversationCycles[0] ?? null);
        setConnections(nextConnections.connections);
      })
      .catch((caught) => {
        if (!active) return;
        setError(
          formatApiErrorDisplay(caught, "Não foi possível carregar o chat."),
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lead.id, permissions.canList, conversationApi]);

  const handleSend = async () => {
    const text = draft.trim();
    if (
      !text ||
      messageState.isSending ||
      isStartingConversation ||
      !permissions.canSend
    )
      return;
    setError(null);
    if (cycle) {
      if (await messageState.sendText(text)) setDraft("");
      return;
    }
    setIsStartingConversation(true);
    try {
      if (!startConnection) return;
      const result = await conversationApi.startConversation({
        connectionId: startConnection.id,
        leadId: lead.id,
        text,
      });
      setSession(result.cycle);
      onConversationStarted?.(lead);
      setDraft("");
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          cycle
            ? "Não foi possível enviar a mensagem."
            : "Não foi possível iniciar a conversa.",
        ),
      );
    } finally {
      setIsStartingConversation(false);
    }
  };

  const isSending = messageState.isSending || isStartingConversation;

  const canSubmit =
    Boolean(draft.trim()) &&
    !isSending &&
    permissions.canSend &&
    (cycle !== null || startConnection !== undefined);

  return (
    <FeatureDialog
      className="feature-dialog--large max-w-4xl crm-lead-chat-dialog"
      description={
        cycle
          ? `${cycle.customerPhone || lead.buyerPhone || "Sem telefone"} · ${cycle.status}`
          : "Nenhuma conversa vinculada a este lead ainda."
      }
      icon={<MessageSquare aria-hidden="true" />}
      isOpen
      onClose={onClose}
      title={`Chat · ${formatLeadName(lead)}`}
    >
      <div className="crm-shell crm-lead-chat-shell">
        {!permissions.canList ? (
          <div className="crm-empty">
            Seu usuário não tem permissão para visualizar conversas.
          </div>
        ) : isLoading ? (
          <div className="crm-empty">Carregando conversa...</div>
        ) : cycle ? (
          <MessageList
            actionsDisabled={isSending}
            hasOlderMessages={messageState.hasOlderMessages}
            isLoading={messageState.isLoadingMessages}
            isLoadingOlderMessages={messageState.isLoadingOlderMessages}
            messages={messageState.messages}
            olderMessagesError={messageState.olderMessagesError}
            onLoadOlder={messageState.loadOlderMessages}
          />
        ) : (
          <div className="crm-empty">
            Nenhuma conversa vinculada. Envie a primeira mensagem para iniciar o
            atendimento com este lead.
          </div>
        )}

        {error ? (
          <p className="text-xs font-bold text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {!cycle && !isLoading && permissions.canList && !startConnection ? (
          <p className="text-xs font-bold text-muted">
            Nenhuma conexão de WhatsApp disponível para iniciar a conversa.
          </p>
        ) : null}

        {permissions.canList && (cycle || !isLoading) ? (
          <form
            className="crm-lead-chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <textarea
              aria-label="Mensagem"
              className="min-h-16 flex-1 resize-none rounded-xl border border-line/35 bg-panel/20 p-3 text-sm font-medium text-app-text outline-none focus:border-primary/50"
              disabled={!permissions.canSend || isSending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={
                cycle
                  ? "Escreva uma mensagem"
                  : "Mensagem inicial para iniciar a conversa"
              }
              value={draft}
            />
            <button
              aria-label={cycle ? "Enviar mensagem" : "Iniciar conversa"}
              className="crm-action crm-action-primary self-end"
              disabled={!canSubmit}
              title={cycle ? "Enviar mensagem" : "Iniciar conversa"}
              type="submit"
            >
              <Send aria-hidden="true" className="size-4" />
              {isSending ? "Enviando" : cycle ? "Enviar" : "Iniciar conversa"}
            </button>
          </form>
        ) : null}
      </div>
    </FeatureDialog>
  );
}
