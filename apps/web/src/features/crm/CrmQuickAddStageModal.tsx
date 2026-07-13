import { useState } from "react";
import { Plus, Layers } from "lucide-react";
import { FeatureColorPicker } from "../../components/ui/FeatureColorPicker";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";

type Props = {
  onClose: () => void;
  onAddStage: (name: string, color: string, slaDays: number) => void;
};

const defaultStageColor = ["#", "3b82f6"].join("");
const stageColorPresets = [
  "3b82f6",
  "6366f1",
  "a855f7",
  "ec4899",
  "ef4444",
  "f97316",
  "eab308",
  "22c55e",
].map((color) => ["#", color].join(""));

export function CrmQuickAddStageModal({ onClose, onAddStage }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultStageColor);
  const [slaDays, setSlaDays] = useState(2);
  const slaIsValid =
    Number.isInteger(slaDays) && slaDays >= 1 && slaDays <= 365;

  const handleSubmit = () => {
    if (!name.trim() || !slaIsValid) return;
    onAddStage(name.trim(), color, slaDays);
    onClose();
  };

  return (
    <FeatureDialog
      className="max-w-md"
      description="Adicionar etapa ao funil de vendas"
      footer={
        <FeatureDialogActions
          confirmDisabled={!name.trim() || !slaIsValid}
          confirmIcon={<Plus aria-hidden="true" className="size-4" />}
          confirmLabel="Adicionar Fase"
          onCancel={onClose}
          onConfirm={handleSubmit}
        />
      }
      isOpen
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Layers aria-hidden="true" className="size-5 text-accent" />
          <span>Criar Nova Fase</span>
        </span>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <FeatureField label="Nome da Fase *">
          <FeatureInput
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Proposta Enviada"
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
            presets={stageColorPresets}
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
