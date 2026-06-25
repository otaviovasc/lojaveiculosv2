import { BadgeDollarSign, CarFront } from "lucide-react";
import { listingStatusOptions, unitStatusOptions } from "../model/formModel";
import type { InventoryApi } from "../api/apiClient";
import { InventoryCatalogSelector } from "./InventoryCatalogSelector";
import {
  InventoryField,
  InventoryColorSelect,
  InventoryInput,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
import type { InventoryListingDetail, InventoryUnit } from "../model/types";

export type InventoryEditState = {
  catalog: InventoryListingDetail["listing"]["catalog"];
  colorName: InventoryUnit["colorName"] | "";
  description: string;
  manufactureYear: string;
  modelYear: string;
  plate: string;
  price: string;
  status: InventoryListingDetail["listing"]["status"];
  stockNumber: string;
  title: string;
  trimName: string;
  unitStatus: InventoryUnit["status"];
  vin: string;
};

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
        Anuncio
      </div>
      <InventoryField label="Titulo" required>
        <InventoryInput
          onChange={(event) => onChange({ ...form, title: event.target.value })}
          value={form.title}
        />
      </InventoryField>
      <div className="grid gap-4 sm:grid-cols-2">
        <InventoryField label="Preco" required>
          <InventoryInput
            inputMode="decimal"
            onChange={(event) =>
              onChange({ ...form, price: event.target.value })
            }
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
      <InventoryField label="Descricao">
        <InventoryTextarea
          onChange={(event) =>
            onChange({ ...form, description: event.target.value })
          }
          value={form.description}
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
        <UnitFields form={form} onChange={onChange} />
      )}
    </div>
  );
}

function UnitFields({
  form,
  onChange,
}: {
  form: InventoryEditState;
  onChange: (value: InventoryEditState) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
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
            onChange={(event) =>
              onChange({ ...form, plate: event.target.value })
            }
            value={form.plate}
          />
        </InventoryField>
        <InventoryField label="Status da unidade" required>
          <InventorySelect
            onChange={(unitStatus) =>
              onChange({
                ...form,
                unitStatus,
              })
            }
            options={unitStatusOptions}
            value={form.unitStatus}
          />
        </InventoryField>
      </div>
      <InventoryField label="Numero de estoque">
        <InventoryInput
          onChange={(event) =>
            onChange({ ...form, stockNumber: event.target.value })
          }
          value={form.stockNumber}
        />
      </InventoryField>
      <InventoryField label="Chassi">
        <InventoryInput
          onChange={(event) => onChange({ ...form, vin: event.target.value })}
          value={form.vin}
        />
      </InventoryField>
    </>
  );
}
