import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
import {
  AutoEntryDomainCard,
  AutoEntryInlineError,
  AutoEntrySaveAction,
} from "./AutoEntryDomainPrimitives";
import {
  AutoEntryTimingFields,
  buildTiming,
  type AutoEntryTimingDraft,
} from "./AutoEntryTimingFields";
import {
  familyRules,
  sellerName,
  sellerSelectOptions,
  validMoney,
} from "./domainModel";
import type { AutoEntryDomainPanelProps } from "./domainPanelTypes";

export function SaleExtraCommissionCard({
  canManage,
  isSaving,
  onDelete,
  onSave,
  rules,
  sellers,
}: AutoEntryDomainPanelProps) {
  const existing = useMemo(
    () => familyRules(rules, "sale.extra_commission"),
    [rules],
  );
  const [name, setName] = useState("");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [timing, setTiming] = useState<AutoEntryTimingDraft>({
    kind: "same_day",
    value: "",
  });
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    const amountCents = validMoney(amount);
    const parsedTiming = buildTiming(timing);
    if (
      !name.trim() ||
      !recipientUserId ||
      amountCents === null ||
      !parsedTiming
    ) {
      setError("Informe nome, beneficiário, valor e prazo válidos.");
      return;
    }
    setError(null);
    void onSave([
      {
        ruleId: null,
        input: {
          calculation: { amountCents, kind: "fixed" },
          category: "Comissão extra",
          conditions: {},
          event: "vehicle_sale_closed",
          family: "sale.extra_commission",
          metadata: {},
          name: name.trim(),
          outputType: "commission",
          priority: 0,
          recipient: { kind: "fixed_user", userId: recipientUserId },
          resolution: "additive",
          ruleKey: null,
          sellerUserId: null,
          status: "active",
          timing: parsedTiming,
        },
      },
    ]).then(() => {
      setName("");
      setAmount("");
    });
  };

  return (
    <AutoEntryDomainCard
      description="Sempre soma um valor fixo para um beneficiário, independentemente de quem originou a venda."
      title="Comissões extras"
      tone="blue"
    >
      {existing.length > 0 ? (
        <ul className="grid gap-2" aria-label="Comissões extras ativas">
          {existing.map((rule) => (
            <li
              className="rounded-lg border border-line/60 bg-app-elevated p-3 text-sm"
              key={rule.id}
            >
              <strong className="text-app-text">{rule.name}</strong>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="font-bold text-muted">
                  Beneficiário:{" "}
                  {rule.recipient?.kind === "fixed_user"
                    ? sellerName(sellers, rule.recipient.userId)
                    : "Não definido"}
                </span>
                {canManage ? (
                  <FeatureRowAction
                    ariaLabel={`Excluir comissão extra ${rule.name}`}
                    disabled={isSaving}
                    icon={Trash2}
                    iconClassName="text-danger"
                    onClick={() => onDelete(rule)}
                    tooltip="Excluir comissão extra"
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <FeatureFieldGroup>
        <FeatureField label="Nome da comissão">
          <FeatureInput
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </FeatureField>
        <FeatureField
          hint="Beneficiário fixo; não limita o vendedor que originou a venda."
          label="Beneficiário"
        >
          <FeatureSelect
            ariaLabel="Beneficiário da comissão extra"
            onChange={setRecipientUserId}
            options={sellerSelectOptions(sellers)}
            placeholder="Selecione o beneficiário"
            value={recipientUserId || undefined}
          />
        </FeatureField>
      </FeatureFieldGroup>
      <FeatureField label="Valor fixo (R$)">
        <FeatureInput
          inputMode="decimal"
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Ex.: 250,00"
          value={amount}
        />
      </FeatureField>
      <AutoEntryTimingFields draft={timing} onChange={setTiming} />
      <AutoEntryInlineError message={error} />
      <AutoEntrySaveAction
        canManage={canManage}
        isSaving={isSaving}
        label="Adicionar comissão"
        onClick={save}
      />
    </AutoEntryDomainCard>
  );
}
