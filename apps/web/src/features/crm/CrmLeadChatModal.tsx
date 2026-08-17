import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { createRuntimeCrmWhatsappApi } from "./runtimeApi";
import { findFreeTextStartConnection } from "./crmWhatsappConnectionSelection";
import { readCrmWhatsappCapabilities } from "./crmWhatsappPermissions";
import { MessageList } from "./CrmWhatsappMessageParts";
import { formatLeadName } from "./crmPipelineModels";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";
import type { WhatsappMessageView } from "./crmWhatsappModel";
import type { ProductCrmLead } from "./productCrmTypes";

const MESSAGE_PAGE_SIZE = 50;
const MESSAGE_POLL_MS = 5_000;

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
  const whatsappApi = useMemo<CrmWhatsappApi>(
    () => createRuntimeCrmWhatsappApi(),
    [],
  );
  const accountSession = useOptionalAccountSession();
  const permissions = useMemo(
    () => readCrmWhatsappCapabilities(accountSession),
    [accountSession],
  );
  const [connections, setConnections] = useState<
    CrmWhatsappProviderConnection[]
  >([]);
  const [session, setSession] = useState<CrmWhatsappSession | null>(null);
  const [messages, setMessages] = useState<WhatsappMessageView[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const startConnection = useMemo(
    () => findFreeTextStartConnection(connections),
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
      whatsappApi.listSessions({ leadId: lead.id, limit: 5 }),
      whatsappApi.listConnections(),
    ])
      .then(([sessions, nextConnections]) => {
        if (!active) return;
        setSession(sessions[0] ?? null);
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
  }, [lead.id, permissions.canList, whatsappApi]);

  const loadMessages = useCallback(async () => {
    if (!session) return;
    const nextMessages = await whatsappApi.listMessages(session.id, {
      limit: MESSAGE_PAGE_SIZE,
      offset: 0,
    });
    setMessages(nextMessages);
  }, [session, whatsappApi]);

  useEffect(() => {
    if (!session || !permissions.canList) return;
    let active = true;
    setIsLoadingMessages(true);
    setMessages([]);
    void loadMessages()
      .catch((caught) => {
        if (active) {
          setError(
            formatApiErrorDisplay(
              caught,
              "Não foi possível carregar as mensagens.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingMessages(false);
      });
    const interval = window.setInterval(() => {
      void loadMessages().catch(() => undefined);
    }, MESSAGE_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [session, permissions.canList, loadMessages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending || !permissions.canSend) return;
    setIsSending(true);
    setError(null);
    try {
      if (session) {
        const sent = await whatsappApi.sendText({
          idempotencyKey: crypto.randomUUID(),
          sessionId: String(session.id),
          text,
        });
        setMessages((current) => [...current, sent]);
      } else {
        if (!startConnection) return;
        const result = await whatsappApi.startConversation({
          connectionId: startConnection.id,
          leadId: lead.id,
          text,
        });
        setSession(result.session);
        onConversationStarted?.(lead);
      }
      setDraft("");
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          session
            ? "Não foi possível enviar a mensagem."
            : "Não foi possível iniciar a conversa.",
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  const canSubmit =
    Boolean(draft.trim()) &&
    !isSending &&
    permissions.canSend &&
    (session !== null || startConnection !== undefined);

  return (
    <FeatureDialog
      className="feature-dialog--large max-w-4xl crm-lead-chat-dialog"
      description={
        session
          ? `${session.buyerPhone || lead.buyerPhone || "Sem telefone"} · ${session.status}`
          : "Nenhuma conversa vinculada a este lead ainda."
      }
      icon={<MessageSquare aria-hidden="true" />}
      isOpen
      onClose={onClose}
      title={`Chat · ${formatLeadName(lead)}`}
    >
      <div className="crm-whatsapp-shell crm-lead-chat-shell">
        {!permissions.canList ? (
          <div className="crm-whatsapp-empty">
            Seu usuário não tem permissão para visualizar conversas.
          </div>
        ) : isLoading ? (
          <div className="crm-whatsapp-empty">Carregando conversa...</div>
        ) : session ? (
          <MessageList
            actionsDisabled={isSending}
            isLoading={isLoadingMessages}
            messages={messages}
          />
        ) : (
          <div className="crm-whatsapp-empty">
            Nenhuma conversa vinculada. Envie a primeira mensagem para iniciar o
            atendimento com este lead.
          </div>
        )}

        {error ? (
          <p className="text-xs font-bold text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {!session && !isLoading && permissions.canList && !startConnection ? (
          <p className="text-xs font-bold text-muted">
            Nenhuma conexão de WhatsApp disponível para iniciar a conversa.
          </p>
        ) : null}

        {permissions.canList && (session || !isLoading) ? (
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
                session
                  ? "Escreva uma mensagem"
                  : "Mensagem inicial para iniciar a conversa"
              }
              value={draft}
            />
            <button
              aria-label={session ? "Enviar mensagem" : "Iniciar conversa"}
              className="crm-action crm-action-primary self-end"
              disabled={!canSubmit}
              title={session ? "Enviar mensagem" : "Iniciar conversa"}
              type="submit"
            >
              <Send aria-hidden="true" className="size-4" />
              {isSending ? "Enviando" : session ? "Enviar" : "Iniciar conversa"}
            </button>
          </form>
        ) : null}
      </div>
    </FeatureDialog>
  );
}
