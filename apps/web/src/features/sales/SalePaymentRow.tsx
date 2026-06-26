import { Trash2 } from "lucide-react";
import { formatCents, parseCurrencyInput, paymentMethods } from "./salesModel";
import type { SalePaymentLine } from "./types";

export function PaymentRow({
  index,
  onChange,
  onRemove,
  payment,
}: PaymentRowProps) {
  return (
    <div className="sales-payment-row">
      <label className="grid gap-1.5 text-xs font-black text-muted uppercase tracking-wider">
        Método de Pagamento
        <select
          className="sales-input"
          onChange={(event) =>
            onChange({ ...payment, method: event.target.value })
          }
          value={payment.method}
        >
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {formatPaymentMethod(method)}
            </option>
          ))}
        </select>
      </label>
      <MoneyInput
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
        className="sales-secondary-button !min-h-[2.75rem] hover:!border-rose-500 hover:!text-rose-500 shrink-0"
        onClick={onRemove}
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

function MoneyInput({ label, onChange, value }: MoneyInputProps) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-muted uppercase tracking-wider">
      {label}
      <input
        className="sales-input"
        inputMode="numeric"
        onChange={(event) => onChange(parseCurrencyInput(event.target.value))}
        placeholder="R$ 0,00"
        value={value ? formatCents(value) : ""}
      />
    </label>
  );
}

function formatPaymentMethod(method: string): string {
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
    default:
      return method.toUpperCase();
  }
}

type PaymentRowProps = {
  index: number;
  onChange: (payment: SalePaymentLine) => void;
  onRemove: () => void;
  payment: SalePaymentLine;
};

type MoneyInputProps = {
  label: string;
  onChange: (value: number | null) => void;
  value: number;
};
