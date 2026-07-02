import type { Dispatch, SetStateAction } from "react";
import { Car, ClipboardList } from "lucide-react";
import {
  createListingStatusOptions,
  engineAspirationOptions,
  engineDisplacementOptions,
  fuelTypeOptions,
  isZeroKmInventoryForm,
  transmissionOptions,
  type InventoryFieldChangeHandler,
  type InventoryFormState,
} from "../model/formModel";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryPlateLookupResponse } from "../model/enrichmentTypes";
import { InventoryCatalogSelector } from "./InventoryCatalogSelector";
import {
  InventoryField,
  InventoryColorSelect,
  InventoryInput,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
import { InventoryColorStockEditor } from "./InventoryColorStockEditor";
import { InventoryCreateCostsSection } from "./InventoryCreateCostsSection";
import { InventoryCreateMediaPanel } from "./InventoryCreateMediaPanel";
import { InventoryCreateEnrichmentPanel } from "./InventoryCreateEnrichmentPanel";
import {
  SectionPanel,
  StatusOptionIcon,
  choiceButtonClassName,
  statusButtonClassName,
} from "./InventoryCreateFormParts";
interface InventoryCreateFormProps {
  api: InventoryApi | null;
  form: InventoryFormState;
  media: readonly CreateMediaDraft[];
  stores: Array<{ id: string; name: string; slug: string }>;
  onChange: InventoryFieldChangeHandler;
  onCatalogChange: (catalog: InventoryFormState["catalog"]) => void;
  onMediaChange: (media: CreateMediaDraft[]) => void;
  onSetFormDirect: Dispatch<SetStateAction<InventoryFormState>>;
  onLookupComplete: (result: InventoryPlateLookupResponse) => void;
}

export function InventoryCreateForm({
  api,
  form,
  media,
  stores,
  onChange,
  onCatalogChange,
  onMediaChange,
  onSetFormDirect,
  onLookupComplete,
}: InventoryCreateFormProps) {
  const isZeroKm = isZeroKmInventoryForm(form);
  const colorStockValue = form.colorStock.some((row) => row.colorName)
    ? form.colorStock
    : [{ colorName: form.colorName, quantity: "1" }];

  return (
    <div className="flex flex-col gap-6">
      <InventoryCreateEnrichmentPanel
        api={api}
        form={form}
        onLookupComplete={onLookupComplete}
        onSetFormDirect={onSetFormDirect}
      />

      <InventoryCreateMediaPanel
        form={form}
        items={media}
        onChange={onMediaChange}
      />

      <SectionPanel
        icon={<Car className="size-5" />}
        title="Identificação do Veículo"
      >
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-start border-b border-line/60 pb-4 mb-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <span className="font-black text-muted uppercase tracking-wider text-xs">
              Loja Operacional
              <span className="text-accent-strong ml-1" aria-hidden="true">
                *
              </span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {stores.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={choiceButtonClassName(form.storeId === s.id)}
                  onClick={() => onChange("storeId")(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-black text-muted uppercase tracking-wider text-xs">
              Status inicial no estoque
            </span>
            <div className="flex flex-wrap gap-1.5">
              {createListingStatusOptions.map((opt) => {
                const selected = form.status === opt.value;
                return (
                  <button
                    aria-pressed={selected}
                    key={opt.value}
                    type="button"
                    className={statusButtonClassName(opt.value, selected)}
                    onClick={() => onChange("status")(opt.value)}
                  >
                    <StatusOptionIcon status={opt.value} />
                    <span>{opt.label}</span>
                    {selected ? (
                      <span
                        aria-hidden="true"
                        className="ml-0.5 size-1.5 rounded-full bg-current"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InventoryField label="Placa">
            <InventoryInput
              className="font-mono uppercase"
              onChange={onChange("plate")}
              placeholder="Ex: abc1d23"
              value={form.plate}
            />
          </InventoryField>
          <InventoryField label="Chassi / VIN">
            <InventoryInput
              onChange={onChange("vin")}
              placeholder="Chassi ou VIN"
              value={form.vin}
            />
          </InventoryField>
          <InventoryField label="Número de Estoque">
            <InventoryInput
              onChange={onChange("stockNumber")}
              placeholder="Código de estoque"
              value={form.stockNumber}
            />
          </InventoryField>
        </div>
      </SectionPanel>

      <SectionPanel
        icon={<ClipboardList className="size-5" />}
        title="Catálogo FIPE"
        subtitle="Selecione em ordem: tipo, marca, modelo, ano e versão."
      >
        <InventoryCatalogSelector
          api={api}
          catalog={form.catalog}
          onCatalogChange={onCatalogChange}
          onYearChange={(year) => {
            if (year) {
              onSetFormDirect((current) => ({
                ...current,
                modelYear: String(year),
                manufactureYear: current.manufactureYear
                  ? current.manufactureYear
                  : String(year),
              }));
            }
          }}
          manufactureYear={form.manufactureYear}
          onManufactureYearChange={onChange("manufactureYear")}
        />
      </SectionPanel>

      <InventoryCreateCostsSection form={form} onChange={onChange} />

      <SectionPanel
        icon={<Car className="size-5" />}
        title="Especificações e Anúncio"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {isZeroKm ? (
            <InventoryField
              className="sm:col-span-2 lg:col-span-12"
              label="Cores em estoque"
              required
            >
              <InventoryColorStockEditor
                onChange={(colorStock) =>
                  onSetFormDirect((current) => ({
                    ...current,
                    colorName:
                      colorStock.find((row) => row.colorName)?.colorName ??
                      current.colorName,
                    colorStock,
                  }))
                }
                value={colorStockValue}
              />
            </InventoryField>
          ) : (
            <InventoryField className="lg:col-span-4" label="Cor" required>
              <InventoryColorSelect
                onChange={onChange("colorName")}
                value={form.colorName}
              />
            </InventoryField>
          )}
          <InventoryField
            className="lg:col-span-4"
            label="Quilometragem"
            required
          >
            <InventoryInput
              inputMode="numeric"
              min={0}
              onChange={onChange("mileageKm")}
              placeholder="Ex: 32500"
              type="number"
              value={form.mileageKm}
            />
          </InventoryField>
          <InventoryField className="lg:col-span-4" label="Combustível">
            <InventorySelect
              onChange={onChange("fuelType")}
              options={[{ label: "Selecione", value: "" }, ...fuelTypeOptions]}
              value={form.fuelType}
            />
          </InventoryField>
          <InventoryField
            className="lg:col-span-3 lg:col-start-1"
            label="Câmbio"
          >
            <InventorySelect
              onChange={onChange("transmission")}
              options={[
                { label: "Selecione", value: "" },
                ...transmissionOptions,
              ]}
              value={form.transmission}
            />
          </InventoryField>
          <InventoryField className="lg:col-span-3" label="Litragem">
            <InventorySelect
              onChange={onChange("engineDisplacement")}
              options={[
                { label: "Selecione", value: "" },
                ...engineDisplacementOptions,
              ]}
              value={form.engineDisplacement}
            />
          </InventoryField>
          <InventoryField className="lg:col-span-3" label="Aspiração">
            <InventorySelect
              onChange={onChange("engineAspiration")}
              options={[
                { label: "Selecione", value: "" },
                ...engineAspirationOptions,
              ]}
              value={form.engineAspiration}
            />
          </InventoryField>
          <InventoryField className="lg:col-span-3" label="Portas">
            <InventoryInput
              inputMode="numeric"
              onChange={onChange("doors")}
              placeholder="Ex: 4"
              type="number"
              value={form.doors}
            />
          </InventoryField>
        </div>
        <InventoryField label="Título de Anúncio" required>
          <InventoryInput
            onChange={onChange("title")}
            placeholder="Ex: Hyundai HB20 Comfort 1.0 2021"
            value={form.title}
          />
        </InventoryField>
        <InventoryField label="Descrição Comercial">
          <InventoryTextarea
            onChange={onChange("description")}
            placeholder="Diferenciais do veículo, histórico, opcionais de destaque, etc."
            value={form.description}
          />
        </InventoryField>
        <InventoryField label="Notas Internas">
          <InventoryTextarea
            onChange={onChange("internalNotes")}
            placeholder="Observações internas da loja, pendências, preparação, origem da negociação."
            value={form.internalNotes}
          />
        </InventoryField>
      </SectionPanel>
    </div>
  );
}
