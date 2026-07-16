import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import { Switch } from "../../components/ui/switch";
import { formatCurrencyValue, parseCurrencyInput } from "../../lib/masks";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import { autoEntryPercentageBasisLabel } from "./autoEntryLabels";
import { autoEntryCalculationOptions, autoEntryTimingOptions } from "./model";
import type { AutoEntryDraftErrors, AutoEntryRuleDraft } from "./types";

export function AutoEntryCalculationSection({
  draft,
  errors,
  onChange,
}: {
  draft: AutoEntryRuleDraft;
  errors: AutoEntryDraftErrors;
  onChange: (patch: Partial<AutoEntryRuleDraft>) => void;
}) {
  return (
    <FeatureFormSection
      description="Escolha um valor fixo ou um percentual calculado sobre a origem."
      title="Cálculo"
    >
      <FeatureFieldGroup>
        <FeatureField label="Modelo de cálculo">
          <FeatureSelect
            ariaLabel="Modelo de cálculo"
            onChange={(calculationKind) => onChange({ calculationKind })}
            options={autoEntryCalculationOptions}
            value={draft.calculationKind}
          />
        </FeatureField>
        {draft.calculationKind === "fixed" ? (
          <FeatureField error={errors.amountReais} label="Valor fixo (R$)">
            <FeatureInput
              aria-invalid={Boolean(errors.amountReais)}
              inputMode="decimal"
              onChange={(event) =>
                onChange({
                  amountReais: formatCurrencyValue(
                    parseCurrencyInput(event.target.value),
                  ),
                })
              }
              placeholder="Ex.: 500,00"
              value={draft.amountReais}
            />
          </FeatureField>
        ) : (
          <FeatureField error={errors.percentage} label="Percentual (%)">
            <FeatureInput
              aria-invalid={Boolean(errors.percentage)}
              inputMode="decimal"
              onChange={(event) => onChange({ percentage: event.target.value })}
              placeholder="Ex.: 1,5"
              value={draft.percentage}
            />
          </FeatureField>
        )}
      </FeatureFieldGroup>
      {draft.calculationKind === "percentage" ? (
        <div className="mt-3 rounded-lg border border-line/60 bg-app-elevated p-3">
          <p className="text-xs font-black uppercase tracking-wider text-muted">
            Base do percentual
          </p>
          <p className="mt-1 text-sm font-black text-app-text">
            {autoEntryPercentageBasisLabel(draft.calculationBasis)}
          </p>
          <p className="mt-1 text-xs font-bold text-muted">
            A base salva é preservada ao editar. Ao trocar o evento, a base
            padrão do novo evento é aplicada.
          </p>
        </div>
      ) : null}
    </FeatureFormSection>
  );
}

export function AutoEntryExecutionSection({
  draft,
  errors,
  onChange,
  sellers,
}: {
  draft: AutoEntryRuleDraft;
  errors: AutoEntryDraftErrors;
  onChange: (patch: Partial<AutoEntryRuleDraft>) => void;
  sellers: readonly SaleSellerOption[];
}) {
  const sellerOptions = [
    { label: "Qualquer vendedor da origem", value: "__any__" },
    ...sellers.map((seller) => ({
      label: `${seller.label} · ${seller.detail}`,
      value: seller.id,
    })),
  ];
  const timingHint =
    draft.timingKind === "days_after" ? "De 1 a 365 dias" : "De 1 a 31";

  return (
    <FeatureFormSection
      description="Defina quando a regra entra na fila e se ela vale para todos os vendedores ou para um vendedor específico da origem."
      title="Execução"
    >
      <FeatureFieldGroup>
        <FeatureField label="Momento do lançamento">
          <FeatureSelect
            ariaLabel="Momento do lançamento"
            onChange={(timingKind) => onChange({ timingKind, timingValue: "" })}
            options={autoEntryTimingOptions}
            value={draft.timingKind}
          />
        </FeatureField>
        {draft.timingKind !== "same_day" ? (
          <FeatureField
            error={errors.timingValue}
            hint={timingHint}
            label={draft.timingKind === "days_after" ? "Quantidade" : "Dia"}
          >
            <FeatureInput
              aria-invalid={Boolean(errors.timingValue)}
              inputMode="numeric"
              max={draft.timingKind === "days_after" ? 365 : 31}
              min={1}
              onChange={(event) =>
                onChange({ timingValue: event.target.value })
              }
              type="number"
              value={draft.timingValue}
            />
          </FeatureField>
        ) : (
          <div className="flex items-center rounded-lg border border-line/60 bg-app-elevated px-3 text-sm font-bold text-muted">
            O lançamento será criado na data segura informada pelo evento.
          </div>
        )}
      </FeatureFieldGroup>

      <div className="mt-3">
        <FeatureFieldGroup>
          <FeatureField
            hint="Regras globais e específicas são aditivas; o lançamento recebe o vendedor do evento de origem."
            label="Vendedor da origem"
          >
            <FeatureSelect
              ariaLabel="Vendedor da origem"
              onChange={(value) =>
                onChange({ sellerUserId: value === "__any__" ? "" : value })
              }
              options={sellerOptions}
              value={draft.sellerUserId || "__any__"}
            />
          </FeatureField>
          <FeatureField
            error={errors.priority}
            hint="0 é baixa; 100 é máxima."
            label="Prioridade"
          >
            <FeatureInput
              aria-invalid={Boolean(errors.priority)}
              inputMode="numeric"
              max={100}
              min={0}
              onChange={(event) => onChange({ priority: event.target.value })}
              type="number"
              value={draft.priority}
            />
          </FeatureField>
        </FeatureFieldGroup>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-line/60 bg-app-elevated p-3">
        <div>
          <p className="text-sm font-black text-app-text">Regra ativa</p>
          <p className="text-xs font-bold text-muted">
            Regras pausadas permanecem visíveis e não geram lançamentos.
          </p>
        </div>
        <Switch
          aria-label="Regra ativa"
          checked={draft.status === "active"}
          onCheckedChange={(checked) =>
            onChange({ status: checked ? "active" : "inactive" })
          }
        />
      </div>
    </FeatureFormSection>
  );
}
