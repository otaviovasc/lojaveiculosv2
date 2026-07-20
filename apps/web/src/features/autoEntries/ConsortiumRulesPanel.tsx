import { Store, UserRound } from "lucide-react";
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
  AutoEntryStat,
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

type Values = { seller: string; storeShare: string; total: string };

export function ConsortiumRulesPanel({
  canManage,
  isSaving,
  onSave,
  rules,
}: AutoEntryDomainPanelProps) {
  const store = useMemo(() => findRule(rules, "consortium.store"), [rules]);
  const seller = useMemo(() => findRule(rules, "consortium.seller"), [rules]);
  const stored = useMemo<Values>(
    () => ({
      seller: ruleRateInput(seller),
      storeShare: policyInput(store, "storeSharePpm"),
      total: policyInput(store, "totalRatePpm"),
    }),
    [seller, store],
  );
  const [values, setValues] = useState(stored);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setValues(stored), [stored]);

  const save = () => {
    const totalRatePpm = parseRatePpm(values.total);
    const storeSharePpm = parseRatePpm(values.storeShare);
    const sellerRatePpm = parseRatePpm(values.seller);
    if (
      totalRatePpm === null ||
      storeSharePpm === null ||
      sellerRatePpm === null
    ) {
      setError("Informe os três percentuais entre 0,0001% e 100%.");
      return;
    }
    const effectiveStoreRate = Math.round(
      (totalRatePpm * storeSharePpm) / 1_000_000,
    );
    if (effectiveStoreRate < 1) {
      setError(
        "A combinação da taxa total com a parcela da loja é muito pequena.",
      );
      return;
    }
    const storeInput = rateRule({
      basis: "consortium",
      event: "consortium_sold",
      family: "consortium.store",
      name: "Receita da loja no consórcio",
      outputType: "revenue",
      ratePpm: effectiveStoreRate,
      recipient: { kind: "none" },
      resolution: "additive",
      ruleKey: "consortium.store",
    });
    storeInput.category = "Consórcio";
    storeInput.metadata = {
      ...(store?.metadata ?? {}),
      policy: { product: "consortium", storeSharePpm, totalRatePpm },
    };
    const sellerInput = rateRule({
      basis: "consortium",
      event: "consortium_sold",
      family: "consortium.seller",
      name: "Comissão do vendedor no consórcio",
      outputType: "commission",
      ratePpm: sellerRatePpm,
      recipient: { kind: "event_seller" },
      resolution: "seller_override",
      ruleKey: "consortium.seller",
    });
    sellerInput.metadata = {
      ...(seller?.metadata ?? {}),
      policy: { product: "consortium", sellerRatePpm, totalRatePpm },
    };
    setError(null);
    void onSave([
      toMutation(store, storeInput),
      toMutation(seller, sellerInput),
    ]);
  };

  const preview = consortiumPreview(values);
  return (
    <div className="grid items-stretch gap-4 xl:grid-cols-[2fr_1fr]">
      <AutoEntryDomainCard
        description="A receita da loja é taxa total × participação da loja; a comissão do vendedor usa a carta de crédito."
        title="Divisão do consórcio"
      >
        <AutoEntryValueOrigin active={Boolean(store && seller)} />
        <FeatureFieldGroup className="lg:grid-cols-3">
          <PercentField
            label="Taxa total"
            onChange={(total) => setValues({ ...values, total })}
            placeholder="3,7"
            value={values.total}
          />
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
            placeholder="0,277"
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
        description="Simulação com carta de crédito de R$ 100.000."
        title="Prévia"
        tone="neutral"
      >
        <AutoEntryStat
          icon={Store}
          label="Receita da loja"
          value={preview.store}
        />
        <AutoEntryStat
          icon={UserRound}
          label="Comissão do vendedor"
          value={preview.seller}
        />
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
function policyInput(rule: AutoEntryRule | undefined, key: string) {
  const value = readPolicyNumber(rule, [key]);
  return value === null ? "" : formatRatePpm(value);
}
function consortiumPreview(values: Values) {
  const basis = 10_000_000;
  const total = parseRatePpm(values.total);
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
      seller === null ? null : Math.round((basis * seller) / 1_000_000),
    ),
    store: money(
      total === null || share === null
        ? null
        : Math.round((((basis * total) / 1_000_000) * share) / 1_000_000),
    ),
  };
}
