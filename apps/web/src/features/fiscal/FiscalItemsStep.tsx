import { Plus, Trash2 } from "lucide-react";
import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { formatCurrencyValue } from "../../lib/masks";
import { FiscalVehicleFields } from "./FiscalVehicleFields";
import {
  amountFromInput,
  computeIssueTotalCents,
  createEmptyIssueItem,
  formatBrl,
  type FiscalIssueDraft,
  type FiscalIssueItem,
  type IssueFiscalTaxForm,
} from "./fiscalIssueModel";
import type { VehicleNfeVehicle } from "./types";

const operationTypeOptions = [
  { label: "Venda de veículo usado", value: "used_vehicle_sale" },
  { label: "Venda de veículo novo", value: "new_vehicle_sale" },
];

export function FiscalItemsStep({
  disabled,
  draft,
  errors = {},
  onChange,
}: {
  disabled?: boolean;
  draft: FiscalIssueDraft;
  errors?: Record<string, string>;
  onChange: (patch: Partial<FiscalIssueDraft>) => void;
}) {
  if (draft.kind === "nfse") {
    const amount = amountFromInput(draft.nfse.grossAmount);
    return (
      <FeatureFormSection
        description="A NFS-e de comissão é emitida a partir do valor informado na etapa anterior."
        title="Resumo do serviço"
      >
        <dl className="grid gap-2 text-sm font-semibold text-app-text">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Valor da comissão</dt>
            <dd>{amount > 0 ? formatBrl(amount) : "Não informado"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Competência</dt>
            <dd>{draft.nfse.competence || "Não informada"}</dd>
          </div>
        </dl>
      </FeatureFormSection>
    );
  }

  const totalCents = computeIssueTotalCents(draft.items);

  const updateItem = (index: number, patch: Partial<FiscalIssueItem>) => {
    onChange({
      items: draft.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  };

  const removeItem = (index: number) => {
    onChange({
      items: draft.items.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  return (
    <>
      <FeatureFormSection
        actions={
          <FeatureActionButton
            disabled={Boolean(disabled)}
            icon={Plus}
            label="Adicionar item"
            onClick={() =>
              onChange({ items: [...draft.items, createEmptyIssueItem()] })
            }
            title="Adicionar item"
          />
        }
        description="O primeiro item é o veículo da nota; itens extras (ex.: acessórios) entram como itens adicionais."
        title="Itens da nota"
      >
        <div className="grid gap-4">
          {errors.items ? (
            <p className="text-xs font-semibold text-danger" role="alert">
              {errors.items}
            </p>
          ) : null}
          {draft.items.map((item, index) => (
            <div
              className="grid gap-3 rounded-xl border border-line/60 bg-app-elevated/20 p-4"
              key={index}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-muted">
                  Item {index + 1}
                </span>
                {draft.items.length > 1 ? (
                  <FeatureActionButton
                    disabled={Boolean(disabled)}
                    icon={Trash2}
                    label={`Remover item ${index + 1}`}
                    onClick={() => removeItem(index)}
                    title="Remover item"
                  />
                ) : null}
              </div>
              <FeatureField label="Descrição">
                <FeatureInput
                  aria-label={`Descrição do item ${index + 1}`}
                  disabled={disabled}
                  onChange={(event) =>
                    updateItem(index, { description: event.target.value })
                  }
                  value={item.description}
                />
              </FeatureField>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FeatureField label="NCM">
                  <FeatureInput
                    aria-label={`NCM do item ${index + 1}`}
                    disabled={disabled}
                    inputMode="numeric"
                    maxLength={8}
                    onChange={(event) =>
                      updateItem(index, {
                        ncm: event.target.value.replace(/\D/g, ""),
                      })
                    }
                    value={item.ncm}
                  />
                </FeatureField>
                <FeatureField label="CFOP">
                  <FeatureInput
                    aria-label={`CFOP do item ${index + 1}`}
                    disabled={disabled}
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(event) =>
                      updateItem(index, {
                        cfop: event.target.value.replace(/\D/g, ""),
                      })
                    }
                    value={item.cfop}
                  />
                </FeatureField>
                <FeatureField label="Quantidade">
                  <FeatureInput
                    aria-label={`Quantidade do item ${index + 1}`}
                    disabled={disabled}
                    inputMode="numeric"
                    onChange={(event) =>
                      updateItem(index, {
                        quantity: Number(event.target.value) || 0,
                      })
                    }
                    value={String(item.quantity)}
                  />
                </FeatureField>
                <FeatureField label="Valor unitário">
                  <FeatureInput
                    aria-label={`Valor unitário do item ${index + 1}`}
                    disabled={disabled}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateItem(index, {
                        unitAmount: amountFromInput(event.target.value),
                      })
                    }
                    value={
                      item.unitAmount > 0
                        ? formatCurrencyValue(item.unitAmount)
                        : ""
                    }
                  />
                </FeatureField>
                <FeatureField label="Desconto">
                  <FeatureInput
                    aria-label={`Desconto do item ${index + 1}`}
                    disabled={disabled}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateItem(index, {
                        discountAmount: amountFromInput(event.target.value),
                      })
                    }
                    value={
                      item.discountAmount > 0
                        ? formatCurrencyValue(item.discountAmount)
                        : ""
                    }
                  />
                </FeatureField>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg border border-line bg-app px-3 py-2">
            <span className="text-xs font-black uppercase tracking-wider text-muted">
              Total da nota
            </span>
            <strong className="text-base text-app-text">
              {formatBrl(totalCents / 100)}
            </strong>
          </div>
          {draft.payments.length ? (
            <p className="text-xs font-semibold text-muted">
              Pagamentos importados da venda:{" "}
              {draft.payments
                .map((payment) => formatBrl(payment.amount))
                .join(" · ")}
            </p>
          ) : null}
          <FeatureField label="Tipo de operação">
            <FeatureSelect
              ariaLabel="Tipo de operação"
              disabled={disabled}
              onChange={(operationType) => onChange({ operationType })}
              options={operationTypeOptions}
              value={draft.operationType}
            />
          </FeatureField>
        </div>
      </FeatureFormSection>

      <FiscalVehicleFields
        errors={errors}
        fiscal={draft.fiscal}
        onFiscalChange={(patch: Partial<IssueFiscalTaxForm>) =>
          onChange({ fiscal: { ...draft.fiscal, ...patch } })
        }
        onVehicleChange={(patch: Partial<VehicleNfeVehicle>) =>
          onChange({ vehicle: { ...draft.vehicle, ...patch } })
        }
        vehicle={draft.vehicle}
      />
    </>
  );
}
