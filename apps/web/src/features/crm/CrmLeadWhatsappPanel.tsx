import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ExternalLink, MessageSquare, RefreshCw, Send } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { createRuntimeCrmWhatsappApi } from "./runtimeApi";
import { findConnectedConnection } from "./crmWhatsappConnectionSelection";
import { readCrmWhatsappCapabilities } from "./crmWhatsappPermissions";
import { crmWhatsappSessionHash } from "./crmRouteState";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";
import type { ProductCrmLead } from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  api?: CrmWhatsappApi;
};

export function CrmLeadWhatsappPanel({ api, lead }: Props) {
  const whatsappApi = useMemo(
    () => api ?? createRuntimeCrmWhatsappApi(),
    [api],
  );
  const session = useOptionalAccountSession();
  const permissions = useMemo(
    () => readCrmWhatsappCapabilities(session),
    [session],
  );
  const [connections, setConnections] = useState<
    CrmWhatsappProviderConnection[]
  >([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [linkedSessions, setLinkedSessions] = useState<CrmWhatsappSession[]>(
    [],
  );

  const connection = useMemo(
    () =>
      findConnectedConnection(connections) ??
      connections.find((item) => item.status !== "archived") ??
      null,
    [connections],
  );
  const linkedSession = linkedSessions[0] ?? null;

  const load = useCallback(async () => {
    if (!permissions.canList) {
      setIsLoading(false);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const [sessions, nextConnections] = await Promise.all([
        whatsappApi.listSessions({ leadId: lead.id, limit: 5 }),
        whatsappApi.listConnections(),
      ]);
      setLinkedSessions(sessions);
      setConnections(nextConnections.connections);
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Nao foi possivel carregar o chat."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [lead.id, permissions.canList, whatsappApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const startConversation = async () => {
    const text = draft.trim();
    if (!connection || !permissions.canSend || !text || isStarting) return;
    setIsStarting(true);
    setError(null);
    try {
      const result = await whatsappApi.startConversation({
        connectionId: connection.id,
        leadId: lead.id,
        text,
      });
      setLinkedSessions([result.session]);
      setDraft("");
      window.location.hash = crmWhatsappSessionHash(result.session.id);
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Nao foi possivel iniciar a conversa."),
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
          body="Seu usuario nao tem permissao para visualizar conversas."
        />
      </ChatPanelFrame>
    );
  }

  if (isLoading) {
    return (
      <ChatPanelFrame>
        <span className="text-xs font-bold text-muted">
          Carregando conversas vinculadas.
        </span>
      </ChatPanelFrame>
    );
  }

  if (linkedSession) {
    return (
      <ChatPanelFrame>
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wide text-muted">
              Conversa vinculada
            </span>
            <h3 className="mt-1 text-base font-black text-app-text">
              {linkedSession.buyerName || lead.buyerName || "Lead sem nome"}
            </h3>
            <p className="mt-1 text-xs font-bold text-muted">
              {linkedSession.buyerPhone || lead.buyerPhone || "Sem telefone"} ·{" "}
              {linkedSession.status}
            </p>
          </div>
          <a
            className="crm-action crm-action-primary w-fit"
            href={`#${crmWhatsappSessionHash(linkedSession.id)}`}
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Abrir conversa
          </a>
        </div>
      </ChatPanelFrame>
    );
  }

  return (
    <ChatPanelFrame>
      <div className="flex flex-col gap-4">
        <EmptyChatState
          title="Nenhuma conversa vinculada"
          body="Inicie uma conversa pelo lead para manter a identidade CRM centralizada."
        />
        {error ? (
          <p className="text-xs font-bold text-danger">{error}</p>
        ) : null}
        <textarea
          className="min-h-28 rounded-xl border border-line/35 bg-panel/20 p-3 text-sm font-medium text-app-text outline-none focus:border-primary/50"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensagem inicial"
          value={draft}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="crm-action crm-action-primary"
            disabled={
              !connection || !permissions.canSend || !draft.trim() || isStarting
            }
            onClick={() => void startConversation()}
            type="button"
          >
            <Send aria-hidden="true" className="size-4" />
            {isStarting ? "Enviando" : "Iniciar conversa"}
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
    <section className="rounded-xl border border-line/35 bg-panel/10 p-5 text-app-text">
      {children}
    </section>
  );
}

function EmptyChatState({ body, title }: { body: string; title: string }) {
  return (
    <div className="flex items-start gap-3">
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
