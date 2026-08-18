import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { readCrmCapabilityLabel } from "./crmChannelPresentation";
import { readCrmWhatsappProviderLabel } from "./crmWhatsappConnectionStatus";
import type {
  CrmBotRoutingMode,
  CrmChannelRouting,
  CrmRoutingCandidate,
  CrmRoutingChannel,
  CrmRoutingPolicy,
} from "./crmRoutingTypes";

const botModeOptions = [
  { label: "Desativado neste canal", value: "disabled" },
  { label: "Herdar padrão do CRM", value: "inherit_store_default" },
  { label: "Escolher conexão", value: "explicit_connection" },
] as const;

/**
 * Focused editor for a single channel route. Only server-confirmed ready
 * connections compatible with the channel are selectable; blocked or missing
 * routes surface as empty selections, never as hidden sentinel values.
 */
export function CrmChannelRoutingEditDialog({
  api,
  candidates,
  channel,
  channelLabel,
  onClose,
  onSaved,
  policy,
}: {
  api: Pick<CrmWhatsappApi, "updateRoutingPolicy">;
  candidates: readonly CrmRoutingCandidate[];
  channel: CrmRoutingChannel;
  channelLabel: string;
  onClose: () => void;
  onSaved: (next: CrmRoutingPolicy, channel: CrmRoutingChannel) => void;
  policy: CrmChannelRouting | null;
}) {
  const readyCandidates = candidates.filter(
    (candidate) => candidate.channel === channel && candidate.ready,
  );
  const [defaultConnectionId, setDefaultConnectionId] = useState(
    () => policy?.storeDefault.connection?.id ?? "",
  );
  const [botMode, setBotMode] = useState<CrmBotRoutingMode>(
    () => policy?.bot.mode ?? "disabled",
  );
  const [botConnectionId, setBotConnectionId] = useState(
    () => policy?.bot.connection?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const defaultOptions = [
    { label: "Sem conexão padrão", value: "" },
    ...readyCandidates.map((candidate) => ({
      label: candidateLabel(candidate),
      value: candidate.id,
    })),
  ];
  const botOptions = defaultOptions.filter((option) => option.value !== "");
  const requiredCapabilities = policy?.storeDefault.requiredCapabilities ?? [];

  const save = async () => {
    if (isSaving) return;
    if (
      botMode === "explicit_connection" &&
      (!botConnectionId ||
        !readyCandidates.some((candidate) => candidate.id === botConnectionId))
    ) {
      setError("Escolha uma conexão pronta para o bot externo neste canal.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const next = await api.updateRoutingPolicy({
        bot: {
          mode: botMode,
          ...(botMode === "explicit_connection"
            ? { connectionId: botConnectionId }
            : {}),
        },
        channel,
        defaultConnectionId: defaultConnectionId || null,
      });
      onSaved(next, channel);
      onClose();
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Não foi possível salvar esta rota."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FeatureDialog
      className="feature-dialog--medium crm-routing-dialog"
      description={`Somente conexões prontas e compatíveis com ${channelLabel} aparecem como opção.`}
      footer={
        <FeatureDialogActions
          confirmLabel="Salvar rota"
          isLoading={isSaving}
          loadingLabel="Salvando"
          onCancel={onClose}
          onConfirm={() => void save()}
        />
      }
      isOpen
      onClose={onClose}
      title={`Rota do canal · ${channelLabel}`}
    >
      <div className="crm-routing-dialog-body">
        <FeatureField
          hint="Usada pelo CRM; o filtro da caixa de entrada não altera esta escolha."
          label="Padrão do CRM"
        >
          <FeatureSelect
            ariaLabel={`Conexão padrão de ${channelLabel}`}
            disabled={isSaving}
            emptyMessage="Nenhuma conexão pronta"
            onChange={setDefaultConnectionId}
            options={defaultOptions}
            searchable={defaultOptions.length > 5}
            value={defaultConnectionId}
          />
        </FeatureField>
        {requiredCapabilities.length ? (
          <p className="crm-routing-capability-note" role="note">
            Esta rota exige:{" "}
            {requiredCapabilities.map(readCrmCapabilityLabel).join(", ")}.
          </p>
        ) : null}
        {!readyCandidates.length ? (
          <p className="crm-routing-capability-note" role="note">
            Nenhuma conexão pronta para este canal. Conclua a configuração de um
            canal antes de definir a rota.
          </p>
        ) : null}
        <details className="crm-routing-bot">
          <summary>Bot externo (opcional)</summary>
          <div className="crm-routing-bot-fields">
            <FeatureField
              hint="Desative neste canal, herde o padrão do CRM ou escolha uma conta específica."
              label="Bot externo"
            >
              <FeatureSelect
                ariaLabel={`Modo do bot em ${channelLabel}`}
                disabled={isSaving}
                onChange={(value) => setBotMode(value as CrmBotRoutingMode)}
                options={[...botModeOptions]}
                value={botMode}
              />
            </FeatureField>
            {botMode === "explicit_connection" ? (
              <FeatureField label="Conexão explícita do bot">
                <FeatureSelect
                  ariaLabel={`Conexão explícita do bot em ${channelLabel}`}
                  disabled={isSaving}
                  emptyMessage="Nenhuma conexão pronta"
                  onChange={setBotConnectionId}
                  options={botOptions}
                  searchable={botOptions.length > 5}
                  value={botConnectionId}
                />
              </FeatureField>
            ) : null}
          </div>
        </details>
        {error ? (
          <p className="crm-routing-row-error" role="alert">
            {isSaving ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : null}
            {error}
          </p>
        ) : null}
      </div>
    </FeatureDialog>
  );
}

function candidateLabel(candidate: CrmRoutingCandidate) {
  const identity = [candidate.displayName, candidate.phone]
    .filter(Boolean)
    .join(" · ");
  return `${readCrmWhatsappProviderLabel(candidate.provider)} · ${identity || "Conexão sem nome"}`;
}
