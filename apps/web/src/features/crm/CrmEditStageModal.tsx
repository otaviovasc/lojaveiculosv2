import { useState } from "react";
import { Check } from "lucide-react";
import { FeatureColorPicker } from "../../components/ui/FeatureColorPicker";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import type { PipelineStage } from "./crmPipelineStorage";

type Props = {
  stage: PipelineStage;
  onClose: () => void;
  onSave: (name: string, color: string, slaDays: number | null) => void;
};

const PRESET_COLORS = [
  "3b82f6",
  "6366f1",
  "a855f7",
  "ec4899",
  "ef4444",
  "f97316",
  "eab308",
  "22c55e",
].map((color) => ["#", color].join(""));

export function CrmEditStageModal({ stage, onClose, onSave }: Props) {
  const [name, setName] = useState(stage.name);
  const [slaDays, setSlaDays] = useState(stage.slaDays ?? 1);
  const [color, setColor] = useState(stage.color);
  const slaIsValid =
    stage.status !== "open" ||
    (Number.isInteger(slaDays) && slaDays >= 1 && slaDays <= 365);

  const handleSubmit = () => {
    if (!name.trim() || !slaIsValid) return;
    onSave(name.trim(), color, stage.status === "open" ? slaDays : null);
    onClose();
  };

  return (
    <FeatureDialog
      className="max-w-md"
      description="Altere o nome, cor ou SLA da etapa"
      footer={
        <FeatureDialogActions
          confirmDisabled={!name.trim() || !slaIsValid}
          confirmIcon={<Check aria-hidden="true" className="size-4" />}
          confirmLabel="Salvar"
          onCancel={onClose}
          onConfirm={handleSubmit}
        />
      }
      isOpen
      onClose={onClose}
      title="Editar Etapa"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <FeatureField label="Nome da Etapa *">
          <FeatureInput
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Qualificado"
            required
            type="text"
            value={name}
          />
        </FeatureField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureField
            error={slaIsValid ? undefined : "Informe entre 1 e 365 dias."}
            label="SLA de Atendimento (Dias)"
          >
            <FeatureInput
              aria-invalid={!slaIsValid}
              disabled={stage.status !== "open"}
              max={365}
              min={1}
              onChange={(e) => setSlaDays(Number(e.target.value))}
              type="number"
              value={slaDays}
            />
          </FeatureField>
          <FeatureColorPicker
            label="Cor da Etapa"
            onChange={setColor}
            presets={PRESET_COLORS}
            value={color}
          />
        </div>
        <button
          aria-hidden="true"
          className="hidden"
          tabIndex={-1}
          type="submit"
        />
      </form>
    </FeatureDialog>
  );
}
