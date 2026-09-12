import { useEffect, useRef, useState } from "react";
import {
  CalendarHeart,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import {
  FeatureAlert,
  FeatureLoadingState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { Switch } from "../../components/ui/switch";
import { AppApiError, formatApiErrorDisplay } from "../../lib/apiErrors";
import { ConnectionSectionCard } from "./CrmConnectionAdminParts";
import type { CrmSpecialDateApi } from "./crmSpecialDateApi";
import type {
  CrmSpecialDateConfig,
  CrmSpecialDateType,
  UpdateCrmSpecialDateConfigInput,
} from "./crmSpecialDateTypes";

const specialDateLabels: Record<CrmSpecialDateType, string> = {
  birthday: "Aniversário do cliente",
  purchaseAnniversary: "Aniversário da compra",
  easter: "Páscoa",
  christmas: "Natal",
  mothersDay: "Dia das Mães",
  fathersDay: "Dia dos Pais",
  blackFriday: "Black Friday",
};

const specialDateDescriptions: Record<CrmSpecialDateType, string> = {
  birthday: "Celebre a data de nascimento informada no cadastro do lead.",
  purchaseAnniversary:
    "Lembre a pessoa da compra a partir de uma venda concluída em Vendas.",
  easter: "Envie uma mensagem sazonal para a sua base elegível.",
  christmas: "Envie uma mensagem de Natal para a sua base elegível.",
  mothersDay: "Envie uma mensagem de Dia das Mães para a sua base elegível.",
  fathersDay: "Envie uma mensagem de Dia dos Pais para a sua base elegível.",
  blackFriday: "Avise sua base sobre as condições da Black Friday.",
};

type CrmSpecialDateSettingsProps = {
  api: CrmSpecialDateApi;
  canManage: boolean;
  connectionId: string;
};

export function CrmSpecialDateSettings({
  api,
  canManage,
  connectionId,
}: CrmSpecialDateSettingsProps) {
  const scope = String(connectionId);
  const generationRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const [configs, setConfigs] = useState<CrmSpecialDateConfig[] | null>(null);
  const [persistedConfigs, setPersistedConfigs] = useState<
    CrmSpecialDateConfig[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(canManage);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingType, setSavingType] = useState<CrmSpecialDateType | null>(null);
  const [savedType, setSavedType] = useState<CrmSpecialDateType | null>(null);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    requestRef.current?.abort();
    requestRef.current = null;
    setConfigs(null);
    setPersistedConfigs(null);
    setLoadingError(null);
    setSaveError(null);
    setSavingType(null);
    setSavedType(null);

    if (!canManage) {
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    void api
      .getConfigs(scope, { signal: controller.signal })
      .then((response) => {
        if (generationRef.current !== generation || controller.signal.aborted) {
          return;
        }
        if (!isResponseForScope(response.configs, scope)) {
          setLoadingError(
            "A resposta recebida não pertence à conexão selecionada.",
          );
          return;
        }
        setConfigs(response.configs);
        setPersistedConfigs(response.configs);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || generationRef.current !== generation) {
          return;
        }
        setLoadingError(
          formatApiErrorDisplay(
            caught,
            "Não foi possível carregar as datas especiais.",
          ),
        );
      })
      .finally(() => {
        if (
          generationRef.current === generation &&
          !controller.signal.aborted
        ) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
      if (requestRef.current === controller) requestRef.current = null;
      generationRef.current += 1;
    };
  }, [api, canManage, scope]);

  const updateDraft = (
    dateType: CrmSpecialDateType,
    patch: Partial<CrmSpecialDateConfig>,
  ) => {
    setConfigs(
      (current) =>
        current?.map((config) =>
          config.dateType === dateType ? { ...config, ...patch } : config,
        ) ?? null,
    );
    setSavedType(null);
    setSaveError(null);
  };

  const saveConfig = async (config: CrmSpecialDateConfig) => {
    if (!canManage || savingType !== null) return;
    if (
      !Number.isInteger(config.leadDays) ||
      config.leadDays < 0 ||
      config.leadDays > 30
    ) {
      setSaveError("A antecedência deve estar entre 0 e 30 dias.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(config.sendTime)) {
      setSaveError("Informe um horário válido no fuso BRT.");
      return;
    }

    const generation = generationRef.current;
    const input: UpdateCrmSpecialDateConfigInput = {
      enabled: config.enabled,
      leadDays: config.leadDays,
      messageTemplate: config.messageTemplate,
      sendTime: config.sendTime,
    };
    setSavingType(config.dateType);
    setSaveError(null);
    setSavedType(null);

    try {
      const response = await api.updateConfig(scope, config.dateType, input);
      if (generationRef.current !== generation) return;
      if (
        String(response.config.connectionId) !== scope ||
        response.config.dateType !== config.dateType
      ) {
        setSaveError(
          "A resposta recebida não pertence à conexão ou data selecionada.",
        );
        return;
      }
      setConfigs(
        (current) =>
          current?.map((candidate) =>
            candidate.dateType === response.config.dateType
              ? response.config
              : candidate,
          ) ?? null,
      );
      setPersistedConfigs(
        (current) =>
          current?.map((candidate) =>
            candidate.dateType === response.config.dateType
              ? response.config
              : candidate,
          ) ?? null,
      );
      setSavedType(config.dateType);
    } catch (caught: unknown) {
      if (generationRef.current !== generation) return;
      setSaveError(
        formatSpecialDateError(
          caught,
          "Não foi possível salvar " +
            specialDateLabels[config.dateType].toLocaleLowerCase("pt-BR") +
            ".",
        ),
      );
    } finally {
      if (generationRef.current === generation) setSavingType(null);
    }
  };

  const retry = () => {
    setLoadingError(null);
    setConfigs(null);
    setPersistedConfigs(null);
    setIsLoading(true);
    generationRef.current += 1;
    const generation = generationRef.current;
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    void api
      .getConfigs(scope, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted || generationRef.current !== generation) {
          return;
        }
        if (!isResponseForScope(response.configs, scope)) {
          setLoadingError(
            "A resposta recebida não pertence à conexão selecionada.",
          );
          return;
        }
        setConfigs(response.configs);
        setPersistedConfigs(response.configs);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || generationRef.current !== generation) {
          return;
        }
        setLoadingError(
          formatApiErrorDisplay(
            caught,
            "Não foi possível carregar as datas especiais.",
          ),
        );
      })
      .finally(() => {
        if (
          generationRef.current === generation &&
          !controller.signal.aborted
        ) {
          setIsLoading(false);
        }
      });
  };

  return (
    <ConnectionSectionCard
      className="crm-special-date-settings"
      description="Configure mensagens automáticas para datas importantes da sua base."
      icon={<CalendarHeart aria-hidden="true" />}
      title="Datas especiais"
    >
      <div className="crm-special-date-intro">
        <p>
          Cada conexão mantém sua própria agenda. Escolha a antecedência, o
          horário em BRT e a mensagem que o CRM deve preparar para a sua base.
        </p>
        <div className="crm-special-date-info" role="note">
          <strong>Dados que determinam a data</strong>
          <p>
            Aniversário usa a data de nascimento real informada no cadastro do
            lead. Aniversário da compra só considera vendas concluídas, com a
            data registrada no CRM. Sem esses dados, nenhuma mensagem é criada.
          </p>
          <p>
            Ao desativar uma data, os envios pendentes desse tipo são
            cancelados.
          </p>
        </div>
      </div>

      {!canManage ? (
        <FeatureAlert
          className="crm-special-date-permission"
          icon={<ShieldCheck aria-hidden="true" />}
          title="Acesso restrito"
          tone="warning"
        >
          O CRM e a permissão de configurar conexões são necessários para
          alterar as mensagens de datas especiais.
        </FeatureAlert>
      ) : isLoading ? (
        <FeatureLoadingState
          className="crm-special-date-loading"
          density="compact"
          icon={Loader2}
          title="Carregando datas especiais"
        >
          Buscando as configurações desta conexão.
        </FeatureLoadingState>
      ) : loadingError ? (
        <FeatureAlert
          className="crm-special-date-error"
          icon={<RefreshCw aria-hidden="true" />}
          title="Não foi possível carregar"
        >
          <p>{loadingError}</p>
          <FeatureActionButton
            className="crm-action crm-action-secondary"
            icon={RefreshCw}
            label="Tentar novamente"
            onClick={retry}
          >
            Tentar novamente
          </FeatureActionButton>
        </FeatureAlert>
      ) : (
        <div className="crm-special-date-list">
          {configs?.map((config) => (
            <SpecialDateConfigCard
              config={config}
              isDirty={hasUnsavedChanges(
                config,
                persistedConfigs?.find(
                  (candidate) => candidate.dateType === config.dateType,
                ),
              )}
              isBusy={savingType !== null}
              isSaving={savingType === config.dateType}
              key={config.dateType}
              onChange={updateDraft}
              onSave={() => void saveConfig(config)}
            />
          ))}
          {saveError ? (
            <FeatureAlert
              className="crm-special-date-error"
              icon={<RefreshCw aria-hidden="true" />}
              title="Não foi possível salvar"
            >
              {saveError}
            </FeatureAlert>
          ) : null}
          {savedType ? (
            <FeatureAlert
              className="crm-special-date-success"
              icon={<ShieldCheck aria-hidden="true" />}
              tone="success"
            >
              Configuração de{" "}
              {specialDateLabels[savedType].toLocaleLowerCase("pt-BR")} salva.
            </FeatureAlert>
          ) : null}
        </div>
      )}
    </ConnectionSectionCard>
  );
}

function isResponseForScope(
  configs: readonly CrmSpecialDateConfig[],
  scope: string,
) {
  return configs.every((config) => String(config.connectionId) === scope);
}

function hasUnsavedChanges(
  draft: CrmSpecialDateConfig,
  persisted: CrmSpecialDateConfig | undefined,
) {
  return (
    persisted === undefined ||
    draft.enabled !== persisted.enabled ||
    draft.leadDays !== persisted.leadDays ||
    draft.messageTemplate !== persisted.messageTemplate ||
    draft.sendTime !== persisted.sendTime
  );
}

function formatSpecialDateError(error: unknown, fallback: string) {
  if (error instanceof AppApiError) {
    if (error.code === "CRM_ROUTING_POLICY_BLOCKED") {
      return "A rota de agendamento desta conexão está indisponível. Verifique uma conexão WhatsApp pronta e o roteamento padrão do CRM antes de ativar esta data.";
    }
    if (error.code === "CRM_MESSAGE_ACTION_ERROR" && error.status === 409) {
      return "Esta conexão não é a rota padrão de agendamento. Ajuste o roteamento do CRM ou escolha a conexão definida para agendamentos.";
    }
  }
  return formatApiErrorDisplay(error, fallback);
}

function SpecialDateConfigCard({
  config,
  isBusy,
  isDirty,
  isSaving,
  onChange,
  onSave,
}: {
  config: CrmSpecialDateConfig;
  isBusy: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onChange: (
    dateType: CrmSpecialDateType,
    patch: Partial<CrmSpecialDateConfig>,
  ) => void;
  onSave: () => void;
}) {
  const label = specialDateLabels[config.dateType];
  return (
    <article
      className="crm-special-date-card"
      data-date-type={config.dateType}
      data-enabled={config.enabled ? "true" : "false"}
    >
      <header className="crm-special-date-card-header">
        <div>
          <div className="crm-special-date-card-title">
            <h4>{label}</h4>
            <FeatureStatusBadge
              size="dense"
              tone={
                isDirty ? "warning" : config.enabled ? "success" : "neutral"
              }
            >
              {isDirty
                ? "Alterações não salvas"
                : config.enabled
                  ? "Ativa"
                  : "Desativada"}
            </FeatureStatusBadge>
          </div>
          <p>{specialDateDescriptions[config.dateType]}</p>
        </div>
        <div className="crm-special-date-toggle">
          <span>Enviar mensagem</span>
          <Switch
            aria-label={"Ativar " + label}
            checked={config.enabled}
            disabled={isBusy}
            onCheckedChange={(enabled) =>
              onChange(config.dateType, { enabled })
            }
          />
        </div>
      </header>

      <div className="crm-special-date-fields">
        <FeatureField className="crm-special-date-field" label="Antecedência">
          <span className="crm-special-date-input-with-suffix">
            <FeatureInput
              aria-label={"Antecedência para " + label}
              disabled={isBusy}
              max={30}
              min={0}
              onChange={(event) =>
                onChange(config.dateType, {
                  leadDays: Number(event.target.value) || 0,
                })
              }
              type="number"
              value={config.leadDays}
            />
            <small>dias antes</small>
          </span>
        </FeatureField>
        <FeatureField className="crm-special-date-field" label="Horário (BRT)">
          <FeatureInput
            aria-label={"Horário (BRT) para " + label}
            disabled={isBusy}
            onChange={(event) =>
              onChange(config.dateType, { sendTime: event.target.value })
            }
            step={60}
            type="time"
            value={config.sendTime}
          />
        </FeatureField>
      </div>

      <FeatureField
        className="crm-special-date-field"
        hint={<>Use {"{nome}"} para inserir o nome do lead.</>}
        label="Mensagem"
      >
        <FeatureTextarea
          aria-label={"Mensagem para " + label}
          disabled={isBusy}
          onChange={(event) =>
            onChange(config.dateType, { messageTemplate: event.target.value })
          }
          rows={3}
          value={config.messageTemplate}
        />
      </FeatureField>

      <div className="crm-special-date-card-actions">
        <FeatureActionButton
          className="crm-action crm-action-primary"
          disabled={isBusy}
          icon={Save}
          isBusy={isSaving}
          label="Salvar configuração"
          onClick={onSave}
          variant="primary"
        >
          {isSaving ? "Salvando..." : "Salvar configuração"}
        </FeatureActionButton>
      </div>
    </article>
  );
}
