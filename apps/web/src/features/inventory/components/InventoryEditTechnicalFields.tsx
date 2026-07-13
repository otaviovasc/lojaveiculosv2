import {
  engineAspirationOptions,
  engineDisplacementOptions,
  fuelTypeOptions,
  transmissionOptions,
} from "../model/formModel";
import type { InventoryEditState } from "../model/inventoryEditModel";
import {
  InventoryField,
  InventoryInput,
  InventorySelect,
} from "./InventoryFormParts";

export function InventoryEditTechnicalFields({
  form,
  onChange,
}: {
  form: InventoryEditState;
  onChange: (value: InventoryEditState) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InventoryField label="Quilometragem">
        <InventoryInput
          inputMode="numeric"
          min={0}
          onChange={(event) =>
            onChange({ ...form, mileageKm: event.target.value })
          }
          type="number"
          value={form.mileageKm}
        />
      </InventoryField>
      <InventoryField label="Ano do modelo">
        <InventoryInput
          inputMode="numeric"
          min={0}
          onChange={(event) =>
            onChange({ ...form, modelYear: event.target.value })
          }
          type="number"
          value={form.modelYear}
        />
      </InventoryField>
      <InventoryField label="Combustível">
        <InventorySelect
          onChange={(fuelType) => onChange({ ...form, fuelType })}
          options={[{ label: "Não informado", value: "" }, ...fuelTypeOptions]}
          value={form.fuelType}
        />
      </InventoryField>
      <InventoryField label="Transmissão">
        <InventorySelect
          onChange={(transmission) => onChange({ ...form, transmission })}
          options={[
            { label: "Não informado", value: "" },
            ...transmissionOptions,
          ]}
          value={form.transmission}
        />
      </InventoryField>
      <InventoryField label="Litragem">
        <InventorySelect
          onChange={(engineDisplacement) =>
            onChange({ ...form, engineDisplacement })
          }
          options={[
            { label: "Não informado", value: "" },
            ...engineDisplacementOptions,
          ]}
          value={form.engineDisplacement}
        />
      </InventoryField>
      <InventoryField label="Aspiração">
        <InventorySelect
          onChange={(engineAspiration) =>
            onChange({ ...form, engineAspiration })
          }
          options={[
            { label: "Não informado", value: "" },
            ...engineAspirationOptions,
          ]}
          value={form.engineAspiration}
        />
      </InventoryField>
      <InventoryField label="Portas">
        <InventoryInput
          inputMode="numeric"
          min={0}
          onChange={(event) => onChange({ ...form, doors: event.target.value })}
          type="number"
          value={form.doors}
        />
      </InventoryField>
    </div>
  );
}
