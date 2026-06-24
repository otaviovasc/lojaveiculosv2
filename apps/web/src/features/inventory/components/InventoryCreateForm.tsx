import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Building2, Car, ClipboardList } from "lucide-react";
import {
  listingStatusOptions,
  type InventoryEditableField,
  type InventoryFormState,
} from "../model/formModel";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import type { InventoryApi } from "../api/apiClient";
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
interface InventoryCreateFormProps {
  api: InventoryApi | null;
  form: InventoryFormState;
  media: readonly CreateMediaDraft[];
  stores: Array<{ id: string; name: string; slug: string }>;
  onChange: (
    field: InventoryEditableField,
  ) => (
    value: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string,
  ) => void;
  onCatalogChange: (catalog: InventoryFormState["catalog"]) => void;
  onMediaChange: (media: CreateMediaDraft[]) => void;
  onSetFormDirect: Dispatch<SetStateAction<InventoryFormState>>;
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
}: InventoryCreateFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <InventoryCreateEnrichmentPanel
        api={api}
        form={form}
        onSetFormDirect={onSetFormDirect}
      />

      <SectionPanel
        icon={<Building2 className="size-5" />}
        title="Contexto da Loja"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <InventoryField label="Loja Operacional *">
            <InventorySelect
              ariaLabel="Selecione a loja"
              onChange={(value) => onChange("storeId")(value)}
              options={stores.map((s) => ({ label: s.name, value: s.id }))}
              value={form.storeId}
            />
          </InventoryField>
          <InventoryField label="Status inicial no estoque">
            <InventorySelect
              ariaLabel="Selecione o status inicial"
              onChange={(value) => onChange("status")(value)}
              options={listingStatusOptions}
              value={form.status}
            />
          </InventoryField>
        </div>
      </SectionPanel>

      <SectionPanel
        icon={<Car className="size-5" />}
        title="Identificação do Veículo"
      >
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
        subtitle="Selecione em ordem: tipo, marca, modelo, versão e ano."
      >
        <InventoryCatalogSelector
          api={api}
          catalog={form.catalog}
          onCatalogChange={onCatalogChange}
        />
      </SectionPanel>

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
      </SectionPanel>

      <InventoryCreateMediaPanel items={media} onChange={onMediaChange} />

      <InventoryCreateCostsSection form={form} onChange={onChange} />
    </div>
  );
}

function SectionPanel({
  children,
  icon,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="glass-panel-branded flex flex-col gap-5 rounded-2xl border border-line bg-panel p-6 shadow-[var(--shadow-panel)]">
      <header className="flex flex-col gap-1 border-b border-line pb-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-app-text">
          <span className="grid size-8 place-items-center rounded-md bg-accent-soft text-accent-strong border border-accent-soft/20">
            {icon}
          </span>
          {title}
        </h3>
        {subtitle ? (
          <p className="text-xs font-bold text-muted">{subtitle}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
