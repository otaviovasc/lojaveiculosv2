import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ExternalLink,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import type { CrmConversationApi } from "./crmConversationApi";
import { createRuntimeCrmConversationApi } from "./runtimeApi";
import { findDefaultFreeTextStartConnection } from "./crmConnectionSelection";
import { readCrmCapabilities } from "./crmPermissions";
import { crmConversationCycleHash } from "./crmRouteState";
import { formatCrmPhone } from "./crmPhoneFormat";
import { formatLeadName } from "./crmPipelineModels";
import type {
  CrmProviderConnection,
  CrmConversationCycle,
} from "./crmConversationTypes";
import type { ProductCrmLead } from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  api?: CrmConversationApi;
};

export function CrmLeadConversationPanel({ api, lead }: Props) {
  const conversationApi = useMemo(
    () => api ?? createRuntimeCrmConversationApi(),
    [api],
  );
  const cycle = useOptionalAccountSession();
  const permissions = useMemo(() => readCrmCapabilities(cycle), [cycle]);
  const [connections, setConnections] = useState<CrmProviderConnection[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [linkedSessions, setLinkedSessions] = useState<CrmConversationCycle[]>(
    [],
  );

  const connection = useMemo(
    () => findDefaultFreeTextStartConnection(connections),
    [connections],
  );
  const hasOfficialConnection = connections.some(
    (item) =>
      item.provider === "meta_cloud" &&
      (item.channel === "whatsapp" || item.channel === "instagram"),
  );
  const linkedSession = linkedSessions[0] ?? null;
  const leadName = formatLeadName(lead);

  const starterPrompts = useMemo(
    () => [
      `👋 Olá ${leadName}! Vi seu interesse em nossos veículos. Como posso ajudar?`,
      lead.vehicleTitle
        ? `🚗 Olá ${leadName}! Posso te passar mais detalhes e fotos do ${lead.vehicleTitle}?`
        : `🚗 Olá ${leadName}! Posso te passar mais fotos e detalhes dos veículos em estoque?`,
      `📅 Olá ${leadName}! Gostaria de agendar uma visita na loja ou simular entrada?`,
    ],
    [leadName, lead.vehicleTitle],
  );

  const load = useCallback(async () => {
    if (!permissions.canList) {
      setIsLoading(false);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const [conversationCycles, nextConnections] = await Promise.all([
        conversationApi.listConversationCycles({ leadId: lead.id, limit: 5 }),
        conversationApi.listConnections(),
      ]);
      setLinkedSessions(conversationCycles);
      setConnections(nextConnections.connections);
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Não foi possível carregar o chat."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [lead.id, permissions.canList, conversationApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const startConversation = async () => {
    const text = draft.trim();
    if (!connection || !permissions.canSend || !text || isStarting) return;
    setIsStarting(true);
    setError(null);
    try {
      const result = await conversationApi.startConversation({
        connectionId: connection.id,
        leadId: lead.id,
        text,
      });
      setLinkedSessions([result.cycle]);
      setDraft("");
      window.location.hash = crmConversationCycleHash(result.cycle.id);
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Não foi possível iniciar a conversa."),
      );
    } finally {
      setIsStarting(false);
    }
  };

  if (!permissions.canList) {
    return (
      <ChatPanelFrame>
        <EmptyChatState
          title="WhatsApp indisponivel"
          body="Seu usuário não tem permissão para visualizar conversas."
        />
      </ChatPanelFrame>
    );
  }

  if (isLoading) {
    return (
      <ChatPanelFrame>
        <div className="flex items-center gap-2 py-4 text-xs font-bold text-muted">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>Carregando conversas vinculadas...</span>
        </div>
      </ChatPanelFrame>
    );
  }

  if (linkedSession) {
    const phoneDisplay =
      formatCrmPhone(linkedSession.customerPhone || lead.buyerPhone) ||
      "Sem telefone";

    return (
      <ChatPanelFrame>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Conversa vinculada
              </span>
              <h3 className="mt-1 text-base font-black text-app-text">
                {linkedSession.customerDisplayName ||
                  lead.buyerName ||
                  "Lead sem nome"}
              </h3>
              <p className="mt-1 text-xs font-bold text-muted flex items-center gap-1.5">
                <Phone className="size-3" />
                <span>{phoneDisplay}</span>
                <span>·</span>
                <span className="capitalize">{linkedSession.status}</span>
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-black text-success">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              WhatsApp Ativo
            </span>
          </div>

          <div className="pt-2 border-t border-line/15">
            <a
              className="crm-action crm-action-primary w-fit inline-flex items-center gap-2"
              href={`#${crmConversationCycleHash(linkedSession.id)}`}
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              Abrir conversa
            </a>
          </div>
        </div>
      </ChatPanelFrame>
    );
  }

  return (
    <ChatPanelFrame>
      <div className="flex flex-col gap-4">
        <EmptyChatState
          title="Nenhuma conversa vinculada"
          body="Inicie uma conversa pelo lead para manter o atendimento centralizado no CRM."
        />

        {/* Starter Prompts */}
        {connection && (
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-black uppercase text-muted tracking-wider flex items-center gap-1">
              <Sparkles className="size-3 text-warning-strong" /> Sugestões de
              abertura rápida:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {starterPrompts.map((prompt, idx) => (
                <button
                  className="text-left p-2.5 rounded-lg border border-line/25 bg-panel/30 text-xs font-semibold text-app-text hover:border-primary/50 hover:bg-panel/50 transition-all cursor-pointer"
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
          <p className="text-xs font-bold text-danger">{error}</p>
        ) : null}

        {!connection && hasOfficialConnection ? (
          <p className="text-xs font-bold text-muted p-3 bg-panel/20 rounded-lg border border-line/20">
            Para iniciar pela API oficial, use um template aprovado em Nova
            conversa no CRM. No Instagram, o cliente envia a primeira mensagem.
          </p>
        ) : null}

        <textarea
          aria-label="Mensagem inicial"
          className="min-h-24 rounded-xl border border-line/35 bg-panel/20 p-3 text-sm font-medium text-app-text outline-none focus:border-primary/50 transition-colors"
          disabled={!connection}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensagem inicial"
          value={draft}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="crm-action crm-action-primary"
            disabled={
              !connection || !permissions.canSend || !draft.trim() || isStarting
            }
            onClick={() => void startConversation()}
            type="button"
          >
            {isStarting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send aria-hidden="true" className="size-4" />
            )}
            {isStarting ? "Enviando..." : "Iniciar conversa"}
          </button>
          <button
            className="crm-action crm-action-secondary"
            disabled={isStarting}
            onClick={() => void load()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Atualizar
          </button>
        </div>
      </div>
    </ChatPanelFrame>
  );
}

function ChatPanelFrame({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line/25 bg-panel/20 p-5 text-app-text">
      {children}
    </section>
  );
}

function EmptyChatState({ body, title }: { body: string; title: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line/25 bg-line/15 text-muted">
        <MessageSquare aria-hidden="true" className="size-5" />
      </div>
      <div>
        <h3 className="text-sm font-black text-app-text">{title}</h3>
        <p className="mt-1 max-w-lg text-xs font-bold leading-relaxed text-muted">
          {body}
        </p>
      </div>
    </div>
  );
}
