import { coerceVehicleColor } from "@lojaveiculosv2/shared";
import { CarFront, Check, ClipboardList, Gauge, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
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
import { SaleField } from "./SaleWorkspaceForm";
import { formatCurrency, parseCurrency } from "./saleServicesFormat";
import { snapshotBoolean, snapshotNumber } from "./salesSnapshot";
import type { ServiceChangeHandler } from "./SaleServicesTypes";
import type { SnapshotRecord } from "./salesSnapshot";
import type { SaleRecord } from "./types";

export function TradeInPanel({
  inventoryApi,
  onChange,
  sale,
  tradeIn,
}: {
  inventoryApi: InventoryApi | null;
  onChange: ServiceChangeHandler;
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
  sale,
  tradeIn,
}: {
  inventoryApi: InventoryApi | null;
  onChange: ServiceChangeHandler;
  sale: SaleRecord;
  tradeIn: SnapshotRecord;
}) {
  const catalog = readTradeInCatalog(tradeIn);

  return (
    <div className="flex flex-col gap-5">
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
            tradeIn={tradeIn}
          />
          <TradeInInput
            field="chassi"
            label="Chassi / VIN"
            onChange={onChange}
            placeholder="Chassi ou VIN"
            tradeIn={tradeIn}
          />
          <TradeInInput
            field="renavam"
            label="Renavam"
            onChange={onChange}
            placeholder="Ex: 11 dígitos"
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
              tradeIn={tradeIn}
            />
            <TradeInInput
              field="model"
              label="Modelo / versão"
              onChange={onChange}
              placeholder="Informe o modelo e a versão"
              tradeIn={tradeIn}
            />
            <TradeInInput
              field="yearModel"
              label="Ano modelo"
              onChange={onChange}
              placeholder="Ex: 2022"
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

      <div>
        <SaleField label="Valor de avaliação / entrada">
          <input
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
            value={formatCurrency(snapshotNumber(tradeIn.valuationCents))}
          />
        </SaleField>
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
  tradeIn,
  type = "text",
}: {
  className?: string;
  field: string;
  label: string;
  onChange: ServiceChangeHandler;
  placeholder: string;
  tradeIn: SnapshotRecord;
  type?: "number" | "text";
}) {
  return (
    <InventoryField className={className} label={label}>
      <InventoryInput
        inputMode={type === "number" ? "numeric" : undefined}
        onChange={(event) => onChange("tradeIn", field, event.target.value)}
        placeholder={placeholder}
        type={type}
        value={String(tradeIn[field] ?? "")}
      />
    </InventoryField>
  );
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
