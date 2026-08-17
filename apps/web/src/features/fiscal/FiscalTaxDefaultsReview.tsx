import {
  FileText,
  ListChecks,
  ListPlus,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import "../../styles/fiscal-setup.css";
import {
  FeatureInput,
  FeatureSegmentedControl,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { Toast } from "../../components/ui/Toast";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import {
  formatFiscalDefaultValue,
  getFiscalDefaultLabel,
  getFiscalDefaultsStatusLabel,
  getFiscalDefaultsStatusTone,
} from "./fiscalConnectionDisplay";
import {
  buildReviewedTaxDefaults,
  createTaxDefaultsFormValues,
  FISCAL_DEFAULTS_GROUP_LABELS,
  FISCAL_DEFAULTS_REQUIRED_FIELDS,
  getBackendMissingFields,
  getFiscalDefaultsFieldLabel,
  listFiscalDefaultsExtraEntries,
  listMissingRequiredTaxDefaults,
  type FiscalDefaultsField,
} from "./fiscalTaxDefaultsModel";
import type { FiscalConnection } from "./types";

type Props = {
  api: FiscalApi;
  connection: FiscalConnection;
  onConnectionChange: (connection: FiscalConnection) => void;
};

type DefaultsGroup = "extras" | "nfe" | "nfse";

export function FiscalTaxDefaultsReview({
  api,
  connection,
  onConnectionChange,
}: Props) {
  const hasImportedDefaults = Object.keys(connection.taxDefaults).length > 0;
  const [edits, setEdits] = useState<Record<string, string>>(() =>
    createTaxDefaultsFormValues(connection.taxDefaults),
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [activeGroup, setActiveGroup] = useState<DefaultsGroup>("nfe");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendMissing, setBackendMissing] = useState<readonly string[]>([]);
  const [toast, setToast] = useState<{ title: string } | null>(null);

  const confirmed = connection.defaultsStatus === "confirmed";
  const reviewedDefaults = buildReviewedTaxDefaults(
    connection.taxDefaults,
    edits,
  );
  const missingPaths = listMissingRequiredTaxDefaults(reviewedDefaults);
  const canConfirm =
    hasImportedDefaults && acknowledged && !busy && missingPaths.length === 0;
  const extraEntries = listFiscalDefaultsExtraEntries(connection.taxDefaults);
  const fieldsDisabled = busy || confirmed;

  const updateEdit = (path: string, value: string) => {
    setEdits((current) => ({ ...current, [path]: value }));
  };

  const confirmTaxDefaults = async () => {
    setBusy(true);
    setError(null);
    setBackendMissing([]);
    try {
      onConnectionChange(
        await api.confirmDefaults({ taxDefaults: reviewedDefaults }),
      );
      setToast({ title: "Padrões fiscais confirmados com sucesso." });
    } catch (cause) {
      const missing = getBackendMissingFields(cause);
      setBackendMissing(missing);
      const missingDetail = missing.length
        ? ` Campos pendentes segundo a API: ${missing
            .map(getFiscalDefaultsFieldLabel)
            .join(", ")}.`
        : "";
      setError(
        `${formatApiErrorDisplay(
          cause,
          "Não foi possível confirmar os padrões fiscais. Nenhuma operação oficial foi executada.",
        )}${missingDetail}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const renderRequiredField = (field: FiscalDefaultsField) => {
    const value = edits[field.path] ?? "";
    const missing = value.trim() === "";
    const flagged = missing || backendMissing.includes(field.path);
    const errorText = flagged
      ? "Obrigatório para liberar a emissão."
      : undefined;
    if (field.kind === "boolean") {
      return (
        <FeatureField
          as="div"
          error={errorText}
          hint={field.hint}
          key={field.path}
          label={field.label}
        >
          <FeatureSegmentedControl
            ariaLabel={field.label}
            disabled={fieldsDisabled}
            onChange={(next) => updateEdit(field.path, next)}
            options={[
              { label: "Sim", value: "true" },
              { label: "Não", value: "false" },
            ]}
            value={value}
          />
        </FeatureField>
      );
    }
    if (field.kind === "select") {
      const known = field.options ?? [];
      const options = [
        { disabled: true, label: "Selecione…", value: "" },
        ...known,
        ...(value && !known.some((option) => option.value === value)
          ? [{ label: `${value} (importado do provedor)`, value }]
          : []),
      ];
      return (
        <FeatureField
          as="div"
          error={errorText}
          hint={field.hint}
          key={field.path}
          label={field.label}
        >
          <FeatureSelect
            ariaLabel={field.label}
            disabled={fieldsDisabled}
            onChange={(next) => updateEdit(field.path, next)}
            options={options}
            placeholder="Selecione…"
            value={value}
          />
        </FeatureField>
      );
    }
    return (
      <FeatureField
        error={errorText}
        hint={field.hint}
        key={field.path}
        label={field.label}
      >
        <FeatureInput
          aria-label={field.label}
          disabled={fieldsDisabled}
          inputMode={field.numeric ? "numeric" : undefined}
          onChange={(event) => updateEdit(field.path, event.target.value)}
          value={value}
        />
      </FeatureField>
    );
  };

  const groupPendingCount = (group: "nfe" | "nfse") =>
    FISCAL_DEFAULTS_REQUIRED_FIELDS.filter(
      (field) =>
        field.group === group &&
        ((edits[field.path] ?? "").trim() === "" ||
          backendMissing.includes(field.path)),
    ).length;

  const groupStatusBadge = (group: "nfe" | "nfse") => {
    if (!hasImportedDefaults || confirmed) return null;
    const pending = groupPendingCount(group);
    return pending > 0 ? (
      <FeatureStatusBadge size="dense" tone="warning">
        {pending} pendente{pending === 1 ? "" : "s"}
      </FeatureStatusBadge>
    ) : (
      <FeatureStatusBadge size="dense" tone="success">
        Completo
      </FeatureStatusBadge>
    );
  };

  const renderRequiredGroup = (group: "nfe" | "nfse") => (
    <section
      aria-label={FISCAL_DEFAULTS_GROUP_LABELS[group]}
      className="fiscal-setup-section"
      hidden={activeGroup !== group}
      key={group}
      role="tabpanel"
    >
      <div className="fiscal-setup-section-header">
        <h4 className="fiscal-setup-section-label">
          {FISCAL_DEFAULTS_GROUP_LABELS[group]}
        </h4>
        {groupStatusBadge(group)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {FISCAL_DEFAULTS_REQUIRED_FIELDS.filter(
          (field) => field.group === group,
        ).map(renderRequiredField)}
      </div>
    </section>
  );

  const extrasGroup = (
    <section
      aria-label="Outros valores importados do provedor"
      className="fiscal-setup-section"
      hidden={activeGroup !== "extras"}
      role="tabpanel"
    >
      <div className="fiscal-setup-section-header">
        <h4 className="fiscal-setup-section-label">
          Outros valores importados do provedor
        </h4>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {extraEntries.map((entry) => {
          const label = getFiscalDefaultLabel(
            entry.path.split(".").at(-1) ?? entry.path,
          );
          if (!entry.editable) {
            return (
              <FeatureField
                hint="Valor estruturado importado do provedor; preservado na confirmação."
                key={entry.path}
                label={label}
              >
                <FeatureInput
                  aria-label={label}
                  disabled
                  readOnly
                  value={formatFiscalDefaultValue(entry.value)}
                />
              </FeatureField>
            );
          }
          return (
            <FeatureField key={entry.path} label={label}>
              <FeatureInput
                aria-label={label}
                disabled={fieldsDisabled}
                inputMode={
                  typeof entry.value === "number" ? "decimal" : undefined
                }
                onChange={(event) => updateEdit(entry.path, event.target.value)}
                value={edits[entry.path] ?? ""}
              />
            </FeatureField>
          );
        })}
      </div>
    </section>
  );

  return (
    <section className="fiscal-setup-panel">
      {toast ? (
        <Toast
          durationMs={4000}
          onDismiss={() => setToast(null)}
          title={toast.title}
          tone="success"
        />
      ) : null}
      <div aria-hidden="true" className="fiscal-setup-panel__blob" />
      <span aria-hidden="true" className="fiscal-setup-panel__watermark">
        <ListChecks />
      </span>

      <header className="fiscal-setup-panel__header">
        <div className="flex min-w-0 items-start gap-3">
          <span className="fiscal-setup-panel__icon">
            <ListChecks aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="fiscal-setup-panel__eyebrow">Revisão do provedor</p>
            <h3 className="fiscal-setup-panel__title">
              Padrões fiscais da loja
            </h3>
            <p className="fiscal-setup-panel__description">
              Valores fiscais padrão importados do provedor. A emissão só é
              liberada depois da confirmação.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <FeatureStatusBadge
            tone={getFiscalDefaultsStatusTone(connection.defaultsStatus)}
          >
            {getFiscalDefaultsStatusLabel(connection.defaultsStatus)}
          </FeatureStatusBadge>
        </div>
      </header>

      <div className="fiscal-setup-panel__body">
        {connection.defaultsStatus === "unconfirmed" ? (
          <FeatureAlert tone="warning">
            Estes valores foram importados da Spedy e ainda não foram
            confirmados pela loja. Revise campo a campo antes de confirmar: a
            emissão permanece bloqueada até a confirmação.
          </FeatureAlert>
        ) : null}

        {!hasImportedDefaults ? (
          <p className="text-sm font-medium text-muted">
            Nenhum padrão fiscal importado ainda. Salve os dados da empresa e
            sincronize com o provedor para importar os valores.
          </p>
        ) : (
          <>
            <FeatureTabs<DefaultsGroup>
              ariaLabel="Grupos de padrões fiscais"
              onChange={setActiveGroup}
              options={[
                { icon: FileText, label: "NF-e", value: "nfe" },
                { icon: ScrollText, label: "NFS-e", value: "nfse" },
                ...(extraEntries.length > 0
                  ? [
                      {
                        icon: ListPlus,
                        label: `Outros valores (${extraEntries.length})`,
                        value: "extras" as const,
                      },
                    ]
                  : []),
              ]}
              value={activeGroup}
              variant="panel"
            />
            {renderRequiredGroup("nfe")}
            {renderRequiredGroup("nfse")}
            {extraEntries.length > 0 ? extrasGroup : null}
          </>
        )}

        {hasImportedDefaults && missingPaths.length > 0 && !confirmed ? (
          <FeatureAlert tone="warning">
            Campos obrigatórios pendentes:{" "}
            {missingPaths.map(getFiscalDefaultsFieldLabel).join(", ")}. Preencha
            todos antes de confirmar.
          </FeatureAlert>
        ) : null}

        {hasImportedDefaults && !confirmed ? (
          <label className="fiscal-setup-ack">
            <input
              aria-label="Confirmo que revisei os padrões fiscais"
              checked={acknowledged}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
              disabled={busy}
              onChange={(event) => setAcknowledged(event.target.checked)}
              type="checkbox"
            />
            <span>
              Revisei cada campo e confirmo que estes padrões fiscais estão
              corretos para as operações desta loja.
            </span>
          </label>
        ) : null}

        {confirmed && connection.defaultsConfirmedAt ? (
          <FeatureAlert tone="success">
            Padrões confirmados pela loja. Qualquer alteração exige uma nova
            revisão antes da emissão.
          </FeatureAlert>
        ) : null}

        {error ? <FeatureAlert>{error}</FeatureAlert> : null}

        {!confirmed && hasImportedDefaults ? (
          <div className="flex justify-end">
            <FeatureActionButton
              disabled={!canConfirm}
              icon={ShieldCheck}
              isBusy={busy}
              label="Confirmar padrões fiscais"
              onClick={() => void confirmTaxDefaults()}
              title={
                missingPaths.length > 0
                  ? "Preencha os campos obrigatórios antes de confirmar"
                  : acknowledged
                    ? "Confirmar os padrões fiscais revisados"
                    : "Marque a confirmação de revisão antes de confirmar"
              }
              variant="primary"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
