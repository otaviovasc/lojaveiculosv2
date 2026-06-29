import { useState } from "react";
import { FeatureInput } from "../../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
  FeatureFormSection,
} from "../../../components/ui/FeatureForms";
import {
  FeatureDialogActions,
  FeatureDrawer,
} from "../../../components/ui/FeatureOverlay";

export interface VehicleSpecs {
  plate: string;
  color: string;
  km: string;
  fuel: string;
  transmission: string;
  bodyType: string;
  engine: string;
  doors: string;
  modality: string;
  vin: string;
}

export function EditSpecsDrawer({
  isOpen,
  onClose,
  specs,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  specs: VehicleSpecs;
  onSave: (specs: VehicleSpecs) => void;
}) {
  const [form, setForm] = useState<VehicleSpecs>(specs);

  if (!isOpen) return null;

  const renderField = (
    label: string,
    key: keyof VehicleSpecs,
    className = "",
  ) => (
    <FeatureField className={className} label={label}>
      <FeatureInput
        type="text"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </FeatureField>
  );

  return (
    <FeatureDrawer
      className="w-[640px]"
      footer={
        <FeatureDialogActions
          confirmLabel="Salvar Especificações"
          onCancel={onClose}
          onConfirm={() => onSave(form)}
        />
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Especificações"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="flex flex-col gap-6"
      >
        <FeatureFormSection title="Identificação e Registro">
          <FeatureFieldGroup>
            {renderField("Placa", "plate")}
            {renderField("Modalidade", "modality")}
            {renderField("Chassi / VIN", "vin", "md:col-span-2")}
          </FeatureFieldGroup>
        </FeatureFormSection>

        <FeatureFormSection title="Ficha Técnica">
          <FeatureFieldGroup>
            {renderField("Quilometragem", "km")}
            {renderField("Cor", "color")}
            {renderField("Portas", "doors")}
            {renderField("Carroceria", "bodyType")}
          </FeatureFieldGroup>
        </FeatureFormSection>

        <FeatureFormSection
          className="border-b-0 pb-0"
          title="Motorização e Câmbio"
        >
          <FeatureFieldGroup>
            {renderField("Motor", "engine")}
            {renderField("Combustível", "fuel")}
            {renderField("Transmissão", "transmission", "md:col-span-2")}
          </FeatureFieldGroup>
        </FeatureFormSection>
      </form>
    </FeatureDrawer>
  );
}
