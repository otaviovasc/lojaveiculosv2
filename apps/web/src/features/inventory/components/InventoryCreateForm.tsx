import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Car, ClipboardList } from "lucide-react";
import {
  createListingStatusOptions,
  fuelTypeOptions,
  transmissionOptions,
  type InventoryEditableField,
  type InventoryFormState,
} from "../model/formModel";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryPlateLookupResponse } from "../model/enrichmentTypes";
import { InventoryCatalogSelector } from "./InventoryCatalogSelector";
import {
  InventoryField,
  InventoryInput,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
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
  onChange: (
    field: InventoryEditableField,
  ) => (
    value:
      | ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
      | string,
  ) => void;
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
  return (
    <div className="flex flex-col gap-6">
      <InventoryCreateEnrichmentPanel
        api={api}
        form={form}
        onLookupComplete={onLookupComplete}
        onSetFormDirect={onSetFormDirect}
      />

      <InventoryCreateMediaPanel items={media} onChange={onMediaChange} />

      <SectionPanel
        icon={<Car className="size-5" />}
        title="Identificação do Veículo"
      >
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-start border-b border-line/60 pb-4 mb-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <span className="font-black text-muted uppercase tracking-wider text-[10px]">
              Loja Operacional *
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
            <span className="font-black text-muted uppercase tracking-wider text-[10px]">
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
        />
      </SectionPanel>

      <InventoryCreateCostsSection form={form} onChange={onChange} />

      <SectionPanel
        icon={<Car className="size-5" />}
        title="Especificações e Anúncio"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InventoryField label="Ano Fabricação">
            <InventoryInput
              onChange={onChange("manufactureYear")}
              placeholder="Ex: 2021"
              type="number"
              value={form.manufactureYear}
            />
          </InventoryField>
          <InventoryField label="Ano Modelo">
            <InventoryInput
              onChange={onChange("modelYear")}
              placeholder="Ex: 2022"
              type="number"
              value={form.modelYear}
            />
          </InventoryField>
          <InventoryField label="Versão">
            <InventoryInput
              onChange={onChange("trimName")}
              placeholder="Ex: Comfort 1.0"
              value={form.trimName}
            />
          </InventoryField>
          <InventoryField label="Cor">
            <InventoryInput
              onChange={onChange("colorName")}
              placeholder="Ex: Branco"
              value={form.colorName}
            />
          </InventoryField>
          <InventoryField label="Quilometragem">
            <InventoryInput
              inputMode="numeric"
              onChange={onChange("mileageKm")}
              placeholder="Ex: 32500"
              type="number"
              value={form.mileageKm}
            />
          </InventoryField>
          <InventoryField label="Combustível">
            <InventorySelect
              onChange={onChange("fuelType")}
              options={[{ label: "Selecione", value: "" }, ...fuelTypeOptions]}
              value={form.fuelType}
            />
          </InventoryField>
          <InventoryField label="Câmbio">
            <InventorySelect
              onChange={onChange("transmission")}
              options={[
                { label: "Selecione", value: "" },
                ...transmissionOptions,
              ]}
              value={form.transmission}
            />
          </InventoryField>
          <InventoryField label="Motor">
            <InventoryInput
              onChange={onChange("engineDisplacement")}
              placeholder="Ex: 2.0 Turbo"
              value={form.engineDisplacement}
            />
          </InventoryField>
          <InventoryField label="Portas">
            <InventoryInput
              inputMode="numeric"
              onChange={onChange("doors")}
              placeholder="Ex: 4"
              type="number"
              value={form.doors}
            />
          </InventoryField>
        </div>
        <InventoryField label="Título de Anúncio *">
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
