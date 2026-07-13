import {
  CalendarClock,
  CarFront,
  MessageSquareText,
  Megaphone,
  PlugZap,
  Radio,
  Tag,
} from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { CrmWhatsappMobileNav } from "./CrmWhatsappMobileNav";
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

export type CrmWhatsappScopeOption = {
  icon: typeof MessageSquareText;
  id: CrmWhatsappScope;
  label: string;
};

const scopes: CrmWhatsappScopeOption[] = [
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
    <>
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
        <FeatureTabs
          activeClassName="crm-whatsapp-scope-tab-active"
          ariaLabel="Áreas do WhatsApp CRM"
          className="crm-whatsapp-scope-tabs"
          onChange={onChange}
          optionClassName="crm-whatsapp-scope-tab"
          options={scopes.map((scope) => ({
            icon: scope.icon,
            label: createScopeLabel(scope, { tagCount, unreadCount }),
            value: scope.id,
          }))}
          value={activeScope}
        />
      </nav>
      <CrmWhatsappMobileNav
        activeScope={activeScope}
        badgeForScope={(scope) => readBadge(scope, { tagCount, unreadCount })}
        onChange={onChange}
        scopes={scopes}
      />
    </>
  );
}

function createScopeLabel(
  scope: (typeof scopes)[number],
  counts: { tagCount: number; unreadCount: number },
) {
  const badge = readBadge(scope.id, counts);
  return (
    <>
      <strong>{scope.label}</strong>
      {badge ? (
        <>
          {" "}
          <span className="crm-whatsapp-scope-tab-badge">{badge}</span>
        </>
      ) : null}
    </>
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
