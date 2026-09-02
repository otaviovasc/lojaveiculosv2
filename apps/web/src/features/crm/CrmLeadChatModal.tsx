import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Loader2,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import type { CrmConversationApi } from "./crmConversationApi";
import { createRuntimeCrmConversationApi } from "./runtimeApi";
import { findDefaultFreeTextStartConnection } from "./crmConnectionSelection";
import { readCrmCapabilities } from "./crmPermissions";
import { MessageList } from "./CrmMessageParts";
import { formatLeadName } from "./crmPipelineModels";
import { formatCrmPhone } from "./crmPhoneFormat";
import { sourceLabels } from "./crmPipelineConfig";
import { crmConversationCycleHash } from "./crmRouteState";
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
  const leadName = formatLeadName(lead);
  const leadPhone = formatCrmPhone(cycle?.customerPhone || lead.buyerPhone);

  const starterPrompts = useMemo(
    () => [
      `👋 Olá ${leadName}! Vi seu interesse em nossos veículos. Como posso ajudar?`,
      lead.vehicleTitle
        ? `🚗 Olá ${leadName}! Posso te passar mais detalhes e fotos do ${lead.vehicleTitle}?`
        : `🚗 Olá ${leadName}! Posso te passar mais fotos e detalhes dos veículos em destaque?`,
      `📅 Olá ${leadName}! Gostaria de agendar uma visita na loja ou simular entrada?`,
    ],
    [leadName, lead.vehicleTitle],
  );

  const canSubmit =
    Boolean(draft.trim()) &&
    !isSending &&
    permissions.canSend &&
    (cycle !== null || startConnection !== undefined);

  return (
    <FeatureDialog
      className="feature-dialog--large max-w-4xl crm-lead-chat-dialog"
      description={
        leadPhone
          ? `${leadPhone} · ${sourceLabels[lead.source] || "Lead"}`
          : "Nenhuma conversa vinculada a este lead ainda."
      }
      icon={<MessageSquare aria-hidden="true" />}
      isOpen
      onClose={onClose}
      title={`Chat · ${leadName}`}
    >
      <div className="crm-shell crm-lead-chat-shell">
        <div className="crm-lead-chat-meta-bar">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-8 place-items-center rounded-full border border-line/40 bg-app-elevated text-xs font-black text-app-text shrink-0">
              {leadName.slice(0, 2).toUpperCase() || "?"}
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-app-text truncate">
                  {leadName}
                </span>
                <span className="px-1.5 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-line/20 text-muted">
                  {sourceLabels[lead.source] || "Lead"}
                </span>
              </div>
              {leadPhone ? (
                <span className="text-xs font-bold text-muted flex items-center gap-1">
                  <Phone className="size-2.5" />
                  {leadPhone}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lead.vehicleTitle ? (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-line/25 bg-panel/30 px-2 py-1 text-xs font-bold text-muted truncate max-w-[200px]">
                🚗 {lead.vehicleTitle}
              </span>
            ) : null}

            {startConnection ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-black text-success">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                {startConnection.displayName || "WhatsApp"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs font-black text-warning-strong">
                Sem canal conectado
              </span>
            )}

            {cycle ? (
              <a
                className="inline-flex items-center gap-1 rounded-lg border border-line/35 bg-panel/40 px-2.5 py-1 text-xs font-bold text-muted transition-colors hover:bg-line/10 hover:text-app-text"
                href={`#${crmConversationCycleHash(cycle.id)}`}
                title="Abrir no CRM Completo"
              >
                <ExternalLink aria-hidden="true" className="size-3.5" />
                <span className="hidden md:inline">Abrir no CRM</span>
              </a>
            ) : null}
          </div>
        </div>

        {!permissions.canList ? (
          <div className="crm-empty">
            <p className="text-sm font-bold text-muted">
              Seu usuário não tem permissão para visualizar conversas.
            </p>
          </div>
        ) : isLoading ? (
          <div className="crm-empty">
            <Loader2 className="size-6 animate-spin text-muted mb-2" />
            <span className="text-xs font-bold text-muted">
              Carregando conversa...
            </span>
          </div>
        ) : cycle ? (
          <MessageList
            actionsDisabled={isSending}
            hasOlderMessages={messageState.hasOlderMessages}
            isLoading={messageState.isLoadingMessages}
            isLoadingOlderMessages={messageState.isLoadingOlderMessages}
            messages={messageState.messages}
            olderMessagesError={messageState.olderMessagesError}
            onDelete={messageState.deleteMessage}
            onLoadOlder={messageState.loadOlderMessages}
            onReact={messageState.sendReaction}
            onReconcileMessage={messageState.reconcileMessage}
            onRemoveReaction={messageState.removeReaction}
            onRetryMessage={messageState.retryMessage}
          />
        ) : (
          <div className="crm-empty">
            <div className="size-10 rounded-xl bg-line/20 flex items-center justify-center text-muted mb-2">
              <MessageSquare className="size-5" />
            </div>
            <strong className="text-sm font-black text-app-text">
              Nenhuma conversa iniciada
            </strong>
            <p className="text-xs font-bold text-muted max-w-sm mt-1">
              Envie uma mensagem inicial para abrir o canal de WhatsApp com este
              lead.
            </p>

            <div className="crm-lead-chat-starter-chips">
              <span className="text-xs font-black uppercase text-muted tracking-wider flex items-center gap-1 self-start">
                <Sparkles className="size-3 text-warning-strong" /> Sugestões de
                início:
              </span>
              {starterPrompts.map((prompt, idx) => (
                <button
                  className="crm-lead-chat-starter-chip"
                  key={idx}
                  onClick={() => setDraft(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {error ? (
          <div className="px-5 py-2 bg-danger/10 border-t border-danger/20">
            <p className="text-xs font-bold text-danger" role="alert">
              {error}
            </p>
          </div>
        ) : null}

        {!cycle && !isLoading && permissions.canList && !startConnection ? (
          <div className="px-5 py-2 bg-warning/10 border-t border-warning/20">
            <p className="text-xs font-bold text-warning-strong">
              Nenhuma conexão de WhatsApp disponível para iniciar a conversa.
            </p>
          </div>
        ) : null}

        {permissions.canList && (cycle || !isLoading) ? (
          <div className="crm-lead-chat-composer-wrap">
            <form
              className="crm-lead-chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
            >
              <textarea
                aria-label="Mensagem"
                className="crm-lead-chat-textarea"
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
                    ? "Escreva uma mensagem..."
                    : "Mensagem inicial para abrir atendimento..."
                }
                value={draft}
              />
              <button
                aria-label={cycle ? "Enviar mensagem" : "Iniciar conversa"}
                className="crm-action crm-action-primary self-end min-h-[44px]"
                disabled={!canSubmit}
                title={cycle ? "Enviar mensagem" : "Iniciar conversa"}
                type="submit"
              >
                {isSending ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Send aria-hidden="true" className="size-4" />
                )}
                {isSending
                  ? "Enviando..."
                  : cycle
                    ? "Enviar"
                    : "Iniciar conversa"}
              </button>
            </form>
            <div className="crm-lead-chat-hints">
              <span>Pressione Enter para enviar · Shift+Enter para quebra</span>
              {draft.length > 0 ? <span>{draft.length} caracteres</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </FeatureDialog>
  );
}
