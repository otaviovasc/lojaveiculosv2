import { useState } from "react";
import { Trash, Star, Save, CircleAlert } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
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
          <textarea
            className="w-full min-h-24 rounded-lg border border-line bg-app px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-accent"
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
          <button
            type="button"
            onClick={() => !pipeline.isDefault && setIsDefault(!isDefault)}
            disabled={pipeline.isDefault}
            className={
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors " +
              (isDefault ? "bg-blue-600" : "bg-line/45")
            }
          >
            <span
              className={
                "inline-block size-3.5 transform rounded-full bg-white transition-transform " +
                (isDefault ? "translate-x-4.5" : "translate-x-1")
              }
            />
          </button>
        </div>

        {/* Save button */}
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSave}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer shadow-sm transition-colors"
            type="button"
          >
            <Save className="size-3.5" />
            <span>Salvar alterações</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      {!pipeline.isDefault && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-red-500 font-bold text-sm">
            <CircleAlert className="size-4 shrink-0" />
            <span>Zona de perigo</span>
          </div>
          <p className="text-xs font-bold text-muted -mt-2">
            Ações irreversíveis. Tenha certeza antes de prosseguir.
          </p>

          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 flex items-center justify-between gap-4">
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
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 cursor-pointer transition-colors shrink-0"
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
