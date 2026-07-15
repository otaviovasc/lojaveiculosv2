import { Banknote, Trash2 } from "lucide-react";
import {
  salePaymentMethods,
  type SalePaymentMethod,
} from "@lojaveiculosv2/shared";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { formatCents, parseCurrencyInput } from "./salesModel";
import {
  changePaymentMethod,
  SalePaymentMethodFields,
} from "./SalePaymentMethodFields";
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
      <div className="flex items-center justify-between gap-3 border-b border-line/50 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-strong">
            <Banknote aria-hidden="true" className="size-4" />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-app-text">
            Pagamento {index + 1}
          </span>
          {locked ? (
            <span className="text-xs font-bold normal-case tracking-normal text-accent">
              Sinal reservado
            </span>
          ) : null}
        </div>
        <button
          aria-label={`Remover pagamento ${index + 1}`}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-app text-muted transition-colors hover:border-danger hover:text-danger-text"
          disabled={locked}
          onClick={onRemove}
          title={
            locked
              ? "Cancele a reserva para corrigir o sinal reservado."
              : "Remover pagamento"
          }
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-black text-muted uppercase tracking-wider">
          Método de pagamento
          <FeatureSelect
            ariaLabel="Método de pagamento"
            className="sales-input"
            disabled={locked}
            onChange={(method) =>
              onChange(changePaymentMethod(payment, method))
            }
            options={salePaymentMethods.map((method) => ({
              label: formatPaymentMethod(method),
              value: method,
            }))}
            value={payment.method}
          />
        </label>
        <MoneyInput
          disabled={locked}
          label="Valor principal"
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
          label="Taxas / extras"
          onChange={(value) =>
            onChange({
              ...payment,
              amountCents: payment.principalCents + (value ?? 0),
              extraCents: value ?? 0,
            })
          }
          value={payment.extraCents}
        />
      </div>

      <SalePaymentMethodFields
        disabled={locked}
        onChange={onChange}
        payment={payment}
      />
    </div>
  );
}

export function newPayment(
  amountCents: number,
  index: number,
): SalePaymentLine {
  return {
    amountCents,
    dueAt: localDateInputValue(),
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

function localDateInputValue(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
