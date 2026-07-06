export type CrmWhatsappScope =
  | "campaigns"
  | "connection"
  | "conversations"
  | "integrations"
  | "tags"
  | "visits";

const scopes: Array<{
  description: string;
  id: CrmWhatsappScope;
  label: string;
}> = [
  {
    description: "Inbox, atendimento e follow-up",
    id: "conversations",
    label: "Conversas",
  },
  {
    description: "Instancia, credenciais e webhooks",
    id: "connection",
    label: "Conexao ZAPI",
  },
  {
    description: "Test-drive e visitas da loja",
    id: "visits",
    label: "Visitas",
  },
  {
    description: "Campanhas e mensagens agendadas",
    id: "campaigns",
    label: "Campanhas",
  },
  {
    description: "Bot externo, webhooks e eventos",
    id: "integrations",
    label: "Integracoes",
  },
  {
    description: "Labels simples da fila",
    id: "tags",
    label: "Tags",
  },
];

export function CrmWhatsappScopedNav({
  activeScope,
  connectionLabel,
  onChange,
  tagCount,
  unreadCount,
}: {
  activeScope: CrmWhatsappScope;
  connectionLabel: string;
  onChange: (scope: CrmWhatsappScope) => void;
  tagCount: number;
  unreadCount: number;
}) {
  return (
    <nav className="crm-whatsapp-scope-nav" aria-label="WhatsApp CRM">
      <div className="crm-whatsapp-scope-title">
        <strong>WhatsApp</strong>
        <span>{connectionLabel}</span>
      </div>
      <div className="crm-whatsapp-scope-tabs" role="tablist">
        {scopes.map((scope) => {
          const badge = readBadge(scope.id, { tagCount, unreadCount });
          return (
            <button
              aria-selected={activeScope === scope.id}
              className={
                activeScope === scope.id
                  ? "crm-whatsapp-scope-tab crm-whatsapp-scope-tab-active"
                  : "crm-whatsapp-scope-tab"
              }
              key={scope.id}
              onClick={() => onChange(scope.id)}
              role="tab"
              type="button"
            >
              <strong>{scope.label}</strong>
              <small>{scope.description}</small>
              {badge ? <span>{badge}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function readBadge(
  scope: CrmWhatsappScope,
  input: { tagCount: number; unreadCount: number },
) {
  if (scope === "conversations" && input.unreadCount > 0) {
    return String(input.unreadCount);
  }
  if (scope === "tags" && input.tagCount > 0) return String(input.tagCount);
  return null;
}
