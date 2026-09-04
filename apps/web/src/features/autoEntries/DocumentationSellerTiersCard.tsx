import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
import {
  AutoEntryDomainCard,
  AutoEntryInlineError,
  AutoEntrySaveAction,
  AutoEntrySellerField,
  AutoEntryValueOrigin,
} from "./AutoEntryDomainPrimitives";
import { familyRules, toMutation, validMoney } from "./domainModel";
import { useAutoEntryDirty } from "./autoEntriesDirtyState";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";
import {
  documentationTierDrafts,
  documentationTierSuggestions,
  parseDocumentationTiers,
  type DocumentationTierDraft,
} from "./documentationTiersModel";

export function DocumentationSellerTiersCard({
  canManage,
  isSaving,
  onDelete,
  onSave,
  rules,
  sellers,
}: AutoEntryDomainPanelProps) {
  const [sellerUserId, setSellerUserId] = useState("");
  const stored = useMemo(
    () =>
      documentationTierDrafts(
        familyRules(rules, "transfer.seller", sellerUserId),
      ),
    [rules, sellerUserId],
  );
  const [tiers, setTiers] = useState<DocumentationTierDraft[]>([
    ...documentationTierSuggestions,
  ]);
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () =>
      setTiers(stored.length > 0 ? stored : [...documentationTierSuggestions]),
    [stored],
  );
  const isDirty = useMemo(() => {
    const baseline = stored.length > 0 ? stored : documentationTierSuggestions;
    return (
      tiers.length !== baseline.length ||
      tiers.some(
        (tier, index) =>
          tier.amount !== baseline[index]!.amount ||
          tier.max !== baseline[index]!.max ||
          tier.min !== baseline[index]!.min,
      )
    );
  }, [stored, tiers]);
  useAutoEntryDirty("transfer_documentation_charged", isDirty);
  // Indexes whose minimum falls inside the previous (lower) tier's range.
  const overlappingIndexes = useMemo(() => {
    const parsed = tiers
      .map((tier, index) => ({
        index,
        maxCents: tier.max.trim() ? validMoney(tier.max) : null,
        minCents: validMoney(tier.min),
      }))
      .filter(
        (
          tier,
        ): tier is {
          index: number;
          maxCents: number | null;
          minCents: number;
        } => tier.minCents !== null,
      )
      .sort((left, right) => left.minCents - right.minCents);
    const overlaps = new Set<number>();
    let previousMax: number | null = null;
    for (const tier of parsed) {
      if (previousMax !== null && tier.minCents <= previousMax) {
        overlaps.add(tier.index);
      }
      if (tier.maxCents === null) {
        previousMax = Number.POSITIVE_INFINITY;
      } else if (previousMax === null || tier.maxCents > previousMax) {
        previousMax = tier.maxCents;
      }
    }
    return overlaps;
  }, [tiers]);

  const save = () => {
    if (!sellerUserId) {
      setError("Selecione o vendedor antes de salvar as faixas.");
      return;
    }
    const parsed = parseDocumentationTiers(tiers);
    if (parsed.kind === "error") {
      setError(parsed.message);
      return;
    }
    setError(null);
    void onSave(
      parsed.tiers.map(({ amountCents, current, maxCents, minCents }) =>
        toMutation(current, {
          calculation: { amountCents, kind: "fixed" },
          category: "Comissão",
          conditions: {
            basisRange: { basis: "documentation", maxCents, minCents },
          },
          event: "transfer_documentation_charged",
          family: "transfer.seller",
          metadata: current?.metadata ?? { policy: { product: "transfer" } },
          name: "Comissão do vendedor na documentação",
          outputType: "commission",
          priority: 0,
          recipient: { kind: "event_seller" },
          resolution: "seller_override",
          ruleKey: `transfer.seller.${minCents}`,
          sellerUserId,
          status: "active",
          timing: { kind: "same_day" },
        }),
      ),
    );
  };

  return (
    <AutoEntryDomainCard
      description="A comissão fixa depende do valor cobrado. 650–749/25 e 750+/40 são sugestões, não regras ativas."
      title="Faixas por vendedor"
    >
      <AutoEntrySellerField
        onChange={setSellerUserId}
        sellers={sellers}
        value={sellerUserId}
      />
      <AutoEntryValueOrigin active={stored.length > 0} />
      <div className="grid gap-3">
        {tiers.map((tier, index) => (
          <TierRow
            index={index}
            isOverlapping={overlappingIndexes.has(index)}
            key={tier.current?.id ?? index}
            onChange={(next) =>
              setTiers(
                tiers.map((item, itemIndex) =>
                  itemIndex === index ? next : item,
                ),
              )
            }
            onRemove={() => {
              if (tier.current) {
                onDelete(tier.current);
                return;
              }
              setTiers(tiers.filter((_, itemIndex) => itemIndex !== index));
            }}
            tier={tier}
          />
        ))}
      </div>
      {canManage ? (
        <FeatureActionButton
          icon={Plus}
          label="Adicionar faixa"
          onClick={() => setTiers([...tiers, { amount: "", max: "", min: "" }])}
        />
      ) : null}
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

function TierRow({
  index,
  isOverlapping,
  onChange,
  onRemove,
  tier,
}: {
  index: number;
  isOverlapping: boolean;
  onChange: (tier: DocumentationTierDraft) => void;
  onRemove: () => void;
  tier: DocumentationTierDraft;
}) {
  const defaults =
    index === 0
      ? ["650,00", "749,99", "25,00"]
      : ["750,00", "Sem limite", "40,00"];
  return (
    <div className="ae-rule-item grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="ae-tier-row__label">Faixa {index + 1}</span>
        <FeatureRowAction
          ariaLabel={`Remover faixa ${index + 1}`}
          icon={Trash2}
          iconClassName="text-danger"
          onClick={onRemove}
          tooltip="Remover faixa"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TierInput
          error={isOverlapping ? "Sobrepõe a faixa anterior" : undefined}
          label="Mínimo (R$)"
          onChange={(min) => onChange({ ...tier, min })}
          placeholder={defaults[0]!}
          value={tier.min}
        />
        <TierInput
          label="Máximo (R$)"
          onChange={(max) => onChange({ ...tier, max })}
          placeholder={defaults[1]!}
          value={tier.max}
        />
        <TierInput
          label="Comissão (R$)"
          onChange={(amount) => onChange({ ...tier, amount })}
          placeholder={defaults[2]!}
          value={tier.amount}
        />
      </div>
    </div>
  );
}

function TierInput({
  error,
  label,
  onChange,
  placeholder,
  value,
}: {
  error?: string | undefined;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <FeatureField error={error} label={label}>
      <FeatureInput
        className={error ? "ae-tier-input--overlap" : undefined}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </FeatureField>
  );
}
