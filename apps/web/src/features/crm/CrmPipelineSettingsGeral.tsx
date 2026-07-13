import { useState } from "react";
import { Trash, Star, Save, CircleAlert } from "lucide-react";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Switch } from "../../components/ui/switch";
import type { Pipeline } from "./crmPipelineStorage";

type Props = {
  pipeline: Pipeline;
  onUpdate: (updated: Pipeline) => void;
  onDelete: (pipelineId: string) => void;
};

export function CrmPipelineSettingsGeral({
  pipeline,
  onUpdate,
  onDelete,
}: Props) {
  const [name, setName] = useState(pipeline.name);
  const [description, setDescription] = useState(pipeline.description || "");
  const [isDefault, setIsDefault] = useState(pipeline.isDefault);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSave = () => {
    onUpdate({
      ...pipeline,
      name: name.trim() || pipeline.name,
      description: description.trim(),
      isDefault,
    });
  };

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-black text-app-text">Geral</h2>
        <p className="text-xs font-bold text-muted mt-0.5">
          Identidade do pipeline e ações administrativas.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="border border-line/25 bg-panel/30 rounded-xl p-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-app-text">Nome</span>
          <FeatureInput
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Vendas, Captação..."
            value={name}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-app-text">Descrição</span>
          <FeatureTextarea
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva para que serve este pipeline (opcional)"
            value={description}
          />
        </label>

        {/* Toggle Switch for Default Pipeline */}
        <div className="flex items-center justify-between border border-line/20 rounded-xl p-4 bg-panel/10">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-black text-app-text flex items-center gap-1.5">
              <Star className="size-3.5 text-muted" />
              <span>Pipeline padrão</span>
            </span>
            <span className="text-xs font-bold text-muted">
              Este é o pipeline padrão do time. Leads sem regra específica
              entram aqui.
            </span>
          </div>
          <Switch
            aria-label="Definir como pipeline padrão"
            checked={isDefault}
            disabled={pipeline.isDefault}
            onCheckedChange={setIsDefault}
          />
        </div>

        {/* Save button */}
        <div className="flex justify-end mt-2">
          <FeatureActionButton
            icon={Save}
            label="Salvar alterações"
            onClick={handleSave}
            variant="primary"
          >
            Salvar alterações
          </FeatureActionButton>
        </div>
      </div>

      {/* Danger Zone */}
      {!pipeline.isDefault && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-danger">
            <CircleAlert className="size-4 shrink-0" />
            <span>Zona de perigo</span>
          </div>
          <p className="text-xs font-bold text-muted -mt-2">
            Ações irreversíveis. Tenha certeza antes de prosseguir.
          </p>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-danger/20 bg-danger/5 p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-app-text">
                Excluir pipeline
              </span>
              <span className="text-xs font-bold text-muted max-w-xl leading-relaxed">
                Remove o pipeline e todas as suas regras de roteamento e
                configuração de rodízio. Negócios precisam ser movidos antes.
              </span>
            </div>
            <button
              className="inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-danger px-4 text-xs font-bold text-inverse transition-opacity hover:opacity-90"
              onClick={() => setIsDeleteDialogOpen(true)}
              type="button"
            >
              <Trash className="size-3.5" />
              <span>Excluir</span>
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        confirmLabel="Excluir pipeline"
        description={`O pipeline "${pipeline.name}" e suas configurações serão removidos.`}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          onDelete(pipeline.id);
          setIsDeleteDialogOpen(false);
        }}
        title="Excluir pipeline?"
        variant="destructive"
      />
    </div>
  );
}
