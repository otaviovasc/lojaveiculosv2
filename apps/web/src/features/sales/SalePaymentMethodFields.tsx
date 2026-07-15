import {
  salePaymentMethodUsesInstallments,
  type SalePaymentMethod,
} from "@lojaveiculosv2/shared";
import {
  FeatureDateField,
  FeatureInput,
} from "../../components/ui/FeatureControls";
import { SaleField } from "./SaleWorkspaceForm";
import type { SalePaymentLine } from "./types";

export function SalePaymentMethodFields({
  disabled,
  onChange,
  payment,
}: {
  disabled: boolean;
  onChange: (payment: SalePaymentLine) => void;
  payment: SalePaymentLine;
}) {
  const details = paymentMethodDetails[payment.method];
  const reference = readMetadataText(payment.metadata.methodReference);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="self-end">
        <FeatureDateField
          disabled={disabled}
          label={details.dateLabel}
          onChange={(dueAt) => onChange({ ...payment, dueAt: dueAt || null })}
          value={toDateInputValue(payment.dueAt)}
        />
      </div>

      {salePaymentMethodUsesInstallments(payment.method) ? (
        <SaleField label="Quantidade de parcelas">
          <FeatureInput
            disabled={disabled}
            inputMode="numeric"
            min={1}
            onChange={(event) =>
              onChange({
                ...payment,
                installments: readPositiveInteger(event.target.value),
              })
            }
            placeholder="Ex: 12"
            type="number"
            value={payment.installments ?? ""}
          />
        </SaleField>
      ) : null}

      {details.referenceLabel ? (
        <SaleField label={details.referenceLabel}>
          <FeatureInput
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...payment,
                metadata: withMethodReference(
                  payment.metadata,
                  event.target.value,
                ),
              })
            }
            placeholder={details.referencePlaceholder}
            value={reference}
          />
        </SaleField>
      ) : null}
    </div>
  );
}

export function changePaymentMethod(
  payment: SalePaymentLine,
  method: SalePaymentMethod,
): SalePaymentLine {
  const metadata = withoutMethodReference(payment.metadata);
  return {
    ...payment,
    installments: salePaymentMethodUsesInstallments(method)
      ? (payment.installments ?? 1)
      : null,
    metadata,
    method,
  };
}

const paymentMethodDetails: Record<
  SalePaymentMethod,
  {
    dateLabel: string;
    referenceLabel: string | null;
    referencePlaceholder?: string;
  }
> = {
  boleto: {
    dateLabel: "Vencimento do boleto",
    referenceLabel: "Banco / linha digitável",
    referencePlaceholder: "Informe o banco ou a linha digitável",
  },
  cash: {
    dateLabel: "Data do recebimento",
    referenceLabel: null,
  },
  credit_card: {
    dateLabel: "Primeiro vencimento",
    referenceLabel: "Bandeira / autorização",
    referencePlaceholder: "Ex: Visa · autorização 123456",
  },
  financing: {
    dateLabel: "Previsão do crédito",
    referenceLabel: "Instituição financeira",
    referencePlaceholder: "Banco responsável pelo financiamento",
  },
  letter_of_credit: {
    dateLabel: "Previsão da liberação",
    referenceLabel: "Administradora / cota",
    referencePlaceholder: "Informe administradora e cota",
  },
  pix: {
    dateLabel: "Data do PIX",
    referenceLabel: "Identificador da transação",
    referencePlaceholder: "Opcional: identificador ou comprovante",
  },
  trade_in: {
    dateLabel: "Data da avaliação",
    referenceLabel: "Placa / referência da troca",
    referencePlaceholder: "Veículo usado como parte do pagamento",
  },
  transfer: {
    dateLabel: "Data da transferência",
    referenceLabel: "Banco / comprovante",
    referencePlaceholder: "Informe o banco ou a referência",
  },
};

function readMetadataText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readPositiveInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match?.[1] ?? "";
}

function withMethodReference(
  metadata: Record<string, unknown>,
  value: string,
): Record<string, unknown> {
  if (value) return { ...metadata, methodReference: value };
  return withoutMethodReference(metadata);
}

function withoutMethodReference(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const remaining = { ...metadata };
  delete remaining.methodReference;
  return remaining;
}
