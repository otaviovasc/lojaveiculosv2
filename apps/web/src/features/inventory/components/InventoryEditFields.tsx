import { BadgeDollarSign, CarFront, ClipboardList, Gauge } from "lucide-react";
import { listingStatusOptions, unitStatusOptions } from "../model/formModel";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryEditState } from "../model/inventoryEditModel";
import { inventoryUnitStatusLabels } from "../model/listCatalogModel";
import {
  formatInventoryPlateInput,
  formatInventoryRenavamInput,
  formatInventoryVinInput,
} from "../model/inventoryInputFormatting";
import { InventoryCatalogSelector } from "./InventoryCatalogSelector";
import { InventoryEditTechnicalFields } from "./InventoryEditTechnicalFields";
import {
  InventoryField,
  InventoryColorSelect,
  InventoryCurrencyInput,
  InventoryInput,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
import type { InventoryUnit } from "../model/types";

export function EditListingFields({
  api,
  form,
  onChange,
}: {
  api: InventoryApi;
  form: InventoryEditState;
  onChange: (value: InventoryEditState) => void;
}) {
  const setCatalog = (catalog: InventoryEditState["catalog"]) =>
    onChange({
      ...form,
      catalog,
      modelYear: catalog?.modelYear ? String(catalog.modelYear) : "",
      trimName: catalog?.modelName ?? "",
    });

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2 text-sm font-black text-app-text">
        <CarFront aria-hidden="true" className="size-4 text-accent-strong" />
        Anúncio
      </div>
      <InventoryField label="Título" required>
        <InventoryInput
          onChange={(event) => onChange({ ...form, title: event.target.value })}
          value={form.title}
        />
      </InventoryField>
      <div className="grid gap-4 sm:grid-cols-2">
        <InventoryField label="Preço" required>
          <InventoryCurrencyInput
            onValueChange={(price) => onChange({ ...form, price })}
            placeholder="0,00"
            value={form.price}
          />
        </InventoryField>
        <InventoryField label="Status" required>
          <InventorySelect
            onChange={(status) =>
              onChange({
                ...form,
                status,
              })
            }
            options={listingStatusOptions}
            value={form.status}
          />
        </InventoryField>
      </div>
      <InventoryField label="Descrição comercial">
        <InventoryTextarea
          onChange={(event) =>
            onChange({ ...form, description: event.target.value })
          }
          value={form.description}
        />
      </InventoryField>
      <div className="flex items-center gap-2 border-t border-line pt-4 text-sm font-black text-app-text">
        <ClipboardList
          aria-hidden="true"
          className="size-4 text-accent-strong"
        />
        Catálogo FIPE
      </div>
      <p className="-mt-2 text-xs font-bold text-muted">
        Selecione em ordem: tipo, marca, modelo, ano e versão.
      </p>
      <InventoryCatalogSelector
        api={api}
        catalog={form.catalog}
        onCatalogChange={setCatalog}
        onYearChange={(year) => {
          if (!year) return;
          onChange({
            ...form,
            manufactureYear: form.manufactureYear || String(year),
            modelYear: String(year),
          });
        }}
        manufactureYear={form.manufactureYear}
        onManufactureYearChange={(value) =>
          onChange({ ...form, manufactureYear: value })
        }
      />
      <div className="flex items-center gap-2 border-t border-line pt-4 text-sm font-black text-app-text">
        <Gauge aria-hidden="true" className="size-4 text-accent-strong" />
        Especificações
      </div>
      <InventoryEditTechnicalFields form={form} onChange={onChange} />
      <InventoryField label="Notas internas">
        <InventoryTextarea
          onChange={(event) =>
            onChange({ ...form, internalNotes: event.target.value })
          }
          placeholder="Pendências, preparação ou contexto da negociação."
          value={form.internalNotes}
        />
      </InventoryField>
    </div>
  );
}

export function EditUnitFields({
  form,
  onChange,
  unit,
}: {
  form: InventoryEditState;
  onChange: (value: InventoryEditState) => void;
  unit: InventoryUnit | null;
}) {
  return (
    <div className="grid content-start gap-4">
      <div className="flex items-center gap-2 text-sm font-black text-app-text">
        <BadgeDollarSign
          aria-hidden="true"
          className="size-4 text-accent-strong"
        />
        Unidade
      </div>
      {!unit ? (
        <p className="rounded-lg border border-line bg-app p-3 text-sm font-bold text-muted">
          Nenhuma unidade vinculada.
        </p>
      ) : (
        <UnitFields form={form} onChange={onChange} unit={unit} />
      )}
    </div>
  );
}

function UnitFields({
  form,
  onChange,
  unit,
}: {
  form: InventoryEditState;
  onChange: (value: InventoryEditState) => void;
  unit: InventoryUnit;
}) {
  const workflowStatus = unit.status === "reserved" || unit.status === "sold";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <InventoryField label="Cor">
        <InventoryColorSelect
          onChange={(colorName) =>
            onChange({
              ...form,
              colorName,
            })
          }
          value={form.colorName || ""}
        />
      </InventoryField>
      <InventoryField label="Placa">
        <InventoryInput
          className="font-mono uppercase"
          maxLength={7}
          onChange={(event) =>
            onChange({
              ...form,
              plate: formatInventoryPlateInput(event.target.value),
            })
          }
          placeholder="Ex: ABC1D23"
          value={form.plate}
        />
      </InventoryField>
      <InventoryField label="Status da unidade" required>
        {workflowStatus ? (
          <InventoryInput
            disabled
            value={inventoryUnitStatusLabels[unit.status]}
          />
        ) : (
          <InventorySelect
            onChange={(unitStatus) => onChange({ ...form, unitStatus })}
            options={unitStatusOptions}
            value={form.unitStatus}
          />
        )}
      </InventoryField>
      <InventoryField label="Número de estoque">
        <InventoryInput
          onChange={(event) =>
            onChange({ ...form, stockNumber: event.target.value })
          }
          value={form.stockNumber}
        />
      </InventoryField>
      <InventoryField label="Chassi">
        <InventoryInput
          className="font-mono uppercase"
          maxLength={17}
          onChange={(event) =>
            onChange({
              ...form,
              vin: formatInventoryVinInput(event.target.value),
            })
          }
          placeholder="17 caracteres"
          value={form.vin}
        />
      </InventoryField>
      <InventoryField label="Renavam">
        <InventoryInput
          className="font-mono"
          inputMode="numeric"
          maxLength={11}
          onChange={(event) =>
            onChange({
              ...form,
              renavam: formatInventoryRenavamInput(event.target.value),
            })
          }
          placeholder="11 dígitos"
          value={form.renavam}
        />
      </InventoryField>
    </div>
  );
}
