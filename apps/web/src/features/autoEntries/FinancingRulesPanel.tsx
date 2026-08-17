import { useEffect, useMemo, useState } from "react";
import {
  AutoEntryDomainCard,
  AutoEntryInlineError,
  AutoEntrySaveAction,
  AutoEntrySellerField,
} from "./AutoEntryDomainPrimitives";
import {
  AutoEntryRateMatrix,
  type AutoEntryRankValues,
} from "./AutoEntryRateMatrix";
import {
  financingRanks,
  financingSellerSuggestions,
  financingStoreSuggestions,
  findRule,
  parseRatePpm,
  rateRule,
  ruleRateInput,
  toMutation,
  toStatusMutation,
} from "./domainModel";
import { useAutoEntryDirty } from "./autoEntriesDirtyState";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";
import type { AutoEntryRule, AutoEntryRuleMutation } from "./types";

export function FinancingRulesPanel(props: AutoEntryDomainPanelProps) {
  return (
    <div className="grid items-stretch gap-4 xl:grid-cols-2">
      <FinancingStoreCard {...props} />
      <FinancingSellerCard {...props} />
    </div>
  );
}

function FinancingStoreCard({
  canManage,
  isSaving,
  onSave,
  rules,
}: AutoEntryDomainPanelProps) {
  const storedValues = useMemo(
    () => rankValues(rules, "financing.store"),
    [rules],
  );
  const [values, setValues] = useState(storedValues);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setValues(storedValues), [storedValues]);
  const isDirty = hasRankChanges(storedValues, values);
  useAutoEntryDirty("financing_approved", isDirty);

  const save = () => {
    const mutations = buildRankMutations(rules, values, "store", null);
    if (!mutations) {
      setError("Informe ao menos uma taxa válida entre 0,0001% e 100%.");
      return;
    }
    setError(null);
    void onSave(mutations);
  };

  return (
    <AutoEntryDomainCard
      description="A loja recebe uma taxa por faixa R1–R5 do financiamento. Campos vazios não criam regras sugeridas."
      title="Matriz da loja"
    >
      <AutoEntryRateMatrix
        label="Percentual da loja por faixa"
        onChange={setValues}
        stored={storedValues}
        suggestions={financingStoreSuggestions}
        values={values}
      />
      <AutoEntryInlineError message={error} />
      <AutoEntrySaveAction
        canManage={canManage}
        isDirty={isDirty}
        isSaving={isSaving}
        onClick={save}
      />
    </AutoEntryDomainCard>
  );
}

function FinancingSellerCard({
  canManage,
  isSaving,
  onSave,
  rules,
  sellers,
}: AutoEntryDomainPanelProps) {
  const [sellerUserId, setSellerUserId] = useState("");
  const storedValues = useMemo(
    () => rankValues(rules, "financing.seller", sellerUserId),
    [rules, sellerUserId],
  );
  // Initialize from the same baseline isDirty derives from so the dirty
  // registry never sees a transient mismatch on the first render.
  const [values, setValues] = useState<AutoEntryRankValues>(storedValues);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setValues(storedValues), [storedValues]);
  const isDirty = hasRankChanges(storedValues, values);
  useAutoEntryDirty("financing_approved", isDirty);

  const save = () => {
    if (!sellerUserId) {
      setError("Selecione o vendedor antes de salvar.");
      return;
    }
    const mutations = buildRankMutations(rules, values, "seller", sellerUserId);
    if (!mutations) {
      setError(
        "Preencha ao menos uma taxa válida. Sugestões não são salvas automaticamente.",
      );
      return;
    }
    setError(null);
    void onSave(mutations);
  };

  return (
    <AutoEntryDomainCard
      description="A seleção identifica quem dispara e recebe a comissão. As sugestões V1 só viram regras após salvar."
      title="Matriz por vendedor"
    >
      <AutoEntrySellerField
        onChange={setSellerUserId}
        sellers={sellers}
        value={sellerUserId}
      />
      <AutoEntryRateMatrix
        label="Comissão do vendedor por faixa"
        onChange={setValues}
        stored={storedValues}
        suggestions={financingSellerSuggestions}
        values={values}
      />
      <AutoEntryInlineError message={error} />
      <AutoEntrySaveAction
        canManage={canManage}
        isDirty={isDirty}
        isSaving={isSaving}
        onClick={save}
      />
    </AutoEntryDomainCard>
  );
}

function hasRankChanges(
  stored: AutoEntryRankValues,
  values: AutoEntryRankValues,
) {
  return financingRanks.some((rank) => stored[rank] !== values[rank]);
}

export function rankValues(
  rules: readonly AutoEntryRule[],
  prefix: "financing.seller" | "financing.store",
  sellerUserId: string | null = null,
) {
  return Object.fromEntries(
    financingRanks.map((rank) => {
      const rule = findRule(rules, `${prefix}.${rank}`, sellerUserId);
      return [rank, rule?.status === "active" ? ruleRateInput(rule) : ""];
    }),
  ) as AutoEntryRankValues;
}

export function buildRankMutations(
  rules: readonly AutoEntryRule[],
  values: AutoEntryRankValues,
  audience: "seller" | "store",
  sellerUserId: string | null,
) {
  const mutations: AutoEntryRuleMutation[] = [];
  for (const rank of financingRanks) {
    const prefix =
      audience === "store" ? "financing.store" : "financing.seller";
    const ruleKey = `${prefix}.${rank}`;
    const existing = findRule(rules, ruleKey, sellerUserId);
    if (!values[rank].trim()) {
      if (existing?.status === "active") {
        mutations.push(toStatusMutation(existing, "inactive"));
      }
      continue;
    }
    const ratePpm = parseRatePpm(values[rank]);
    if (ratePpm === null) return null;
    const input = rateRule({
      basis: "financing",
      event: "financing_approved",
      family: ruleKey,
      name:
        audience === "store"
          ? `Receita da loja no financiamento ${rank}`
          : `Comissão do vendedor no financiamento ${rank}`,
      outputType: audience === "store" ? "revenue" : "commission",
      ratePpm,
      recipient:
        audience === "store" ? { kind: "none" } : { kind: "event_seller" },
      resolution: audience === "store" ? "additive" : "seller_override",
      ruleKey,
      sellerUserId,
    });
    input.category = audience === "store" ? "Financiamento" : "Comissão";
    input.conditions = { financingRank: rank };
    input.metadata = {
      ...(existing?.metadata ?? {}),
      policy: {
        financingRank: rank,
        product: "financing",
        [audience === "store" ? "storeRatePpm" : "sellerRatePpm"]: ratePpm,
      },
    };
    mutations.push(toMutation(existing, input));
  }
  return mutations.length > 0 ? mutations : null;
}
