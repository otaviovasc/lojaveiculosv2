import { FilePlus2, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { DocumentsDialogShell } from "./DocumentsDialogShell";
import { createCustomDocumentTemplate } from "./documentBuilderModel";
import { kindLabel } from "./documentLabels";
import type { DocumentKind, DocumentTemplate } from "./types";

export function DocumentCreateTemplateModal({
  isOpen,
  onClose,
  onCreate,
  templates,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newTemplate: DocumentTemplate) => void;
  templates: readonly DocumentTemplate[];
}) {
  const [selectedBaseKey, setSelectedBaseKey] = useState<string>("blank");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Vendas");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const baseOptions = useMemo(() => {
    const defaultEditable = templates.filter((t) => t.mode === "editable");
    const options = [
      { label: "📄 Modelo em branco (Personalizado)", value: "blank" },
      ...defaultEditable.map((template) => ({
        label: `📋 Base: ${template.title} (${kindLabel(template.kind)})`,
        value: template.templateKey,
      })),
    ];
    return options;
  }, [templates]);

  if (!isOpen) return null;

  const handleBaseChange = (value: string) => {
    setSelectedBaseKey(value);
    if (value === "blank") {
      if (!title) setTitle("Novo Modelo Personalizado");
    } else {
      const base = templates.find((t) => t.templateKey === value);
      if (base) {
        setTitle(`${base.title} (Personalizado)`);
        setCategory(base.category || "Vendas");
        setDescription(`Criado a partir do modelo padrão ${base.title}`);
      }
    }
  };

  const handleCreate = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Informe o nome do modelo.");
      return;
    }

    const base =
      selectedBaseKey !== "blank"
        ? (templates.find((t) => t.templateKey === selectedBaseKey) ?? null)
        : null;

    const newTemplate = createCustomDocumentTemplate({
      baseTemplate: base,
      category: category.trim() || "Personalizados",
      description:
        description.trim() ||
        (base
          ? `Criado a partir de ${base.title}`
          : "Modelo personalizado da loja"),
      kind: base ? base.kind : ("other" as DocumentKind),
      title: trimmedTitle,
    });

    setError(null);
    onCreate(newTemplate);
    onClose();
  };

  return (
    <DocumentsDialogShell
      backdropClassName="documents-detail-modal-backdrop"
      className="documents-create-template-dialog max-w-lg"
      onClose={onClose}
      title="Criar novo modelo de documento"
    >
      <header className="flex items-center justify-between border-b border-line pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
            <FilePlus2 className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-app-text m-0">
              Novo modelo de documento
            </h2>
            <p className="text-xs font-semibold text-muted m-0">
              Crie um novo contrato, recibo ou termo para a loja
            </p>
          </div>
        </div>
        <button
          aria-label="Fechar"
          className="documents-icon-button"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="grid gap-4">
        <FeatureField
          hint="Escolha um modelo existente como ponto de partida ou crie do zero."
          label="Modelo base"
        >
          <FeatureSelect
            ariaLabel="Modelo base"
            onChange={handleBaseChange}
            options={baseOptions}
            value={selectedBaseKey}
          />
        </FeatureField>

        <FeatureField
          error={error ?? undefined}
          hint="Nome que identificará o modelo nas emissões."
          label="Nome do modelo *"
        >
          <FeatureInput
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Ex.: Contrato de Venda com Entrada Parcelada"
            value={title}
          />
        </FeatureField>

        <FeatureFieldGroup>
          <FeatureField label="Categoria">
            <FeatureInput
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex.: Vendas, Garantia, Estoque"
              value={category}
            />
          </FeatureField>
          <FeatureField label="Observação / Descrição">
            <FeatureInput
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Usado para clientes PJ"
              value={description}
            />
          </FeatureField>
        </FeatureFieldGroup>

        <div className="flex items-center gap-2 rounded-xl border border-line bg-app-elevated/40 p-3 text-xs text-muted">
          <Sparkles className="size-4 text-accent-strong shrink-0" />
          <span>
            Após criar, você poderá adicionar blocos, cláusulas, grids de campos
            e formatar o texto diretamente no editor.
          </span>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2.5 border-t border-line pt-4 mt-5">
        <FeatureActionButton label="Cancelar" onClick={onClose} />
        <FeatureActionButton
          icon={FilePlus2}
          label="Criar modelo"
          onClick={handleCreate}
          variant="primary"
        />
      </footer>
    </DocumentsDialogShell>
  );
}
