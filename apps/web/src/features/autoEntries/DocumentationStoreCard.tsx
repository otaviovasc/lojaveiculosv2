import { useEffect, useMemo, useState } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import {
  AutoEntryDomainCard,
  AutoEntryInlineError,
  AutoEntrySaveAction,
  AutoEntryValueOrigin,
} from "./AutoEntryDomainPrimitives";
import {
  findRule,
  parseRatePpm,
  rateRule,
  ruleMoneyInput,
  ruleRateInput,
  toMutation,
  validMoney,
} from "./domainModel";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";

export function DocumentationStoreCard({
  canManage,
  isSaving,
  onSave,
  rules,
}: AutoEntryDomainPanelProps) {
  const existing = useMemo(
    () => ({
      lien: findRule(rules, "transfer.cost.lien"),
      noLien: findRule(rules, "transfer.cost.no_lien"),
      revenue: findRule(rules, "transfer.revenue"),
    }),
    [rules],
  );
  const stored = useMemo(
    () => ({
      lien: ruleMoneyInput(existing.lien),
      noLien: ruleMoneyInput(existing.noLien),
      revenue: ruleRateInput(existing.revenue),
    }),
    [existing],
  );
  const [values, setValues] = useState(stored);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setValues(stored), [stored]);

  const save = () => {
    const lien = validMoney(values.lien);
    const noLien = validMoney(values.noLien);
    const revenue = parseRatePpm(values.revenue);
    if (lien === null || noLien === null || revenue === null) {
      setError("Informe custos positivos e uma receita entre 0,0001% e 100%.");
      return;
    }
    setError(null);
    const cost = (
      amountCents: number,
      hasLien: boolean,
      ruleKey: string,
      current: typeof existing.lien,
    ) =>
      toMutation(current, {
        calculation: { amountCents, kind: "fixed" },
        category: "Documentação",
        conditions: { transferHasLien: hasLien },
        event: "transfer_documentation_charged",
        family: "transfer.cost",
        metadata: current?.metadata ?? {
          policy: { product: "transfer", transferHasLien: hasLien },
        },
        name: `Custo de transferência ${hasLien ? "com" : "sem"} gravame`,
        outputType: "expense",
        priority: 0,
        recipient: { kind: "none" },
        resolution: "additive",
        ruleKey,
        sellerUserId: null,
        status: "active",
        timing: { kind: "same_day" },
      });
    const revenueInput = rateRule({
      basis: "documentation",
      event: "transfer_documentation_charged",
      family: "transfer.revenue",
      name: "Receita de documentação",
      outputType: "revenue",
      ratePpm: revenue,
      recipient: { kind: "none" },
      resolution: "additive",
      ruleKey: "transfer.revenue",
    });
    revenueInput.category = "Documentação";
    revenueInput.metadata = {
      ...(existing.revenue?.metadata ?? {}),
      policy: { product: "transfer", storeSharePpm: revenue },
    };
    void onSave([
      cost(noLien, false, "transfer.cost.no_lien", existing.noLien),
      cost(lien, true, "transfer.cost.lien", existing.lien),
      toMutation(existing.revenue, revenueInput),
    ]);
  };

  return (
    <AutoEntryDomainCard
      description="Registra o custo da transferência e a parcela da documentação que entra como receita."
      title="Custos e receita da loja"
    >
      <AutoEntryValueOrigin active={Object.values(stored).every(Boolean)} />
      <FeatureFieldGroup>
        <MoneyField
          label="Custo sem gravame"
          onChange={(noLien) => setValues({ ...values, noLien })}
          placeholder="500,00"
          value={values.noLien}
        />
        <MoneyField
          label="Custo com gravame"
          onChange={(lien) => setValues({ ...values, lien })}
          placeholder="550,00"
          value={values.lien}
        />
      </FeatureFieldGroup>
      <FeatureField
        hint="100% registra toda a cobrança como receita antes dos custos."
        label="Parcela da cobrança (%)"
      >
        <FeatureInput
          inputMode="decimal"
          onChange={(event) =>
            setValues({ ...values, revenue: event.target.value })
          }
          placeholder="100"
          value={values.revenue}
        />
      </FeatureField>
      <AutoEntryInlineError message={error} />
      <AutoEntrySaveAction
        canManage={canManage}
        isSaving={isSaving}
        onClick={save}
      />
    </AutoEntryDomainCard>
  );
}

function MoneyField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <FeatureField label={`${label} (R$)`}>
      <FeatureInput
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </FeatureField>
  );
}
