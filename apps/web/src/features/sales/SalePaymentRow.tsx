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
    <div className="grid gap-2 rounded-lg border border-line bg-app-elevated p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <select
        className="sales-input"
        onChange={(event) =>
          onChange({ ...payment, method: event.target.value })
        }
        value={payment.method}
      >
        {paymentMethods.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>
      <MoneyInput
        label="Principal"
        onChange={(value) =>
          onChange({
            ...payment,
            amountCents: value ?? 0,
            principalCents: value ?? 0,
          })
        }
        value={payment.principalCents}
      />
      <MoneyInput
        label="Extra"
        onChange={(value) => onChange({ ...payment, extraCents: value ?? 0 })}
        value={payment.extraCents}
      />
      <button
        aria-label={`Remover pagamento ${index + 1}`}
        className="icon-button"
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
    <label className="grid gap-1 text-xs font-black text-muted">
      {label}
      <input
        className="sales-input"
        inputMode="numeric"
        onChange={(event) => onChange(parseCurrencyInput(event.target.value))}
        value={value ? formatCents(value) : ""}
      />
    </label>
  );
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
