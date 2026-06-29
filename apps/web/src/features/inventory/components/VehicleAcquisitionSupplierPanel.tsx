import { Archive, Save } from "lucide-react";
import type { CustomSelectOption } from "../../../components/ui/CustomSelect";
import type { VehicleSupplierKind } from "../model/types";
import {
  InventoryField,
  InventoryInput,
  InventorySelect,
} from "./InventoryFormParts";
import { IconButton, TextField } from "./VehicleAcquisitionCardParts";
import {
  supplierKindOptions,
  type SupplierDraft,
} from "./VehicleAcquisitionCardModel";

type Props = {
  isSaving: boolean;
  onArchive: () => void;
  onSave: () => void;
  onSelectSupplier: (supplierId: string) => void;
  onUpdateSupplierDraft: (
    field: keyof SupplierDraft,
    value: string | VehicleSupplierKind,
  ) => void;
  selectedSupplierId: string;
  supplierDraft: SupplierDraft;
  supplierOptions: readonly CustomSelectOption[];
};

export function VehicleAcquisitionSupplierPanel({
  isSaving,
  onArchive,
  onSave,
  onSelectSupplier,
  onUpdateSupplierDraft,
  selectedSupplierId,
  supplierDraft,
  supplierOptions,
}: Props) {
  return (
    <div className="grid gap-3">
      <InventoryField label="Fornecedor">
        <InventorySelect
          onChange={onSelectSupplier}
          options={supplierOptions}
          value={selectedSupplierId}
        />
      </InventoryField>
      <InventoryField label="Nome">
        <InventoryInput
          onChange={(event) =>
            onUpdateSupplierDraft("displayName", event.target.value)
          }
          value={supplierDraft.displayName}
        />
      </InventoryField>
      <div className="grid gap-3 sm:grid-cols-2">
        <InventoryField label="Tipo">
          <InventorySelect
            onChange={(value) => onUpdateSupplierDraft("kind", value)}
            options={supplierKindOptions}
            value={supplierDraft.kind}
          />
        </InventoryField>
        <TextField
          label="Documento"
          onChange={(value) => onUpdateSupplierDraft("documentNumber", value)}
          value={supplierDraft.documentNumber}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Telefone"
          onChange={(value) => onUpdateSupplierDraft("phone", value)}
          value={supplierDraft.phone}
        />
        <TextField
          label="Email"
          onChange={(value) => onUpdateSupplierDraft("email", value)}
          value={supplierDraft.email}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Provider"
          onChange={(value) => onUpdateSupplierDraft("provider", value)}
          value={supplierDraft.provider}
        />
        <TextField
          label="Codigo externo"
          onChange={(value) =>
            onUpdateSupplierDraft("externalProviderId", value)
          }
          value={supplierDraft.externalProviderId}
        />
      </div>
      <div className="flex gap-2">
        <IconButton
          disabled={isSaving}
          icon={<Save className="size-3.5" />}
          label={selectedSupplierId ? "Salvar" : "Criar"}
          onClick={onSave}
          variant="primary"
        />
        <IconButton
          disabled={!selectedSupplierId || isSaving}
          icon={<Archive className="size-3.5" />}
          label="Arquivar"
          onClick={onArchive}
        />
      </div>
    </div>
  );
}
