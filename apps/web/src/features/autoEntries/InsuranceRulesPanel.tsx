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
  formatRatePpm,
  parseRatePpm,
  rateRule,
  readPolicyNumber,
  ruleRateInput,
  toMutation,
} from "./domainModel";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";
import type { AutoEntryRule } from "./types";

type Values = {
  seller: string;
  storeShare: string;
};

const appliedCommissionPercentage = { default: 10, max: 20, min: 10 } as const;

export function InsuranceRulesPanel({
  canManage,
  isSaving,
  onSave,
  rules,
}: AutoEntryDomainPanelProps) {
  const store = useMemo(() => findRule(rules, "insurance.store"), [rules]);
  const seller = useMemo(() => findRule(rules, "insurance.seller"), [rules]);
  const stored = useMemo<Values>(
    () => ({
      seller: ruleRateInput(seller),
      storeShare: policyRateInput(store, "storeSharePpm"),
    }),
    [seller, store],
  );
  const [values, setValues] = useState(stored);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setValues(stored), [stored]);

  const save = () => {
    const storeSharePpm = parseRatePpm(values.storeShare);
    const sellerRatePpm = parseRatePpm(values.seller);
    if (storeSharePpm === null || sellerRatePpm === null) {
      setError(
        "Use percentuais válidos para a parcela da loja e a comissão do vendedor.",
      );
      return;
    }
    const storeInput = rateRule({
      basis: "insurance_commission",
      event: "insurance_issued",
      family: "insurance.store",
      name: "Receita da loja no seguro",
      outputType: "revenue",
      ratePpm: storeSharePpm,
      recipient: { kind: "none" },
      resolution: "additive",
      ruleKey: "insurance.store",
    });
    storeInput.category = "Seguro";
    storeInput.metadata = {
      ...(store?.metadata ?? {}),
      policy: {
        appliedCommissionPercentage,
        product: "insurance",
        storeSharePpm,
      },
    };
    const sellerInput = rateRule({
      basis: "premium",
      event: "insurance_issued",
      family: "insurance.seller",
      name: "Comissão do vendedor no seguro",
      outputType: "commission",
      ratePpm: sellerRatePpm,
      recipient: { kind: "event_seller" },
      resolution: "seller_override",
      ruleKey: "insurance.seller",
    });
    sellerInput.metadata = {
      ...(seller?.metadata ?? {}),
      policy: { product: "insurance", sellerRatePpm },
    };
    setError(null);
    void onSave([
      toMutation(store, storeInput),
      toMutation(seller, sellerInput),
    ]);
  };

  const preview = previewInsurance(values);
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[2fr_1fr]">
      <AutoEntryDomainCard
        description="A loja recebe uma parcela da comissão aplicada pela seguradora; o vendedor recebe uma taxa do prêmio."
        title="Divisão do seguro"
      >
        <AutoEntryValueOrigin active={Boolean(store && seller)} />
        <section aria-labelledby="insurance-applied-rate-title">
          <h4
            className="text-sm font-black text-app-text"
            id="insurance-applied-rate-title"
          >
            Política V1 aplicada pela seguradora
          </h4>
          <p className="mt-1 text-xs font-bold text-muted">
            Faixa fixa do contrato: é contexto do cálculo e não uma configuração
            da loja.
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            <PolicyValue label="Mínima" value="10%" />
            <PolicyValue label="Padrão" value="10%" />
            <PolicyValue label="Máxima" value="20%" />
          </dl>
        </section>
        <FeatureFieldGroup>
          <PercentField
            label="Parcela da loja"
            onChange={(storeShare) => setValues({ ...values, storeShare })}
            placeholder="50"
            value={values.storeShare}
          />
          <PercentField
            label="Comissão do vendedor"
            onChange={(sellerRate) =>
              setValues({ ...values, seller: sellerRate })
            }
            placeholder="0,75"
            value={values.seller}
          />
        </FeatureFieldGroup>
        <AutoEntryInlineError message={error} />
        <AutoEntrySaveAction
          canManage={canManage}
          isSaving={isSaving}
          onClick={save}
        />
      </AutoEntryDomainCard>
      <AutoEntryDomainCard
        description="Simulação com prêmio de R$ 5.000 e taxa padrão fixa de 10%."
        title="Prévia"
        tone="neutral"
      >
        <Preview label="Receita da loja" value={preview.store} />
        <Preview label="Comissão do vendedor" value={preview.seller} />
      </AutoEntryDomainCard>
    </div>
  );
}

function PercentField({
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
    <FeatureField label={`${label} (%)`}>
      <FeatureInput
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </FeatureField>
  );
}
function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/60 bg-app-elevated p-3">
      <p className="text-xs font-black uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-1 font-black text-app-text">{value}</p>
    </div>
  );
}
function PolicyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/60 bg-app-elevated p-3">
      <dt className="text-xs font-black uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-black text-app-text">{value}</dd>
    </div>
  );
}
function policyRateInput(rule: AutoEntryRule | undefined, key: string) {
  const rate = readPolicyNumber(rule, [key]);
  return rate === null ? "" : formatRatePpm(rate);
}
function previewInsurance(values: Values) {
  const premium = 500_000;
  const share = parseRatePpm(values.storeShare);
  const seller = parseRatePpm(values.seller);
  const money = (cents: number | null) =>
    cents === null
      ? "—"
      : new Intl.NumberFormat("pt-BR", {
          currency: "BRL",
          style: "currency",
        }).format(cents / 100);
  return {
    seller: money(
      seller === null ? null : Math.round((premium * seller) / 1_000_000),
    ),
    store: money(
      share === null
        ? null
        : Math.round(
            (((premium * appliedCommissionPercentage.default) / 100) * share) /
              1_000_000,
          ),
    ),
  };
}
