import { CheckCircle2, Headphones, Radio } from "lucide-react";
import type { ReactNode } from "react";
import type {
  CrmAgent,
  CrmBootstrapState,
  CrmConversation,
  CrmSseStatus,
} from "./types";

type HeaderContract = ReadonlyArray<{
  key: string;
  state: string;
  value: string;
}>;

export function Panel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="crm-panel">
      <div className="crm-panel-title">
        <Headphones aria-hidden="true" className="hidden size-5 sm:block" />
        {icon}
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function AgentPanel({
  agent,
  bootstrap,
  bridgeToken,
}: {
  agent: CrmAgent;
  bootstrap: CrmBootstrapState;
  bridgeToken: string | null;
}) {
  return (
    <>
      <div className="crm-agent-card">
        <div className="crm-avatar">MC</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{agent.name}</p>
          <p className="truncate text-xs font-semibold text-muted">
            {agent.email}
          </p>
        </div>
        <span className="crm-status crm-status-open">{agent.role}</span>
      </div>
      <ContractRows
        rows={[
          ["Modo", bootstrap.mode],
          ["Bridge pronto", bootstrap.isReady ? "sim" : "aguardando"],
          ["Token", bridgeToken ? "presente" : "ausente"],
        ]}
      />
    </>
  );
}

export function BridgePanel({
  bridgeEventCount,
  headers,
  onBridgeRefresh,
  onTokenRefreshPreview,
}: {
  bridgeEventCount: number;
  headers: HeaderContract;
  onBridgeRefresh: () => void;
  onTokenRefreshPreview: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button className="crm-action" onClick={onBridgeRefresh} type="button">
          Solicitar refresh
        </button>
        <button
          className="crm-action crm-action-secondary"
          onClick={onTokenRefreshPreview}
          type="button"
        >
          Simular token
        </button>
      </div>
      <ContractRows
        rows={[
          ["Evento solicitado", "CRM_REQUEST_BRIDGE_REFRESH"],
          ["Evento recebido", "CRM_BRIDGE_TOKEN_REFRESH"],
          ["PostMessages", String(bridgeEventCount)],
        ]}
      />
      <div className="space-y-2">
        {headers.map((header) => (
          <div className="crm-header-row" key={header.key}>
            <span>{header.key}</span>
            <strong>{header.value}</strong>
          </div>
        ))}
      </div>
    </>
  );
}

export function InboxPanel({
  conversations,
}: {
  conversations: CrmConversation[];
}) {
  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <button className="crm-thread" key={conversation.id} type="button">
          <span
            className={`crm-thread-dot crm-thread-${conversation.status}`}
          />
          <span className="min-w-0 flex-1 text-left">
            <strong className="block truncate text-sm">
              {conversation.contactName}
            </strong>
            <span className="block truncate text-xs font-semibold text-muted">
              {conversation.vehicle}
            </span>
          </span>
          {conversation.unreadCount > 0 ? (
            <span className="crm-unread">{conversation.unreadCount}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function ConversationPanel({
  conversation,
  sseStatus,
}: {
  conversation: CrmConversation;
  sseStatus: CrmSseStatus;
}) {
  return (
    <>
      <div className="crm-conversation-header">
        <div>
          <p className="text-sm font-black">{conversation.contactName}</p>
          <p className="text-xs font-semibold text-muted">
            {conversation.vehicle}
          </p>
        </div>
        <span className="crm-status crm-status-open">aberta</span>
      </div>
      <div className="crm-message-list">
        <p className="crm-message crm-message-in">{conversation.lastMessage}</p>
        <p className="crm-message crm-message-out">
          Posso enviar fotos, historico e uma proposta de entrada agora.
        </p>
      </div>
      <div className="crm-sse-row">
        <Radio aria-hidden="true" className="size-4" />
        <span>SSE status: {sseStatus}</span>
        <CheckCircle2 aria-hidden="true" className="size-4" />
      </div>
    </>
  );
}

export function CrmNotice({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <section className="crm-note">
      {icon}
      <span>{children}</span>
    </section>
  );
}

function ContractRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="space-y-2">
      {rows.map(([label, value]) => (
        <div className="crm-contract-row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
