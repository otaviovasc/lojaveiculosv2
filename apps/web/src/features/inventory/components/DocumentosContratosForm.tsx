import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Printer } from "lucide-react";
import { maskCurrency, maskPhone } from "../../../lib/masks";
import {
  InventoryField,
  InventoryInput,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
import {
  contractPaymentOptions,
  contractTemplateOptions,
  isReservationTemplate,
  type ContractForm,
} from "./DocumentosContratosModel";
import { createContractUnitOptions } from "./DocumentosContratosData";
import type { InventoryUnit } from "../model/types";

type ContractFormField = keyof ContractForm;

export function DocumentosContratosForm({
  form,
  onChange,
  onSubmit,
  units,
}: {
  form: ContractForm;
  onChange: (field: ContractFormField, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  units: readonly InventoryUnit[];
}) {
  const isReservation = isReservationTemplate(form.templateId);

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-3">
        <InventoryField label="Modelo" required>
          <InventorySelect
            onChange={(value) => onChange("templateId", value)}
            options={contractTemplateOptions}
            value={form.templateId}
          />
        </InventoryField>
        <InventoryField label="Unidade" required>
          <InventorySelect
            onChange={(value) => onChange("unitId", value)}
            options={createContractUnitOptions(units)}
            value={form.unitId}
          />
        </InventoryField>
        <InventoryField label="Data" required>
          <InventoryInput
            onChange={handleInputChange(onChange, "contractDate")}
            placeholder="06/07/2026"
            value={form.contractDate}
          />
        </InventoryField>
      </div>

      <FieldGroup title="Comprador">
        <InventoryField label="Nome" required>
          <InventoryInput
            onChange={handleInputChange(onChange, "buyerName")}
            value={form.buyerName}
          />
        </InventoryField>
        <InventoryField label="CPF/CNPJ" required>
          <InventoryInput
            onChange={handleInputChange(onChange, "buyerDocument")}
            value={form.buyerDocument}
          />
        </InventoryField>
        <InventoryField label="Telefone">
          <InventoryInput
            onChange={(event) =>
              onChange("buyerPhone", maskPhone(event.target.value))
            }
            value={form.buyerPhone}
          />
        </InventoryField>
        <InventoryField label="Email">
          <InventoryInput
            onChange={handleInputChange(onChange, "buyerEmail")}
            value={form.buyerEmail}
          />
        </InventoryField>
        <InventoryField
          className="md:col-span-2"
          label="Endereco"
          required={!isReservation}
        >
          <InventoryInput
            onChange={handleInputChange(onChange, "buyerAddress")}
            value={form.buyerAddress}
          />
        </InventoryField>
      </FieldGroup>

      <FieldGroup title={isReservation ? "Reserva" : "Venda"}>
        {isReservation ? (
          <>
            <InventoryField label="Valor do sinal" required>
              <InventoryInput
                inputMode="numeric"
                onChange={(event) =>
                  onChange("signalAmount", maskCurrency(event.target.value))
                }
                value={form.signalAmount}
              />
            </InventoryField>
            <InventoryField label="Validade da reserva" required>
              <InventoryInput
                onChange={handleInputChange(onChange, "reservationExpiresAt")}
                placeholder="11/07/2026"
                value={form.reservationExpiresAt}
              />
            </InventoryField>
          </>
        ) : (
          <>
            <InventoryField label="Valor de venda" required>
              <InventoryInput
                inputMode="numeric"
                onChange={(event) =>
                  onChange("salePrice", maskCurrency(event.target.value))
                }
                value={form.salePrice}
              />
            </InventoryField>
            <InventoryField label="Forma de pagamento" required>
              <InventorySelect
                onChange={(value) => onChange("paymentMethod", value)}
                options={contractPaymentOptions}
                value={form.paymentMethod}
              />
            </InventoryField>
          </>
        )}
        <InventoryField className="md:col-span-2" label="Observacoes">
          <InventoryTextarea
            onChange={handleTextareaChange(onChange, "notes")}
            value={form.notes}
          />
        </InventoryField>
      </FieldGroup>

      <FieldGroup title="Loja">
        <InventoryField label="Nome da loja" required>
          <InventoryInput
            onChange={handleInputChange(onChange, "storeName")}
            value={form.storeName}
          />
        </InventoryField>
        <InventoryField label="CNPJ" required>
          <InventoryInput
            onChange={handleInputChange(onChange, "storeDocument")}
            value={form.storeDocument}
          />
        </InventoryField>
        <InventoryField className="md:col-span-2" label="Endereco" required>
          <InventoryInput
            onChange={handleInputChange(onChange, "storeAddress")}
            value={form.storeAddress}
          />
        </InventoryField>
        <InventoryField label="Cidade" required>
          <InventoryInput
            onChange={handleInputChange(onChange, "storeCity")}
            value={form.storeCity}
          />
        </InventoryField>
        <InventoryField label="UF">
          <InventoryInput
            onChange={handleInputChange(onChange, "storeState")}
            value={form.storeState}
          />
        </InventoryField>
        <InventoryField label="Telefone">
          <InventoryInput
            onChange={(event) =>
              onChange("storePhone", maskPhone(event.target.value))
            }
            value={form.storePhone}
          />
        </InventoryField>
      </FieldGroup>

      <button
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-black text-inverse shadow-sm transition-colors hover:bg-accent-strong"
        type="submit"
      >
        <Printer aria-hidden="true" className="size-4" />
        Gerar previa para imprimir/PDF
      </button>
    </form>
  );
}

function FieldGroup({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="grid gap-3 border-t border-line/50 pt-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-muted">
        {title}
      </h4>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function handleInputChange(
  onChange: (field: ContractFormField, value: string) => void,
  field: ContractFormField,
) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    onChange(field, event.target.value);
  };
}

function handleTextareaChange(
  onChange: (field: ContractFormField, value: string) => void,
  field: ContractFormField,
) {
  return (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(field, event.target.value);
  };
}
