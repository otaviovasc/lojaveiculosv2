import { useCallback, useMemo } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { createRuntimeCrmWhatsappApi } from "./runtimeApi";
import { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";
import {
  ChatHeader,
  MessageComposer,
  SessionList,
  WhatsappNotice,
  WhatsappToolbar,
} from "./CrmWhatsappParts";
import { MessageList } from "./CrmWhatsappMessageParts";

export function CrmWhatsappInbox({ api }: { api?: CrmWhatsappApi }) {
  const whatsappApi = useMemo(
    () => api ?? createRuntimeCrmWhatsappApi(),
    [api],
  );
  const inbox = useCrmWhatsappInbox(whatsappApi);
  const activeSession = inbox.activeSession;

  const refreshAfter = useCallback(
    async (action: () => Promise<unknown>) => {
      await action();
      await inbox.refreshSessions({ preserveLocalOnly: true });
    },
    [inbox],
  );

  return (
    <main className="crm-page">
      <section className="crm-hero crm-hero-green">
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-inverse-muted">
            CRM WhatsApp
          </p>
          <h2 className="max-w-3xl text-2xl font-black text-inverse lg:text-4xl">
            Caixa de entrada, detalhe da sessao e continuidade de mensagens.
          </h2>
          <p className="max-w-2xl text-sm font-semibold text-inverse-muted">
            Conversas, responsaveis e acoes ficam auditados para continuidade
            do atendimento.
          </p>
        </div>
        <span className="crm-hero-status">
          {inbox.hasConnection === false
            ? "WhatsApp desconectado"
            : `${inbox.sessions.length} conversas`}
        </span>
      </section>

      {inbox.error ? <WhatsappNotice message={inbox.error.message} /> : null}
      {inbox.hasConnection === false ? (
        <WhatsappNotice message="Nenhuma conexao WhatsApp ativa foi encontrada para a loja." />
      ) : null}

      <WhatsappToolbar onSearch={inbox.setSearch} search={inbox.search} />

      <section className="crm-whatsapp-shell">
        {inbox.isLoading ? (
          <div className="crm-whatsapp-empty">Carregando conversas...</div>
        ) : (
          <SessionList
            activeSessionId={inbox.activeSessionId}
            onSelect={inbox.setActiveSessionId}
            sessions={inbox.sessions}
          />
        )}

        <section className="crm-whatsapp-chat" aria-label="Detalhe da conversa">
          {activeSession ? (
            <>
              <ChatHeader
                agents={inbox.agents}
                canAssignSession={inbox.canAssignSessions}
                onAssign={(agentId) =>
                  void refreshAfter(() =>
                    inbox.actions.assignSession(
                      activeSession.id,
                      agentId,
                      inbox.connectionId,
                    ),
                  )
                }
                onClose={() =>
                  void refreshAfter(() =>
                    inbox.actions.closeSession(
                      activeSession.id,
                      "default",
                      inbox.connectionId,
                    ),
                  )
                }
                onToggleIntervention={() =>
                  void refreshAfter(() =>
                    inbox.actions.toggleIntervention(
                      activeSession.id,
                      inbox.connectionId,
                    ),
                  )
                }
                session={activeSession}
              />
              <MessageList
                isLoading={inbox.isLoadingMessages}
                messages={inbox.messages}
              />
              <MessageComposer
                disabled={inbox.isSending}
                onSend={inbox.sendText}
              />
            </>
          ) : (
            <div className="crm-whatsapp-empty">
              Selecione uma conversa para continuar o atendimento.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
