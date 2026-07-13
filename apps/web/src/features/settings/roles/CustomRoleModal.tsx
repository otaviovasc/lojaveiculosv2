import { useRef, useState } from "react";
import { FeatureInput } from "../../../components/ui/FeatureControls";
import { FeatureField } from "../../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../../components/ui/FeatureOverlay";

export function CustomRoleModal({
  isOpen,
  onClose,
  baseRoleLabel,
  exceptionsCount,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  baseRoleLabel: string;
  exceptionsCount: number;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  if (!isOpen) return null;

  return (
    <FeatureDialog
      description={`Isso salvará a configuração atual de cargo base (${baseRoleLabel}) e as ${exceptionsCount} exceções configuradas como um preset reutilizável na loja.`}
      footer={
        <FeatureDialogActions
          confirmLabel="Criar Cargo"
          onCancel={onClose}
          onConfirm={() => formRef.current?.requestSubmit()}
        />
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Salvar como Cargo Customizado"
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) {
            onCreate(name.trim());
            setName("");
          }
        }}
        ref={formRef}
      >
        <FeatureField label="Nome do Cargo Customizado">
          <FeatureInput
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Vendedor Sênior, Supervisor Especial"
            required
            type="text"
            value={name}
          />
        </FeatureField>
      </form>
    </FeatureDialog>
  );
}
