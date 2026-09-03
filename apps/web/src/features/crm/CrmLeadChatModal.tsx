import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Phone, Send, Sparkles } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import type { CrmConversationApi } from "./crmConversationApi";
import { createRuntimeCrmConversationApi } from "./runtimeApi";
import { findDefaultFreeTextStartConnection } from "./crmConnectionSelection";
import { readCrmCapabilities } from "./crmPermissions";
import { formatLeadName } from "./crmPipelineModels";
import { formatCrmPhone } from "./crmPhoneFormat";
import { sourceLabels } from "./crmPipelineConfig";
import { buildLeadStarterPrompts } from "./crmLeadData";
import type {
  CrmConversationCycleId,
  CrmProviderConnection,
} from "./crmConversationTypes";
import type { ProductCrmLead } from "./productCrmTypes";
import { useCrmInbox } from "./useCrmInbox";
import { CrmConversationWorkspace } from "./CrmConversationWorkspace";

type Props = {
  api?: CrmConversationApi;
  lead: ProductCrmLead;
  onClose: () => void;
  onConversationStarted?: (lead: ProductCrmLead) => void;
  onStartSale?: (lead: ProductCrmLead) => void;
};

export function CrmLeadChatModal({
  api,
  lead,
  onClose,
  onConversationStarted,
  onStartSale,
}: Props) {
  const conversationApi = useMemo<CrmConversationApi>(
    () => api ?? createRuntimeCrmConversationApi(),
    [api],
  );
  const accountSession = useOptionalAccountSession();
  const permissions = useMemo(
    () => readCrmCapabilities(accountSession),
    [accountSession],
  );

  const [activeCycleId, setActiveCycleId] =
    useState<CrmConversationCycleId | null>(null);
  const [connections, setConnections] = useState<CrmProviderConnection[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const startConnection = useMemo(
    () => findDefaultFreeTextStartConnection(connections),
    [connections],
  );

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
      .then(async ([conversationCycles, nextConnections]) => {
        if (!active) return;
        setConnections(nextConnections.connections);
        const existingCycle = conversationCycles[0] ?? null;
        if (existingCycle) {
          setActiveCycleId(existingCycle.id);
          return;
        }

        // Fallback: search cycle by customer phone
        if (lead.buyerPhone) {
          const raw = lead.buyerPhone.replace(/\D/g, "");
          if (raw) {
            try {
              const phoneCycles = await conversationApi.listConversationCycles({
                search: raw,
                limit: 5,
              });
              if (!active) return;
              if (phoneCycles[0]) {
                setActiveCycleId(phoneCycles[0].id);
              }
            } catch {
              // Ignore search errors; user can still start conversation
            }
          }
        }
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
  }, [lead.id, lead.buyerPhone, permissions.canList, conversationApi]);

  const handleStartConversation = async () => {
    const text = draft.trim();
    if (
      !text ||
      isStartingConversation ||
      !permissions.canSend ||
      !startConnection
    )
      return;

    setIsStartingConversation(true);
    setError(null);
    try {
      const result = await conversationApi.startConversation({
        connectionId: startConnection.id,
        customerDisplayName: lead.buyerName || undefined,
        leadId: lead.id,
        phone: lead.buyerPhone || undefined,
        text,
      });
      setActiveCycleId(result.cycle.id);
      onConversationStarted?.(lead);
      setDraft("");
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Não foi possível iniciar a conversa."),
      );
    } finally {
      setIsStartingConversation(false);
    }
  };

  const leadName = formatLeadName(lead);
  const leadPhone = formatCrmPhone(lead.buyerPhone);
  const starterPrompts = useMemo(
    () => buildLeadStarterPrompts(leadName, lead.vehicleTitle),
    [leadName, lead.vehicleTitle],
  );

  const canSubmitInitial =
    Boolean(draft.trim()) &&
    !isStartingConversation &&
    permissions.canSend &&
    startConnection !== undefined;

  return (
    <FeatureDialog
      className="feature-dialog--large max-w-5xl crm-lead-chat-dialog"
      description={
        leadPhone
          ? `${leadPhone} · ${sourceLabels[lead.source] || "Lead"}`
          : "Nenhuma conversa vinculada a este lead ainda."
      }
      icon={<MessageSquare aria-hidden="true" />}
      isOpen
      onClose={onClose}
      title={`Chat CRM · ${leadName}`}
    >
      {activeCycleId ? (
        <CrmLeadPairedWorkspace
          api={conversationApi}
          cycleId={activeCycleId}
          onStartSale={
            onStartSale
              ? () => {
                  onClose();
                  onStartSale(lead);
                }
              : undefined
          }
        />
      ) : (
        <div
          className="crm-shell crm-lead-chat-shell"
          data-standalone-chat="true"
        >
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
          ) : (
            <div className="crm-empty">
              <div className="size-10 rounded-xl bg-line/20 flex items-center justify-center text-muted mb-2">
                <MessageSquare className="size-5" />
              </div>
              <strong className="text-sm font-black text-app-text">
                Nenhuma conversa iniciada
              </strong>
              <p className="text-xs font-bold text-muted max-w-sm mt-1">
                Envie uma mensagem inicial para abrir o canal de atendimento com
                este lead no CRM.
              </p>

              <div className="crm-lead-chat-starter-chips">
                <span className="text-xs font-black uppercase text-muted tracking-wider flex items-center gap-1 self-start">
                  <Sparkles className="size-3 text-warning-strong" /> Sugestões
                  de início:
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

          {!isLoading && permissions.canList && !startConnection ? (
            <div className="px-5 py-2 bg-warning/10 border-t border-warning/20">
              <p className="text-xs font-bold text-warning-strong">
                Nenhuma conexão de WhatsApp disponível para iniciar a conversa.
              </p>
            </div>
          ) : null}

          {permissions.canList && !isLoading ? (
            <div className="crm-lead-chat-composer-wrap">
              <form
                className="crm-lead-chat-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleStartConversation();
                }}
              >
                <textarea
                  aria-label="Mensagem inicial"
                  className="crm-lead-chat-textarea"
                  disabled={
                    !permissions.canSend ||
                    isStartingConversation ||
                    !startConnection
                  }
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleStartConversation();
                    }
                  }}
                  placeholder="Mensagem inicial para abrir atendimento no CRM..."
                  value={draft}
                />
                <button
                  aria-label="Iniciar conversa"
                  className="crm-action crm-action-primary self-end min-h-[44px]"
                  disabled={!canSubmitInitial}
                  title="Iniciar conversa"
                  type="submit"
                >
                  {isStartingConversation ? (
                    <Loader2
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <Send aria-hidden="true" className="size-4" />
                  )}
                  {isStartingConversation ? "Iniciando..." : "Iniciar conversa"}
                </button>
              </form>
              <div className="crm-lead-chat-hints">
                <span>
                  Pressione Enter para enviar · Shift+Enter para quebra
                </span>
                {draft.length > 0 ? (
                  <span>{draft.length} caracteres</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </FeatureDialog>
  );
}

function CrmLeadPairedWorkspace({
  api,
  cycleId,
  onStartSale,
}: {
  api: CrmConversationApi;
  cycleId: CrmConversationCycleId;
  onStartSale?: () => void;
}) {
  const inbox = useCrmInbox(api, cycleId);

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full w-full">
      <CrmConversationWorkspace
        hideQueue
        inbox={inbox}
        onCycleChange={() => {}}
        onScopeChange={() => {}}
        onStartSale={onStartSale ? () => onStartSale() : undefined}
        routeCycleId={cycleId}
      />
    </div>
  );
}
