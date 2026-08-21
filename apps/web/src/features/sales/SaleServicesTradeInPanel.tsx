import {
  coerceVehicleColor,
  isActiveSalePaymentStatus,
} from "@lojaveiculosv2/shared";
import {
  AlertTriangle,
  CarFront,
  Check,
  ClipboardList,
  Gauge,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  formatVehicleMileageInput,
  formatVehiclePlateInput,
  formatVehicleRenavamInput,
  formatVehicleVinInput,
} from "../../lib/masks";
import type { InventoryApi } from "../inventory/api/apiClient";
import { InventoryCatalogSelector } from "../inventory/components/InventoryCatalogSelector";
import {
  InventoryColorSelect,
  InventoryField,
  InventoryInput,
  InventorySelect,
} from "../inventory/components/InventoryFormParts";
import {
  engineAspirationOptions,
  engineDisplacementOptions,
  fuelTypeOptions,
  transmissionOptions,
} from "../inventory/model/formModel";
import type { InventoryCatalogSnapshot } from "../inventory/model/types";
import { formatCurrency, parseCurrency } from "./saleServicesFormat";
import { getTradeInSnapshotMissingFields } from "./saleWorkspaceReadiness";
import { snapshotBoolean, snapshotNumber } from "./salesSnapshot";
import type { ServiceChangeHandler } from "./SaleServicesTypes";
import type { SnapshotRecord } from "./salesSnapshot";
import type { SaleRecord } from "./types";

export function TradeInPanel({
  inventoryApi,
  onChange,
  onSyncPayment,
  sale,
  tradeIn,
}: {
  inventoryApi: InventoryApi | null;
  onChange: ServiceChangeHandler;
  onSyncPayment?: (() => void) | undefined;
  sale: SaleRecord;
  tradeIn: SnapshotRecord;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-line pb-2 mb-1">
        <h4 className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
          <RefreshCw className="size-4.5 text-accent" />
          <span>Veículo na Troca (Trade-in)</span>
        </h4>

        <label className="flex items-center gap-2 cursor-pointer font-black text-xs uppercase text-app-text select-none">
          <input
            checked={snapshotBoolean(tradeIn.enabled)}
            className="accent-accent scale-110"
            onChange={(event) =>
              onChange("tradeIn", "enabled", event.target.checked)
            }
            type="checkbox"
          />
          <span>Habilitar Troca</span>
        </label>
      </div>

      {snapshotBoolean(tradeIn.enabled) ? (
        <TradeInFields
          inventoryApi={inventoryApi}
          onChange={onChange}
          onSyncPayment={onSyncPayment}
          sale={sale}
          tradeIn={tradeIn}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-xs font-bold text-muted flex flex-col items-center justify-center gap-2">
          <RefreshCw className="size-8 text-muted/30" />
          <span>Esta venda não possui veículo como parte de pagamento.</span>
          <button
            className="sales-secondary-button mt-2 text-xs"
            onClick={() => onChange("tradeIn", "enabled", true)}
            type="button"
          >
            Habilitar Troca de Veículo
          </button>
        </div>
      )}
    </div>
  );
}

function TradeInFields({
  inventoryApi,
  onChange,
  onSyncPayment,
  sale,
  tradeIn,
}: {
  inventoryApi: InventoryApi | null;
  onChange: ServiceChangeHandler;
  onSyncPayment?: (() => void) | undefined;
  sale: SaleRecord;
  tradeIn: SnapshotRecord;
}) {
  const catalog = readTradeInCatalog(tradeIn);
  const valuationCents = snapshotNumber(tradeIn.valuationCents) ?? 0;
  const missingFields = getTradeInSnapshotMissingFields(tradeIn);
  const isSnapshotComplete = missingFields.length === 0;
  const tradeInPayments = sale.payments.filter(
    (payment) =>
      payment.method === "trade_in" &&
      isActiveSalePaymentStatus(payment.status),
  );
  const tradeInPayment = tradeInPayments[0];
  const hasDuplicateTradeInPayments = tradeInPayments.length > 1;
  const isPaymentSynced =
    tradeInPayments.length === 1 &&
    valuationCents > 0 &&
    tradeInPayment?.principalCents === valuationCents;

  return (
    <div className="flex flex-col gap-5">
      <div
        aria-live="polite"
        className={
          isSnapshotComplete
            ? "rounded-xl border border-success/30 bg-success/10 p-4 text-success-strong"
            : "rounded-xl border border-warning/30 bg-warning/10 p-4 text-warning-strong"
        }
        id="trade-in-validation-status"
        role="status"
      >
        <div className="flex items-start gap-2">
          {isSnapshotComplete ? (
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
          )}
          <div className="min-w-0 text-xs font-bold">
            <p className="font-black uppercase tracking-wider">
              {isSnapshotComplete
                ? "Cadastro da troca completo"
                : `${missingFields.length} campo${missingFields.length === 1 ? "" : "s"} obrigatório${missingFields.length === 1 ? "" : "s"} pendente${missingFields.length === 1 ? "" : "s"}`}
            </p>
            {isSnapshotComplete ? (
              <p className="mt-1">
                O veículo está pronto para ser vinculado ao pagamento e
                cadastrado no estoque ao fechar a venda.
              </p>
            ) : (
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {missingFields.map((field) => (
                  <li className="flex items-center gap-1.5" key={field}>
                    <span aria-hidden="true">•</span>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-success/20 bg-success/10 p-4 text-xs font-bold text-success-strong flex flex-col gap-1.5 shadow-inner">
        <span className="uppercase tracking-wider font-black flex items-center gap-1 text-success-strong">
          <Check className="size-3.5" /> Cadastro Automático Ativo
        </span>
        <span>
          Ao fechar esta venda, este veículo será{" "}
          <strong>auto-cadastrado</strong> no inventário e o cliente atual{" "}
          <strong>{String(sale.buyerSnapshot.name || "Comprador")}</strong> será
          configurado como fornecedor de aquisição.
        </span>
      </div>

      <TradeInFieldGroup
        icon={<CarFront aria-hidden="true" className="size-4" />}
        title="Identificação do veículo"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <TradeInInput
            field="plate"
            label="Placa"
            onChange={onChange}
            placeholder="Ex: ABC1D23"
            required
            tradeIn={tradeIn}
          />
          <TradeInInput
            field="chassi"
            label="Chassi / VIN"
            onChange={onChange}
            placeholder="Chassi ou VIN"
            required
            tradeIn={tradeIn}
          />
          <TradeInInput
            field="renavam"
            label="Renavam"
            onChange={onChange}
            placeholder="Ex: 11 dígitos"
            required
            tradeIn={tradeIn}
          />
        </div>
      </TradeInFieldGroup>

      <TradeInFieldGroup
        icon={<ClipboardList aria-hidden="true" className="size-4" />}
        title="Catálogo FIPE"
      >
        <InventoryCatalogSelector
          api={inventoryApi}
          catalog={catalog}
          manufactureYear={snapshotText(tradeIn.yearFabrication)}
          onCatalogChange={(nextCatalog) => {
            onChange("tradeIn", "catalog", nextCatalog);
            if (!nextCatalog) {
              onChange("tradeIn", "brand", null);
              onChange("tradeIn", "model", null);
              onChange("tradeIn", "yearModel", null);
              return;
            }
            onChange("tradeIn", "brand", nextCatalog.brandName);
            onChange("tradeIn", "model", nextCatalog.modelName);
            onChange("tradeIn", "yearModel", nextCatalog.modelYear);
          }}
          onManufactureYearChange={(value) =>
            onChange("tradeIn", "yearFabrication", value)
          }
          onYearChange={(year) => onChange("tradeIn", "yearModel", year)}
        />
        {!inventoryApi ? (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <TradeInInput
              field="brand"
              label="Marca / fabricante"
              onChange={onChange}
              placeholder="Informe a marca"
              required
              tradeIn={tradeIn}
            />
            <TradeInInput
              field="model"
              label="Modelo / versão"
              onChange={onChange}
              placeholder="Informe o modelo e a versão"
              required
              tradeIn={tradeIn}
            />
            <TradeInInput
              field="yearModel"
              label="Ano modelo"
              onChange={onChange}
              placeholder="Ex: 2022"
              required
              tradeIn={tradeIn}
              type="number"
            />
          </div>
        ) : null}
      </TradeInFieldGroup>

      <TradeInFieldGroup
        icon={<Gauge aria-hidden="true" className="size-4" />}
        title="Especificações"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          <InventoryField className="lg:col-span-4" label="Cor" required>
            <InventoryColorSelect
              onChange={(value) => onChange("tradeIn", "color", value)}
              value={coerceVehicleColor(snapshotText(tradeIn.color)) ?? ""}
            />
          </InventoryField>
          <TradeInInput
            className="lg:col-span-4"
            field="mileageKm"
            label="Quilometragem"
            onChange={onChange}
            placeholder="Ex: 32500"
            tradeIn={tradeIn}
            type="number"
          />
          <TradeInSelect
            className="lg:col-span-4"
            field="fuelType"
            label="Combustível"
            onChange={onChange}
            options={fuelTypeOptions}
            tradeIn={tradeIn}
          />
          <TradeInSelect
            className="lg:col-span-3"
            field="transmission"
            label="Câmbio"
            onChange={onChange}
            options={transmissionOptions}
            tradeIn={tradeIn}
          />
          <TradeInSelect
            className="lg:col-span-3"
            field="engineDisplacement"
            label="Litragem"
            onChange={onChange}
            options={engineDisplacementOptions}
            tradeIn={tradeIn}
          />
          <TradeInSelect
            className="lg:col-span-3"
            field="engineAspiration"
            label="Aspiração"
            onChange={onChange}
            options={engineAspirationOptions}
            tradeIn={tradeIn}
          />
          <TradeInInput
            className="lg:col-span-3"
            field="doors"
            label="Portas"
            onChange={onChange}
            placeholder="Ex: 4"
            tradeIn={tradeIn}
            type="number"
          />
        </div>
      </TradeInFieldGroup>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-app/50 p-4">
        <InventoryField label="Valor de avaliação / entrada" required>
          <input
            aria-describedby="trade-in-validation-status"
            aria-invalid={valuationCents <= 0}
            className="sales-input text-lg font-black text-accent-strong"
            inputMode="numeric"
            onChange={(event) =>
              onChange(
                "tradeIn",
                "valuationCents",
                parseCurrency(event.target.value),
              )
            }
            placeholder="R$ 0,00"
            required
            value={formatCurrency(valuationCents)}
          />
        </InventoryField>

        {valuationCents > 0 && onSyncPayment ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line/40">
            {isPaymentSynced ? (
              <span className="text-xs font-black text-success-strong flex items-center gap-1.5 uppercase tracking-wider">
                <Check className="size-4" />
                Valor da troca vinculado às condições de pagamento
              </span>
            ) : (
              <span className="text-xs font-bold text-muted">
                {hasDuplicateTradeInPayments
                  ? "Há mais de uma parcela de troca. Mantenha apenas o lançamento criado por este painel."
                  : tradeInPayment
                    ? "O valor da avaliação difere da parcela de troca lançada."
                    : "Adicione este valor de troca às parcelas para abater do saldo da venda."}
              </span>
            )}
            <button
              className="sales-secondary-button !min-h-9 !h-9 text-xs font-black uppercase tracking-wider"
              disabled={!isSnapshotComplete || hasDuplicateTradeInPayments}
              onClick={onSyncPayment}
              title={
                hasDuplicateTradeInPayments
                  ? "Remova o pagamento duplicado da troca antes de sincronizar."
                  : isSnapshotComplete
                    ? undefined
                    : "Preencha os campos obrigatórios da troca antes de lançar o pagamento."
              }
              type="button"
            >
              {isPaymentSynced
                ? "Re-sincronizar Parcela de Troca"
                : "Lançar na Tabela de Pagamentos"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TradeInInput({
  className,
  field,
  label,
  onChange,
  placeholder,
  required = false,
  tradeIn,
  type = "text",
}: {
  className?: string;
  field: string;
  label: string;
  onChange: ServiceChangeHandler;
  placeholder: string;
  required?: boolean;
  tradeIn: SnapshotRecord;
  type?: "number" | "text";
}) {
  const rawValue = tradeIn[field];
  const textValue =
    rawValue !== undefined && rawValue !== null ? String(rawValue) : "";
  const displayValue =
    field === "mileageKm"
      ? formatVehicleMileageInput(textValue)
      : field === "plate"
        ? formatVehiclePlateInput(textValue)
        : field === "chassi"
          ? formatVehicleVinInput(textValue)
          : field === "renavam"
            ? formatVehicleRenavamInput(textValue)
            : textValue;
  const maxLength =
    field === "plate"
      ? 7
      : field === "chassi"
        ? 17
        : field === "renavam"
          ? 11
          : undefined;
  const isComplete = isRequiredTradeInInputComplete(field, rawValue);

  return (
    <InventoryField className={className} label={label} required={required}>
      <InventoryInput
        aria-describedby={required ? "trade-in-validation-status" : undefined}
        aria-invalid={required && !isComplete}
        className={
          field === "plate" || field === "chassi"
            ? "font-mono uppercase"
            : undefined
        }
        inputMode={
          type === "number" || field === "mileageKm" ? "numeric" : undefined
        }
        maxLength={maxLength}
        onChange={(event) => {
          if (field === "mileageKm") {
            const digits = formatVehicleMileageInput(
              event.target.value,
            ).replace(/\D/g, "");
            onChange("tradeIn", field, digits ? Number(digits) : null);
          } else if (field === "plate") {
            onChange(
              "tradeIn",
              field,
              formatVehiclePlateInput(event.target.value),
            );
          } else if (field === "chassi") {
            onChange(
              "tradeIn",
              field,
              formatVehicleVinInput(event.target.value),
            );
          } else if (field === "renavam") {
            onChange(
              "tradeIn",
              field,
              formatVehicleRenavamInput(event.target.value),
            );
          } else if (type === "number") {
            const num = Number(event.target.value);
            onChange(
              "tradeIn",
              field,
              Number.isFinite(num) && event.target.value !== "" ? num : null,
            );
          } else {
            onChange("tradeIn", field, event.target.value);
          }
        }}
        placeholder={placeholder}
        required={required}
        type={field === "mileageKm" ? "text" : type}
        value={displayValue}
      />
    </InventoryField>
  );
}

function isRequiredTradeInInputComplete(
  field: string,
  value: unknown,
): boolean {
  const text = snapshotText(value);
  if (field === "plate") return text.replace(/[^A-Za-z0-9]/g, "").length >= 7;
  if (field === "chassi") {
    return text.replace(/[^A-Za-z0-9]/g, "").length === 17;
  }
  if (field === "renavam") return text.replace(/\D/g, "").length === 11;
  if (field === "yearModel") {
    return (
      typeof value === "number" && Number.isSafeInteger(value) && value > 0
    );
  }
  return text.trim().length > 0;
}

function TradeInSelect({
  className,
  field,
  label,
  onChange,
  options,
  tradeIn,
}: {
  className?: string;
  field: string;
  label: string;
  onChange: ServiceChangeHandler;
  options: readonly { label: string; value: string }[];
  tradeIn: SnapshotRecord;
}) {
  return (
    <InventoryField className={className} label={label}>
      <InventorySelect
        onChange={(value) => onChange("tradeIn", field, value)}
        options={[{ label: "Selecione", value: "" }, ...options]}
        value={snapshotText(tradeIn[field])}
      />
    </InventoryField>
  );
}

function TradeInFieldGroup({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-line/60 bg-app/35 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-black text-app-text">
        <span className="text-accent-strong">{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function readTradeInCatalog(
  tradeIn: SnapshotRecord,
): InventoryCatalogSnapshot | null {
  if (tradeIn.catalog && typeof tradeIn.catalog === "object") {
    return tradeIn.catalog as InventoryCatalogSnapshot;
  }
  const brandName = snapshotText(tradeIn.brand) || null;
  const modelName = snapshotText(tradeIn.model) || null;
  const modelYear = snapshotNumber(tradeIn.yearModel);
  if (!brandName && !modelName) return null;
  return {
    brandCode: null,
    brandName,
    fipeCode: null,
    fuel: null,
    modelCode: null,
    modelName,
    modelYear,
    priceCents: null,
    referenceMonth: null,
    source: null,
    vehicleType: null,
    yearCode: null,
    yearName: modelYear ? String(modelYear) : null,
  };
}

function snapshotText(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}
