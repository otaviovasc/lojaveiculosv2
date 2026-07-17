import { Coins, Percent } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  FeatureInput,
  FeatureSegmentedControl,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import { cx } from "../../components/ui/featureShared";
import { Switch } from "../../components/ui/switch";
import { formatCurrencyValue, parseCurrencyInput } from "../../lib/masks";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import { autoEntryPercentageBasisLabel } from "./autoEntryLabels";
import { AutoEntryTimingSelector } from "./AutoEntryTimingSelector";
import type { AutoEntryDraftErrors, AutoEntryRuleDraft } from "./types";

const calculationChoices = [
  { icon: Coins, label: "Valor fixo", value: "fixed" },
  { icon: Percent, label: "Percentual", value: "percentage" },
] as const;

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
        <ChoiceField label="Modelo de cálculo">
          <FeatureSegmentedControl
            ariaLabel="Modelo de cálculo"
            onChange={(calculationKind) => onChange({ calculationKind })}
            options={calculationChoices}
            value={draft.calculationKind}
          />
        </ChoiceField>
        {draft.calculationKind === "fixed" ? (
          <FeatureField error={errors.amountReais} label="Valor fixo (R$)">
            <AffixInput
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
              prefix="R$"
              value={draft.amountReais}
            />
          </FeatureField>
        ) : (
          <FeatureField error={errors.percentage} label="Percentual (%)">
            <AffixInput
              aria-invalid={Boolean(errors.percentage)}
              inputMode="decimal"
              onChange={(event) => onChange({ percentage: event.target.value })}
              placeholder="Ex.: 1,5"
              suffix="%"
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

  return (
    <FeatureFormSection
      description="Defina quando a regra entra na fila e se ela vale para todos os vendedores ou para um vendedor específico da origem."
      title="Execução"
    >
      <AutoEntryTimingSelector
        error={errors.timingValue}
        kind={draft.timingKind}
        onKindChange={(timingKind) => onChange({ timingKind, timingValue: "" })}
        onValueChange={(timingValue) => onChange({ timingValue })}
        value={draft.timingValue}
      />

      <div className="mt-4">
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

function ChoiceField({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="grid gap-2 text-sm font-semibold text-app-text/90">
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="text-xs font-medium text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

function AffixInput({
  className,
  prefix,
  suffix,
  ...props
}: ComponentProps<"input"> & { prefix?: string; suffix?: string }) {
  return (
    <div className="auto-entry-affix">
      {prefix ? (
        <span className="auto-entry-affix__prefix">{prefix}</span>
      ) : null}
      <input {...props} className={cx("auto-entry-affix__input", className)} />
      {suffix ? (
        <span className="auto-entry-affix__suffix">{suffix}</span>
      ) : null}
    </div>
  );
}
