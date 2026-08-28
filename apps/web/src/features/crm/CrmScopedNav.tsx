import {
  CalendarClock,
  ChartNoAxesCombined,
  CarFront,
  MessageSquareText,
  Megaphone,
  PlugZap,
  Radio,
  Tag,
} from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { CrmConversationMobileNav } from "./CrmConversationMobileNav";
import type { CrmConnectionStatus } from "./crmConnectionStatus";
export type CrmScope =
  | "campaigns"
  | "connection"
  | "conversations"
  | "integrations"
  | "schedules"
  | "statistics"
  | "tags"
  | "visits";

export type CrmScopeOption = {
  icon: typeof MessageSquareText;
  id: CrmScope;
  label: string;
};

const scopes: CrmScopeOption[] = [
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
    icon: ChartNoAxesCombined,
    id: "statistics",
    label: "Estatísticas",
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

export function CrmScopedNav({
  activeScope,
  onChange,
  providerStatus,
  realtimeStatus,
  tagCount,
  unreadCount,
}: {
  activeScope: CrmScope;
  onChange: (scope: CrmScope) => void;
  providerStatus: CrmConnectionStatus;
  realtimeStatus: CrmConnectionStatus;
  tagCount: number;
  unreadCount: number;
}) {
  return (
    <>
      <nav className="crm-scope-nav" aria-label="WhatsApp CRM">
        <strong className="crm-scope-brand">CRM</strong>
        <FeatureTabs
          activeClassName="crm-scope-tab-active"
          ariaLabel="Áreas do WhatsApp CRM"
          className="crm-scope-tabs"
          onChange={onChange}
          optionClassName="crm-scope-tab"
          options={scopes.map((scope) => {
            const badge = readBadge(scope.id, { tagCount, unreadCount });
            return {
              ariaLabel: badge ? `${scope.label} ${badge}` : scope.label,
              icon: scope.icon,
              label: createScopeLabel(scope, { tagCount, unreadCount }),
              value: scope.id,
            };
          })}
          value={activeScope}
        />
        <div
          aria-atomic="true"
          aria-label={`${providerStatus.label}. ${realtimeStatus.label}`}
          aria-live="polite"
          className="crm-scope-trailing"
          role="status"
        >
          <span
            aria-hidden="true"
            className={`crm-status crm-scope-status crm-status-${providerStatus.tone}`}
          >
            <span aria-hidden="true" />
            {providerStatus.label}
          </span>{" "}
          <span
            aria-hidden="true"
            className={`crm-status crm-scope-status crm-status-${realtimeStatus.tone}`}
          >
            <span aria-hidden="true" />
            {realtimeStatus.label}
          </span>
        </div>
      </nav>
      <CrmConversationMobileNav
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
  const label =
    scope.id === "schedules" ? (
      <>
        <span className="crm-scope-tab-label-full">{scope.label}</span>
        <span aria-hidden="true" className="crm-scope-tab-label-compact">
          Agendar Msg
        </span>
      </>
    ) : (
      scope.label
    );
  return (
    <>
      <strong>{label}</strong>
      {badge ? (
        <>
          {" "}
          <span className="crm-scope-tab-badge">{badge}</span>
        </>
      ) : null}
    </>
  );
}

function readBadge(
  scope: CrmScope,
  input: { tagCount: number; unreadCount: number },
) {
  if (scope === "conversations" && input.unreadCount > 0) {
    return String(input.unreadCount);
  }
  if (scope === "tags" && input.tagCount > 0) return String(input.tagCount);
  return null;
}
