import {
  CalendarClock,
  CarFront,
  MessageSquareText,
  Megaphone,
  PlugZap,
  Radio,
  Tag,
} from "lucide-react";
export type CrmWhatsappScope =
  | "campaigns"
  | "connection"
  | "conversations"
  | "integrations"
  | "schedules"
  | "tags"
  | "visits";

export type CrmWhatsappConnectionTone =
  "error" | "loading" | "neutral" | "offline" | "online";

const scopes: Array<{
  icon: typeof MessageSquareText;
  id: CrmWhatsappScope;
  label: string;
}> = [
  {
    icon: MessageSquareText,
    id: "conversations",
    label: "Conversas",
  },
  {
    icon: CalendarClock,
    id: "schedules",
    label: "Agendar mensagem",
  },
  {
    icon: CarFront,
    id: "visits",
    label: "Visitas",
  },
  {
    icon: Megaphone,
    id: "campaigns",
    label: "Campanhas",
  },
  {
    icon: Tag,
    id: "tags",
    label: "Etiquetas",
  },
  {
    icon: PlugZap,
    id: "integrations",
    label: "Integrações",
  },
  {
    icon: Radio,
    id: "connection",
    label: "Conexão",
  },
];

export function CrmWhatsappScopedNav({
  activeScope,
  connectionLabel,
  connectionTone,
  onChange,
  tagCount,
  unreadCount,
}: {
  activeScope: CrmWhatsappScope;
  connectionLabel: string;
  connectionTone: CrmWhatsappConnectionTone;
  onChange: (scope: CrmWhatsappScope) => void;
  tagCount: number;
  unreadCount: number;
}) {
  return (
    <nav className="crm-whatsapp-scope-nav" aria-label="WhatsApp CRM">
      <div className="crm-whatsapp-scope-title">
        <strong>WhatsApp</strong>
        <span
          aria-label={`Status da conexão: ${connectionLabel}`}
          className={`crm-whatsapp-status crm-whatsapp-scope-status crm-whatsapp-status-${connectionTone}`}
        >
          <span aria-hidden="true" />
          {connectionLabel}
        </span>
      </div>
      <div className="crm-whatsapp-scope-tabs" role="tablist">
        {scopes.map((scope) => {
          const badge = readBadge(scope.id, { tagCount, unreadCount });
          const Icon = scope.icon;
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
              <Icon aria-hidden="true" />
              <strong>{scope.label}</strong>
              {badge ? (
                <span className="crm-whatsapp-scope-tab-badge">{badge}</span>
              ) : null}
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
