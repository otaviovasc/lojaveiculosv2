import { Trash2 } from "lucide-react";
import {
  salePaymentMethods,
  type SalePaymentMethod,
} from "@lojaveiculosv2/shared";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { formatCents, parseCurrencyInput } from "./salesModel";
import type { SalePaymentLine } from "./types";

export function PaymentRow({
  index,
  locked = false,
  onChange,
  onRemove,
  payment,
}: PaymentRowProps) {
  return (
    <div className="sales-payment-row">
      <label className="grid gap-1.5 text-xs font-black text-muted uppercase tracking-wider">
        <span className="flex items-center justify-between gap-2">
          Método de Pagamento
          {locked ? (
            <span className="text-accent normal-case tracking-normal">
              Sinal reservado
            </span>
          ) : null}
        </span>
        <FeatureSelect
          ariaLabel="Método de pagamento"
          className="sales-input"
          disabled={locked}
          onChange={(method) => onChange({ ...payment, method })}
          options={salePaymentMethods.map((method) => ({
            label: formatPaymentMethod(method),
            value: method,
          }))}
          value={payment.method}
        />
      </label>
      <MoneyInput
        disabled={locked}
        label="Valor Principal"
        onChange={(value) =>
          onChange({
            ...payment,
            amountCents: (value ?? 0) + payment.extraCents,
            principalCents: value ?? 0,
          })
        }
        value={payment.principalCents}
      />
      <MoneyInput
        disabled={locked}
        label="Taxas / Extras"
        onChange={(value) =>
          onChange({
            ...payment,
            amountCents: payment.principalCents + (value ?? 0),
            extraCents: value ?? 0,
          })
        }
        value={payment.extraCents}
      />
      <button
        aria-label={`Remover pagamento ${index + 1}`}
        className="sales-secondary-button !min-h-[2.75rem] hover:!border-danger hover:!text-danger shrink-0"
        disabled={locked}
        onClick={onRemove}
        title={
          locked
            ? "Cancele a reserva para corrigir o sinal reservado."
            : undefined
        }
        type="button"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function newPayment(
  amountCents: number,
  index: number,
): SalePaymentLine {
  return {
    amountCents,
    dueAt: null,
    extraCents: 0,
    id: `draft-payment-${Date.now()}-${index}`,
    installments: null,
    metadata: {},
    method: "pix",
    paidAt: null,
    principalCents: amountCents,
    providerPaymentId: null,
    status: "pending",
  };
}

function MoneyInput({
  disabled = false,
  label,
  onChange,
  value,
}: MoneyInputProps) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-muted uppercase tracking-wider">
      {label}
      <input
        className="sales-input"
        disabled={disabled}
        inputMode="numeric"
        onChange={(event) => onChange(parseCurrencyInput(event.target.value))}
        placeholder="R$ 0,00"
        value={value ? formatCents(value) : ""}
      />
    </label>
  );
}

function formatPaymentMethod(method: SalePaymentMethod): string {
  switch (method) {
    case "pix":
      return "PIX";
    case "transfer":
      return "Transferência (TED/DOC)";
    case "cash":
      return "Dinheiro em Espécie";
    case "financing":
      return "Financiamento Bancário";
    case "credit_card":
      return "Cartão de Crédito";
    case "boleto":
      return "Boleto Bancário";
    case "letter_of_credit":
      return "Carta de Crédito (Consórcio)";
    case "trade_in":
      return "Veículo na Troca (Trade-in)";
  }
}

type PaymentRowProps = {
  index: number;
  locked?: boolean;
  onChange: (payment: SalePaymentLine) => void;
  onRemove: () => void;
  payment: SalePaymentLine;
};

type MoneyInputProps = {
  disabled?: boolean;
  label: string;
  onChange: (value: number | null) => void;
  value: number;
};
