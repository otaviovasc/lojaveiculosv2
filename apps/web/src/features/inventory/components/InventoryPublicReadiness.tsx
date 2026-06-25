import { ClipboardCheck } from "lucide-react";
import {
  createInventoryUnitsInput,
  isZeroKmInventoryForm,
  type InventoryFormState,
} from "../model/formModel";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import { InventoryBadge, InventoryPanel } from "./InventoryFormParts";

export function getPublicReadinessIssues(
  form: InventoryFormState,
  media: readonly CreateMediaDraft[],
) {
  const issues: string[] = [];

  if (!form.title.trim()) issues.push("Titulo do anuncio");
  if (!form.catalog) issues.push("Catalogo FIPE");
  if (!form.manufactureYear.trim()) issues.push("Ano de fabricacao");
  if (!form.modelYear.trim()) issues.push("Ano modelo");
  if (isZeroKmInventoryForm(form)) {
    if (createInventoryUnitsInput(form).length === 0) issues.push("Cor");
  } else if (!form.colorName) issues.push("Cor");
  if (!form.price.trim()) issues.push("Preco anunciado");
  if (!media.some((item) => item.kind === "photo")) {
    issues.push("Ao menos uma foto publica");
  }

  return issues;
}

export function InventoryPublicReadiness({
  form,
  media,
}: {
  form: InventoryFormState;
  media: readonly CreateMediaDraft[];
}) {
  const issues = getPublicReadinessIssues(form, media);
  const ready = issues.length === 0;

  return (
    <InventoryPanel
      icon={<ClipboardCheck className="size-5" />}
      title="Pronto para publicar"
    >
      <div className="grid gap-3 text-sm font-bold text-muted">
        <div className="flex flex-wrap gap-2">
          <InventoryBadge tone={ready ? "accent" : "warning"}>
            {ready ? "publicavel" : "rascunho recomendado"}
          </InventoryBadge>
          <InventoryBadge tone="blue">{media.length} midias</InventoryBadge>
        </div>

        {ready ? (
          <p>
            O anuncio tem os dados e a capa necessarios para leitura publica.
          </p>
        ) : (
          <div className="rounded-lg border border-line bg-app p-3">
            <strong className="block text-app-text">
              Pendencias antes de publicar
            </strong>
            <p>{issues.join(", ")}</p>
          </div>
        )}
      </div>
    </InventoryPanel>
  );
}
