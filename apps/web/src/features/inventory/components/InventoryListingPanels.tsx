import { Car, PackagePlus } from "lucide-react";
import {
  listingStatusOptions,
  type InventoryFieldChangeHandler,
  type InventoryFormState,
} from "../model/formModel";
import type { InventoryApi } from "../api/apiClient";
import { InventoryCatalogSelector } from "./InventoryCatalogSelector";
import {
  InventoryField,
  InventoryInput,
  InventoryPanel,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";

export function ListingPanel({
  api,
  form,
  onChange,
  onCatalogChange,
}: {
  api: InventoryApi | null;
  form: InventoryFormState;
  onChange: InventoryFieldChangeHandler;
  onCatalogChange: (catalog: InventoryFormState["catalog"]) => void;
}) {
  return (
    <InventoryPanel icon={<Car className="size-5" />} title="Anuncio">
      <div className="grid gap-4 md:grid-cols-2">
        <InventoryField label="Titulo">
          <InventoryInput
            onChange={onChange("title")}
            placeholder="Marca, modelo, versao e ano"
            required
            value={form.title}
          />
        </InventoryField>
        <InventoryField label="Status inicial">
          <InventorySelect onChange={onChange("status")} value={form.status}>
            {listingStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </InventorySelect>
        </InventoryField>
        <InventoryField label="Preco anunciado">
          <InventoryInput
            inputMode="decimal"
            onChange={onChange("price")}
            placeholder="0,00"
            value={form.price}
          />
        </InventoryField>
        <InventoryField label="Placa do anuncio">
          <InventoryInput
            onChange={onChange("plate")}
            placeholder="Opcional"
            value={form.plate}
          />
        </InventoryField>
      </div>
      <div className="mt-4">
        <InventoryCatalogSelector
          api={api}
          catalog={form.catalog}
          onCatalogChange={onCatalogChange}
        />
      </div>
      <div className="mt-4">
        <InventoryField label="Descricao">
          <InventoryTextarea
            onChange={onChange("description")}
            placeholder="Resumo comercial, estado de conservacao e diferenciais"
            value={form.description}
          />
        </InventoryField>
      </div>
    </InventoryPanel>
  );
}

export function UnitPanel({
  form,
  onChange,
}: {
  form: InventoryFormState;
  onChange: InventoryFieldChangeHandler;
}) {
  return (
    <InventoryPanel icon={<PackagePlus className="size-5" />} title="Unidade">
      <div className="grid gap-4 md:grid-cols-3">
        <InventoryField label="Numero de estoque">
          <InventoryInput
            onChange={onChange("stockNumber")}
            placeholder="Opcional"
            value={form.stockNumber}
          />
        </InventoryField>
        <InventoryField
          hint="Usa a placa do anuncio se ficar vazio."
          label="Placa da unidade"
        >
          <InventoryInput
            onChange={onChange("unitPlate")}
            placeholder="Opcional"
            value={form.unitPlate}
          />
        </InventoryField>
        <InventoryField label="Chassi">
          <InventoryInput
            onChange={onChange("vin")}
            placeholder="Opcional"
            value={form.vin}
          />
        </InventoryField>
      </div>
    </InventoryPanel>
  );
}
