import { Tags } from "lucide-react";
import type { InventoryApi } from "../api/apiClient";
import { InventoryCatalogSelector } from "./InventoryCatalogSelector";
import { InventoryBadge, InventoryPanel } from "./InventoryFormParts";
import type { InventoryCatalogSnapshot } from "../model/types";

export function InventoryCatalogExplorer({
  api,
  catalog,
  onCatalogChange,
}: {
  api: InventoryApi | null;
  catalog: InventoryCatalogSnapshot | null;
  onCatalogChange: (catalog: InventoryCatalogSnapshot | null) => void;
}) {
  return (
    <InventoryPanel icon={<Tags className="size-5" />} title="Catalogo FIPE">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <InventoryBadge>Somente leitura</InventoryBadge>
          <InventoryBadge tone="blue">Catalogo V2</InventoryBadge>
        </div>
        <InventoryCatalogSelector
          api={api}
          catalog={catalog}
          onCatalogChange={onCatalogChange}
        />
        {catalog ? (
          <div className="grid gap-2 rounded-lg border border-line bg-app p-3 text-sm font-bold text-muted sm:grid-cols-2">
            <CatalogValue label="Marca" value={catalog.brandName} />
            <CatalogValue label="Modelo" value={catalog.modelName} />
            <CatalogValue label="Ano" value={catalog.yearName} />
            <CatalogValue label="Referencia" value={catalog.referenceMonth} />
          </div>
        ) : null}
      </div>
    </InventoryPanel>
  );
}

function CatalogValue({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <p>
      <span className="text-app-text">{label}: </span>
      {value ?? "-"}
    </p>
  );
}
