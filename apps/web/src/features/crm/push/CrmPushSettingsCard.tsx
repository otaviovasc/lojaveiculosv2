import { Bell, BellOff, RefreshCcw } from "lucide-react";
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardHeader,
  FeatureCardTitle,
} from "../../../components/ui/FeatureCards";
import { FeatureActionButton } from "../../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureStatusBadge,
} from "../../../components/ui/FeatureStates";
import { Switch } from "../../../components/ui/switch";
import type { CrmPushStatus } from "./types";
import { useCrmPush } from "./CrmPushProvider";

const statusPresentation: Record<
  CrmPushStatus,
  { label: string; tone: "danger" | "neutral" | "success" | "warning" }
> = {
  blocked: { label: "Bloqueadas no navegador", tone: "danger" },
  default: { label: "Permissão necessária", tone: "neutral" },
  degraded: { label: "Indisponíveis", tone: "warning" },
  disabled: { label: "Desativadas", tone: "neutral" },
  enabled: { label: "Ativadas", tone: "success" },
  requesting: { label: "Aguardando permissão", tone: "warning" },
  saving: { label: "Salvando", tone: "warning" },
  unsupported: { label: "Navegador incompatível", tone: "warning" },
};

export function CrmPushSettingsCard() {
  const push = useCrmPush();
  const busy = push.status === "requesting" || push.status === "saving";
  const presentation = statusPresentation[push.status];
  const canToggle =
    push.available &&
    push.status !== "unsupported" &&
    push.status !== "blocked" &&
    push.status !== "degraded";

  return (
    <FeatureCard ariaLabel="Notificações do CRM" padding="comfortable">
      <FeatureCardHeader
        actions={
          <FeatureStatusBadge tone={presentation.tone}>
            {presentation.label}
          </FeatureStatusBadge>
        }
        icon={
          <span className="flex size-10 items-center justify-center rounded-lg border border-line bg-app-elevated text-accent">
            {push.status === "enabled" ? (
              <Bell aria-hidden="true" className="size-5" />
            ) : (
              <BellOff aria-hidden="true" className="size-5" />
            )}
          </span>
        }
      >
        <FeatureCardTitle>Novas mensagens do CRM</FeatureCardTitle>
        <FeatureCardDescription className="mt-1">
          Receba um aviso quando um cliente enviar uma nova mensagem. A
          preferência vale para esta loja; o navegador é vinculado à sua conta.
        </FeatureCardDescription>
      </FeatureCardHeader>

      {push.error ? (
        <FeatureAlert className="mt-5" tone="warning">
          {push.error}
        </FeatureAlert>
      ) : null}

      {push.status === "blocked" ? (
        <FeatureAlert className="mt-5" tone="warning">
          Libere as notificações nas configurações do navegador e atualize esta
          página.
        </FeatureAlert>
      ) : null}

      <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <label
            className="text-sm font-bold text-app-text"
            htmlFor="crm-push-preference"
          >
            Receber notificações nesta loja
          </label>
          <p className="mt-1 text-xs font-medium text-muted">
            A primeira ativação solicita a permissão do navegador.
          </p>
        </div>
        <Switch
          aria-label="Receber notificações nesta loja"
          checked={push.preferenceEnabled && push.status === "enabled"}
          disabled={!canToggle || busy}
          id="crm-push-preference"
          onCheckedChange={(enabled) => void push.setPreferenceEnabled(enabled)}
        />
      </div>

      {push.status === "blocked" || push.status === "degraded" ? (
        <div className="mt-4 flex justify-end">
          <FeatureActionButton
            icon={RefreshCcw}
            isBusy={busy}
            label="Verificar novamente"
            onClick={() => void push.refresh()}
          />
        </div>
      ) : null}
    </FeatureCard>
  );
}
