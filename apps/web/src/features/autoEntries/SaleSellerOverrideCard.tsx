import { useEffect, useMemo, useState } from "react";
import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureFieldGroup,
  FeatureField,
} from "../../components/ui/FeatureForms";
import {
  AutoEntryDomainCard,
  AutoEntryInlineError,
  AutoEntrySaveAction,
  AutoEntrySellerField,
  AutoEntryValueOrigin,
} from "./AutoEntryDomainPrimitives";
import {
  AutoEntryTimingFields,
  buildTiming,
  type AutoEntryTimingDraft,
} from "./AutoEntryTimingFields";
import {
  findRule,
  parseRatePpm,
  ruleMoneyInput,
  ruleRateInput,
  toMutation,
  validMoney,
} from "./domainModel";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";
import type { AutoEntryTiming } from "./types";

type CalculationKind = "fixed" | "rate";

export function SaleSellerOverrideCard({
  canManage,
  isSaving,
  onSave,
  rules,
  sellers,
}: AutoEntryDomainPanelProps) {
  const [sellerUserId, setSellerUserId] = useState("");
  const existing = useMemo(
    () => findRule(rules, "sale.standard_commission", sellerUserId),
    [rules, sellerUserId],
  );
  const [kind, setKind] = useState<CalculationKind>("fixed");
  const [value, setValue] = useState("");
  const [timing, setTiming] = useState<AutoEntryTimingDraft>({
    kind: "same_day",
    value: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setKind(existing?.calculation.kind === "fixed" ? "fixed" : "rate");
    setValue(
      existing?.calculation.kind === "fixed"
        ? ruleMoneyInput(existing)
        : ruleRateInput(existing),
    );
    setTiming(timingDraft(existing?.timing));
  }, [existing]);

  const save = () => {
    const parsedValue =
      kind === "fixed" ? validMoney(value) : parseRatePpm(value);
    const parsedTiming = buildTiming(timing);
    if (!sellerUserId || parsedValue === null || !parsedTiming) {
      setError("Selecione o vendedor e informe cálculo e prazo válidos.");
      return;
    }
    const calculation =
      kind === "fixed"
        ? ({ amountCents: parsedValue, kind: "fixed" } as const)
        : ({ basis: "sale", kind: "rate_ppm", ratePpm: parsedValue } as const);
    setError(null);
    void onSave([
      toMutation(existing, {
        calculation,
        category: "Comissão",
        conditions: { standardCommissionEnabled: true },
        event: "vehicle_sale_closed",
        family: "sale.standard_commission",
        metadata: existing?.metadata ?? {},
        name: "Comissão padrão por vendedor",
        outputType: "commission",
        priority: 0,
        recipient: { kind: "event_seller" },
        resolution: "seller_override",
        ruleKey: "sale.standard_commission",
        sellerUserId,
        status: "active",
        timing: parsedTiming,
      }),
    ]);
  };

  return (
    <AutoEntryDomainCard
      description="Substitui apenas a comissão padrão quando o vendedor selecionado originar a venda."
      title="Exceção por vendedor"
      tone="blue"
    >
      <AutoEntrySellerField
        onChange={setSellerUserId}
        sellers={sellers}
        value={sellerUserId}
      />
      <AutoEntryValueOrigin active={Boolean(existing)} />
      <FeatureFieldGroup>
        <FeatureField label="Modelo de cálculo">
          <FeatureSelect
            ariaLabel="Modelo da comissão do vendedor"
            onChange={setKind}
            options={[
              { label: "Valor fixo", value: "fixed" },
              { label: "Percentual da venda", value: "rate" },
            ]}
            value={kind}
          />
        </FeatureField>
        <FeatureField
          label={kind === "fixed" ? "Valor (R$)" : "Percentual (%)"}
        >
          <FeatureInput
            inputMode="decimal"
            onChange={(event) => setValue(event.target.value)}
            placeholder={kind === "fixed" ? "Ex.: 500,00" : "Ex.: 1,5"}
            value={value}
          />
        </FeatureField>
      </FeatureFieldGroup>
      <AutoEntryTimingFields draft={timing} onChange={setTiming} />
      <AutoEntryInlineError message={error} />
      <AutoEntrySaveAction
        canManage={canManage}
        isSaving={isSaving}
        onClick={save}
      />
    </AutoEntryDomainCard>
  );
}

function timingDraft(timing: AutoEntryTiming | undefined) {
  if (!timing || timing.kind === "same_day") {
    return { kind: "same_day", value: "" } as AutoEntryTimingDraft;
  }
  return {
    kind: timing.kind,
    value: String(timing.kind === "days_after" ? timing.days : timing.day),
  };
}
